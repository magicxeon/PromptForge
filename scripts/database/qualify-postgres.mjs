import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { readDisposableDatabaseConfig } from '../../server/config/database.js';
import { createPostgresDatabase } from '../../server/repositories/postgres/database.js';
import { runMigrations } from '../../server/repositories/postgres/migrations.js';

test('explicit disposable PostgreSQL qualification', { timeout: 30000 }, async t => {
  // Validate before constructing a pool. Missing prerequisites are a failed gate, not a skip.
  assert.doesNotThrow(() => readDisposableDatabaseConfig(process.env),
    'Set MPF_TEST_DATABASE_DISPOSABLE=true and MPF_TEST_DATABASE_URL to a literal loopback PostgreSQL URL with credentials and mpf_test_ database name.');
  const db = createPostgresDatabase({ env: { DATABASE_URL: process.env.MPF_TEST_DATABASE_URL, NODE_ENV: 'test' } });
  const schema = `mpf_test_${randomUUID().replaceAll('-', '')}`;
  const table = `"${schema}"."items"`;
  const ledgerTable = `"${schema}"."mpf_schema_migrations"`;
  let created = false;
  try {
    await db.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await db.query(`CREATE TABLE ${table} (id integer PRIMARY KEY, label text NOT NULL)`);
    await t.test('transaction commits, rolls back writes and preserves connection usability', async () => {
      await db.transaction(tx => tx.query(`INSERT INTO ${table} VALUES ($1, $2)`, [1, 'committed']));
      const sentinel = new Error('isolated domain rejection');
      await assert.rejects(db.transaction(async tx => {
        await tx.query(`INSERT INTO ${table} VALUES ($1, $2)`, [2, 'rolled back']);
        throw sentinel;
      }), error => error === sentinel);
      assert.deepEqual((await db.query(`SELECT id FROM ${table} ORDER BY id`)).rows, [{ id: 1 }]);
    });
    await t.test('concurrent duplicate creation has exactly one committed winner', async () => {
      const results = await Promise.allSettled([1, 2].map(index => db.transaction(tx =>
        tx.query(`INSERT INTO ${table} VALUES ($1, $2)`, [3, `concurrent_${index}`]))));
      assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
      const rejected = results.find(result => result.status === 'rejected');
      assert.equal(rejected.reason.sqlState, '23505');
      assert.equal((await db.query(`SELECT count(*)::integer AS count FROM ${table} WHERE id = 3`)).rows[0].count, 1);
    });
    const registry = [
      { id: '0001_create', sql: `CREATE TABLE "${schema}"."migrated" (id integer PRIMARY KEY)` },
      { id: '0002_seed', sql: `INSERT INTO "${schema}"."migrated" VALUES (1)` },
    ];
    await t.test('status does not mutate and concurrent migration runners serialize with one application', async () => {
      assert.deepEqual(await runMigrations(db, registry, { mode: 'status', schema }), { applied: [], pending: registry.map(entry => entry.id) });
      assert.equal((await db.query('SELECT to_regclass($1) AS relation', [ledgerTable])).rows[0].relation, null);
      const results = await Promise.all([1, 2].map(() => runMigrations(db, registry, { mode: 'apply', schema })));
      assert.deepEqual(results.map(result => result.newlyApplied.length).sort(), [0, 2]);
      assert.equal((await db.query(`SELECT count(*)::integer AS count FROM ${ledgerTable}`)).rows[0].count, 2);
      assert.deepEqual((await runMigrations(db, registry, { mode: 'apply', schema })).newlyApplied, []);
    });
    await t.test('real advisory lock blocks migration until lock holder commits', async () => {
      const lock = createHash('sha256').update(`mpf:migrations:${schema}`).digest().readBigInt64BE().toString();
      let unlock;
      let signalLocked;
      const locked = new Promise(resolve => { signalLocked = resolve; });
      const release = new Promise(resolve => { unlock = resolve; });
      const holder = db.transaction(async tx => {
        await tx.query('SELECT pg_advisory_xact_lock($1::bigint)', [lock]);
        signalLocked();
        await release;
      });
      let migration;
      try {
        await Promise.race([locked, holder]);
        let finished = false;
        migration = runMigrations(db, registry, { mode: 'apply', schema }).finally(() => { finished = true; });
        // Observe PostgreSQL's waiting advisory lock rather than relying only on elapsed time.
        let observed = false;
        for (let attempt = 0; attempt < 40; attempt++) {
          const result = await db.query(`SELECT EXISTS (
            SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND NOT granted
            AND database = (SELECT oid FROM pg_database WHERE datname = current_database())
            AND classid = (($1::bigint >> 32) & 4294967295)::oid
            AND objid = ($1::bigint & 4294967295)::oid
          ) AS waiting`, [lock]);
          if (result.rows[0].waiting) { observed = true; break; }
          await delay(25);
        }
        assert.equal(observed, true, 'PostgreSQL must report waiting on this migration advisory lock');
        assert.equal(finished, false);
      } finally {
        unlock();
        await holder;
        if (migration) await migration;
      }
    });
    await t.test('checksum drift, unknown version and non-prefix ledger reject without changes', async () => {
      await assert.rejects(runMigrations(db, [{ ...registry[0], sql: registry[0].sql + '; SELECT 1' }, registry[1]], { mode: 'apply', schema }), { code: 'DATABASE_MIGRATION_HISTORY_INVALID' });
      await db.query(`INSERT INTO ${ledgerTable} (id, checksum) VALUES ($1, $2)`, ['9999_unknown', 'a'.repeat(64)]);
      try { await assert.rejects(runMigrations(db, registry, { mode: 'apply', schema }), { code: 'DATABASE_MIGRATION_HISTORY_INVALID' }); }
      finally { await db.query(`DELETE FROM ${ledgerTable} WHERE id = $1`, ['9999_unknown']); }
      const first = (await db.query(`SELECT id, checksum FROM ${ledgerTable} WHERE id = $1`, [registry[0].id])).rows[0];
      await db.query(`DELETE FROM ${ledgerTable} WHERE id = $1`, [first.id]);
      try { await assert.rejects(runMigrations(db, registry, { mode: 'apply', schema }), { code: 'DATABASE_MIGRATION_HISTORY_INVALID' }); }
      finally { await db.query(`INSERT INTO ${ledgerTable} (id, checksum) VALUES ($1, $2)`, [first.id, first.checksum]); }
      assert.equal((await db.query(`SELECT count(*)::integer AS count FROM "${schema}"."migrated"`)).rows[0].count, 1);
    });
    await t.test('failed migration rolls back all pending DDL and ledger entries atomically', async () => {
      const failing = [...registry,
        { id: '0003_temp', sql: `CREATE TABLE "${schema}"."must_rollback" (id integer)` },
        { id: '0004_fail', sql: 'SELECT 1 / 0' },
      ];
      await assert.rejects(runMigrations(db, failing, { mode: 'apply', schema }), { code: 'DATABASE_OPERATION_FAILED', sqlState: '22012' });
      assert.equal((await db.query('SELECT to_regclass($1) AS relation', [`"${schema}"."must_rollback"`])).rows[0].relation, null);
      assert.equal((await db.query(`SELECT count(*)::integer AS count FROM ${ledgerTable}`)).rows[0].count, 2);
    });
  } finally {
    // Only the random schema successfully created by this invocation is ever removed.
    try { if (created) await db.query(`DROP SCHEMA "${schema}" CASCADE`); }
    finally { await db.close(); }
  }
});
