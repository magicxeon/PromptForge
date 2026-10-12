import { createHash } from 'node:crypto';
import { DatabaseError } from './database.js';

const maxMigrations = 1000;
function failure(code) { return new DatabaseError(code); }

function prepare(migrations, schema) {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schema) || !Array.isArray(migrations) || migrations.length > maxMigrations) throw failure('DATABASE_MIGRATION_REGISTRY_INVALID');
  let previous = '';
  const registry = migrations.map(entry => {
    if (!entry || !/^\d{4}_[a-z][a-z0-9_]{0,89}$/.test(entry.id) || entry.id <= previous
      || typeof entry.sql !== 'string' || !entry.sql.trim() || Buffer.byteLength(entry.sql) > 1048576) throw failure('DATABASE_MIGRATION_REGISTRY_INVALID');
    previous = entry.id;
    return Object.freeze({ id: entry.id, sql: entry.sql,
      checksum: createHash('sha256').update(entry.id).update('\0').update(entry.sql).digest('hex') });
  });
  return { registry, table: `"${schema}"."mpf_schema_migrations"`,
    lock: createHash('sha256').update(`mpf:migrations:${schema}`).digest().readBigInt64BE().toString() };
}

function verifyHistory(rows, registry) {
  if (rows.length > registry.length || rows.length > maxMigrations) throw failure('DATABASE_MIGRATION_HISTORY_INVALID');
  for (let index = 0; index < rows.length; index++) {
    if (rows[index].id !== registry[index].id || rows[index].checksum !== registry[index].checksum) throw failure('DATABASE_MIGRATION_HISTORY_INVALID');
  }
  return { applied: rows.map(row => row.id), pending: registry.slice(rows.length).map(entry => entry.id) };
}

export async function runMigrations(database, migrations, { mode, schema = 'public' } = {}) {
  if (!['status', 'apply'].includes(mode)) throw failure('DATABASE_MIGRATION_MODE_REQUIRED');
  const { registry, table, lock } = prepare(migrations, schema);
  return database.transaction(async tx => {
    if (mode === 'apply') {
      await tx.query('SELECT pg_advisory_xact_lock($1::bigint)', [lock]);
      await tx.query(`CREATE TABLE IF NOT EXISTS ${table} (
        id text PRIMARY KEY CHECK (length(id) <= 95),
        checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);
    } else {
      const exists = await tx.query('SELECT to_regclass($1) AS relation', [table]);
      if (!exists.rows[0].relation) return verifyHistory([], registry);
    }
    const { rows } = await tx.query(`SELECT id, checksum FROM ${table} ORDER BY id COLLATE "C" LIMIT ${maxMigrations + 1}`);
    const status = verifyHistory(rows, registry);
    if (mode === 'status') return status;
    for (const migration of registry.slice(rows.length)) {
      // Trusted, reviewed source registry only; never accept SQL from a request.
      await tx.query(migration.sql);
      await tx.query(`INSERT INTO ${table} (id, checksum) VALUES ($1, $2)`, [migration.id, migration.checksum]);
    }
    return { applied: registry.map(entry => entry.id), pending: [], newlyApplied: status.pending };
  }, { isolation: mode === 'status' ? 'repeatable read' : 'read committed', readOnly: mode === 'status' });
}
