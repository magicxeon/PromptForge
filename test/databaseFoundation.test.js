import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { readDatabaseConfig, readDisposableDatabaseConfig } from '../server/config/database.js';
import { createPostgresDatabase, assertLivePostgresTransaction } from '../server/repositories/postgres/database.js';
import { runMigrations } from '../server/repositories/postgres/migrations.js';

const env = { DATABASE_URL: 'postgresql://test_user:private_password@127.0.0.1:5433/mpf_test_contract' };
function fixture({ fail, rows = [], exists = true, acquisitionError } = {}) {
  const calls = [];
  let instance;
  class Pool extends EventEmitter {
    constructor(config) { super(); this.config = config; instance = this; }
    async connect() {
      calls.push(['acquire']);
      if (acquisitionError) throw acquisitionError;
      return {
        async query(text, values) {
          calls.push([text, values]);
          const error = fail?.(text);
          if (error) throw error;
          if (text.startsWith('SELECT to_regclass')) return { rows: [{ relation: exists ? 'ledger' : null }] };
          return { rows };
        },
        release(destroy) { calls.push(['release', destroy]); },
      };
    }
    async query(text, values) { calls.push(['pool query', text, values]); return { rows: [] }; }
    async end() { calls.push(['end']); }
  }
  const poolErrors = [];
  const db = createPostgresDatabase({ env, PoolClass: Pool, onPoolError: error => poolErrors.push(error) });
  return { db, calls, instance, poolErrors };
}
const rawError = Object.assign(new Error('private_password private SQL and PII'), { code: '23505', detail: 'secret' });
const codes = calls => calls.map(call => call[0]);
const registry = [{ id: '0001_first', sql: 'CREATE TABLE first (id integer)' }, { id: '0002_next', sql: 'ALTER TABLE first ADD COLUMN name text' }];
const ledger = entry => ({ id: entry.id, checksum: createHash('sha256').update(entry.id).update('\0').update(entry.sql).digest('hex') });

test('transaction provenance accepts only the current live shared handle', async () => {
  const { db } = fixture();
  for (const candidate of [null, {}, db, { query() {} }]) {
    assert.throws(() => assertLivePostgresTransaction(candidate), { code: 'DATABASE_TRANSACTION_CONTEXT_REQUIRED' });
  }
  let escaped;
  let release;
  let ready;
  const started = new Promise(resolve => { ready = resolve; });
  const held = new Promise(resolve => { release = resolve; });
  const work = db.transaction(async tx => {
    escaped = tx;
    assert.equal(assertLivePostgresTransaction(tx), tx);
    ready();
    await held;
    assert.equal(assertLivePostgresTransaction(tx), tx);
  });
  await started;
  assert.throws(() => assertLivePostgresTransaction(escaped), { code: 'DATABASE_TRANSACTION_CONTEXT_REQUIRED' });
  release();
  await work;
  assert.throws(() => assertLivePostgresTransaction(escaped), { code: 'DATABASE_TRANSACTION_CONTEXT_REQUIRED' });
  await db.close();
});

test('two database facades reject nested work and borrowed handles while independent transactions remain valid', async () => {
  const first = fixture();
  const second = fixture();
  try {
    await first.db.transaction(async outer => {
      await assert.rejects(second.db.transaction(() => assert.fail('must not acquire another client')), { code: 'DATABASE_TRANSACTION_CONTEXT_REQUIRED' });
      await assert.rejects(second.db.query('SELECT 1'), { code: 'DATABASE_TRANSACTION_CONTEXT_REQUIRED' });
      assert.equal(assertLivePostgresTransaction(outer), outer);
      assert.deepEqual(second.calls, []);
    });
    const handles = [];
    let arrived = 0;
    let release;
    const both = new Promise(resolve => { release = resolve; });
    await Promise.all([first, second].map((fixture, index) => fixture.db.transaction(async tx => {
      handles[index] = tx;
      if (++arrived === 2) release();
      await both;
      assert.equal(assertLivePostgresTransaction(tx), tx);
      assert.throws(() => assertLivePostgresTransaction(handles[1 - index]), { code: 'DATABASE_TRANSACTION_CONTEXT_REQUIRED' });
    })));
  } finally { await first.db.close(); await second.db.close(); }
});

test('explicit URL required; malformed inputs and insecure remote/production TLS fail without secret text', () => {
  for (const overrides of [{ DATABASE_URL: undefined }, { DATABASE_URL: 'invalid private_password' },
    { DATABASE_URL: 'postgres://u@127.0.0.1/db' }, { DATABASE_URL: 'postgres://u:p@127.0.0.1/' },
    { DATABASE_URL: env.DATABASE_URL + '?sslmode=no-verify' }, { DATABASE_URL: env.DATABASE_URL + '?options=evil' },
    { DATABASE_URL: 'postgres://u:p@remote.example/db', DATABASE_TLS: 'disable' },
    { NODE_ENV: 'production', DATABASE_TLS: 'disable' }, { DATABASE_POOL_MAX: '0' }, { DATABASE_POOL_MAX: '51' },
    { DATABASE_STATEMENT_TIMEOUT_MS: '-1' }, { DATABASE_LOCK_TIMEOUT_MS: 'Infinity' }, { DATABASE_TLS: 'require' }]) {
    assert.throws(() => readDatabaseConfig({ ...env, ...overrides }), error => {
      assert.equal(error.code, 'DATABASE_CONFIG_INVALID');
      assert.doesNotMatch(error.stack, /private_password/);
      return true;
    });
  }
});

test('explicit fields defeat ambient pg credentials/options and preserve verified TLS', () => {
  const keys = { PGHOST: 'evil.example', PGPORT: '1', PGUSER: 'evil', PGPASSWORD: 'ambient', PGDATABASE: 'evil',
    PGSSLMODE: 'no-verify', PGOPTIONS: '-c statement_timeout=0', PGSSLNEGOTIATION: 'direct', PGAPPNAME: 'evil' };
  const before = Object.fromEntries(Object.keys(keys).map(key => [key, process.env[key]]));
  Object.assign(process.env, keys);
  try {
    const config = readDatabaseConfig(env);
    const actual = new pg.Client(config).connectionParameters;
    for (const key of ['host', 'port', 'user', 'password', 'database', 'options', 'ssl', 'sslnegotiation', 'application_name']) assert.equal(actual[key], config[key]);
    assert.equal(config.statement_timeout, 15000);
    assert.equal(readDatabaseConfig({ ...env, NODE_ENV: 'production' }).ssl.rejectUnauthorized, true);
    assert.equal(readDatabaseConfig({ DATABASE_URL: 'postgres://u:p@remote.example/db' }).ssl.rejectUnauthorized, true);
  } finally { for (const key of Object.keys(keys)) before[key] === undefined ? delete process.env[key] : process.env[key] = before[key]; }
});

test('disposable target requires opt-in, literal loopback, separate URL and dedicated database', () => {
  const good = { MPF_TEST_DATABASE_DISPOSABLE: 'true', MPF_TEST_DATABASE_URL: env.DATABASE_URL };
  assert.equal(readDisposableDatabaseConfig(good).database, 'mpf_test_contract');
  for (const bad of [{}, { ...good, MPF_TEST_DATABASE_DISPOSABLE: 'false' },
    { ...good, MPF_TEST_DATABASE_URL: undefined, DATABASE_URL: env.DATABASE_URL },
    { ...good, MPF_TEST_DATABASE_URL: 'postgres://u:p@localhost/mpf_test_a' },
    { ...good, MPF_TEST_DATABASE_URL: 'postgres://u:p@remote.example/mpf_test_a' },
    { ...good, MPF_TEST_DATABASE_URL: 'postgres://u:p@127.0.0.1/production' }]) assert.throws(() => readDisposableDatabaseConfig(bad));
});

test('one acquired client commits once, releases once, rejects escaped context and closes idempotently', async () => {
  const { db, calls } = fixture();
  let escaped;
  assert.equal(await db.transaction(async tx => { escaped = tx; await tx.query('SELECT $1', [7]); return 7; }, { isolation: 'serializable' }), 7);
  assert.deepEqual(codes(calls), ['acquire', 'BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE', 'SELECT $1', 'COMMIT', 'release']);
  assert.equal(calls.at(-1)[1], false);
  await assert.rejects(escaped.query('SELECT 1'), { code: 'DATABASE_TRANSACTION_CLOSED' });
  await Promise.all([db.close(), db.close()]);
  assert.equal(codes(calls).filter(value => value === 'end').length, 1);
  await assert.rejects(db.query('SELECT 1'), { code: 'DATABASE_CLOSED' });
});

test('invalid transaction options and nested or pool queries reject without second acquisition', async () => {
  const { db, calls } = fixture();
  for (const options of [{ isolation: 'bad; DROP TABLE x' }, { readOnly: 'yes' }, { surprise: true }, null, [], new Date(0)]) {
    await assert.rejects(db.transaction(() => {}, options), { code: 'DATABASE_TRANSACTION_OPTIONS_INVALID' });
  }
  assert.equal(calls.length, 0);
  await db.transaction(async () => {
    await assert.rejects(db.transaction(() => {}), { code: 'DATABASE_TRANSACTION_CONTEXT_REQUIRED' });
    await assert.rejects(db.query('SELECT 1'), { code: 'DATABASE_TRANSACTION_CONTEXT_REQUIRED' });
  });
  assert.equal(codes(calls).filter(value => value === 'acquire').length, 1);
});

for (const stage of ['acquire', 'BEGIN', 'WORK', 'COMMIT']) {
  test(`driver failure at ${stage} is sanitized, not retried, and releases acquired client exactly once`, async () => {
    const { db, calls } = fixture({ acquisitionError: stage === 'acquire' ? rawError : undefined,
      fail: text => text.startsWith(stage) ? rawError : undefined });
    await assert.rejects(db.transaction(tx => tx.query('WORK')), error => {
      assert.equal(error.code, 'DATABASE_OPERATION_FAILED');
      assert.equal(error.sqlState, '23505');
      assert.doesNotMatch(JSON.stringify(error) + error.stack, /private_password|private SQL|secret/);
      return true;
    });
    assert.equal(codes(calls).filter(value => value === 'acquire').length, 1);
    assert.equal(codes(calls).filter(value => value === 'release').length, stage === 'acquire' ? 0 : 1);
    if (stage !== 'acquire') assert.equal(calls.at(-1)[1], true);
    assert.equal(codes(calls).filter(value => value === 'ROLLBACK').length, ['WORK', 'COMMIT'].includes(stage) ? 1 : 0);
  });
}

test('domain failure survives failed rollback and swallowed SQL error never commits', async () => {
  const { db, calls } = fixture({ fail: text => text === 'ROLLBACK' ? rawError : undefined });
  const domainError = new Error('domain sentinel');
  await assert.rejects(db.transaction(() => { throw domainError; }), error => error === domainError);
  assert.equal(calls.at(-1)[1], true);
  const broken = fixture({ fail: text => text === 'WORK' ? rawError : undefined });
  await assert.rejects(broken.db.transaction(async tx => { try { await tx.query('WORK'); } catch { /* simulate careless caller */ } }), { code: 'DATABASE_OPERATION_FAILED' });
  assert.equal(codes(broken.calls).includes('COMMIT'), false);
});

test('idle pool errors report only safe metadata', () => {
  const { instance, poolErrors } = fixture();
  instance.emit('error', rawError);
  assert.equal(poolErrors[0].sqlState, '23505');
  assert.doesNotMatch(JSON.stringify(poolErrors), /secret|private/);
});

test('migrations require explicit mode, ordered unique bounded registry and safe schema before acquiring', async () => {
  const { db, calls } = fixture();
  for (const [entries, options] of [[registry, {}], [registry.toReversed(), { mode: 'apply' }],
    [[registry[0], registry[0]], { mode: 'apply' }], [registry, { mode: 'apply', schema: 'public;drop' }],
    [[{ id: '0001_a', sql: 'x'.repeat(1048577) }], { mode: 'apply' }],
    [[{ id: '0001_' + 'a'.repeat(91), sql: 'SELECT 1' }], { mode: 'apply' }]]) await assert.rejects(runMigrations(db, entries, options));
  assert.equal(calls.length, 0);
});

test('migration apply locks before ledger, records checksums after work and replays as no-op', async () => {
  const first = fixture();
  const result = await runMigrations(first.db, registry, { mode: 'apply' });
  assert.deepEqual(result.newlyApplied, registry.map(entry => entry.id));
  assert.match(first.calls[2][0], /pg_advisory_xact_lock/);
  assert.match(first.calls[3][0], /CREATE TABLE IF NOT EXISTS/);
  assert.match(first.calls[4][0], /ORDER BY id COLLATE "C" LIMIT 1001/);
  const inserts = first.calls.filter(call => call[0].startsWith('INSERT INTO'));
  assert.deepEqual(inserts.map(call => call[1]), registry.map(entry => [entry.id, ledger(entry).checksum]));
  const replay = fixture({ rows: registry.map(ledger) });
  assert.deepEqual((await runMigrations(replay.db, registry, { mode: 'apply' })).newlyApplied, []);
  assert.equal(replay.calls.some(call => call[0].startsWith('INSERT')), false);
});

test('unknown, changed, non-prefix and oversized migration histories rollback before SQL', async () => {
  for (const rows of [[{ id: '0000_unknown', checksum: 'a'.repeat(64) }], [{ ...ledger(registry[0]), checksum: 'b'.repeat(64) }],
    [ledger(registry[1])], Array(1001).fill(ledger(registry[0]))]) {
    const { db, calls } = fixture({ rows });
    await assert.rejects(runMigrations(db, registry, { mode: 'apply' }), { code: 'DATABASE_MIGRATION_HISTORY_INVALID' });
    assert.equal(codes(calls).includes(registry[0].sql), false);
    assert.ok(codes(calls).includes('ROLLBACK'));
  }
});

test('status reads are read-only and do not create ledger or take mutation lock', async () => {
  for (const exists of [true, false]) {
    const { db, calls } = fixture({ exists });
    assert.deepEqual(await runMigrations(db, registry, { mode: 'status' }), { applied: [], pending: registry.map(entry => entry.id) });
    assert.match(calls[1][0], /REPEATABLE READ READ ONLY/);
    assert.equal(calls.some(call => /CREATE|INSERT|advisory/.test(call[0])), false);
  }
});

test('migration SQL failure rolls back complete batch and never records failed version', async () => {
  const { db, calls } = fixture({ fail: text => text === registry[1].sql ? rawError : undefined });
  await assert.rejects(runMigrations(db, registry, { mode: 'apply' }), { code: 'DATABASE_OPERATION_FAILED' });
  assert.equal(calls.filter(call => call[0].startsWith('INSERT')).length, 1);
  assert.equal(codes(calls).includes('COMMIT'), false);
  assert.ok(codes(calls).includes('ROLLBACK'));
});
