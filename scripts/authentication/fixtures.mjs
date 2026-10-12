import { randomUUID } from 'node:crypto';
import { readDisposableDatabaseConfig } from '../../server/config/database.js';
import { createPostgresDatabase } from '../../server/repositories/postgres/database.js';

export function createFakeClock(initial = Date.UTC(2026, 0, 1)) {
  if (!Number.isSafeInteger(initial) || initial < 0) throw new TypeError('Invalid fixture time.');
  let now = initial;
  return Object.freeze({ now: () => now, advance(milliseconds) {
    if (!Number.isSafeInteger(milliseconds) || milliseconds < 0 || !Number.isSafeInteger(now + milliseconds)) throw new TypeError('Invalid fixture advance.');
    now += milliseconds;
    return now;
  } });
}

export function createFakeMail() {
  const deliveries = new Map();
  let fail = false;
  return Object.freeze({
    failNext() { fail = true; },
    async send(message) {
      if (!message || typeof message.id !== 'string' || !message.id || typeof message.to !== 'string'
        || !/^[^@\s]+@example\.invalid$/.test(message.to)) throw new Error('Fixture mail accepts example.invalid recipients only.');
      if (fail) { fail = false; throw new Error('Injected fixture mail failure.'); }
      if (!deliveries.has(message.id)) deliveries.set(message.id, structuredClone(message));
      return { id: message.id };
    },
    messages: () => structuredClone([...deliveries.values()]),
  });
}

export function createFakeProvider() {
  const codes = new Map();
  return Object.freeze({
    issue(claims) {
      const code = `fixture_${randomUUID()}`;
      codes.set(code, structuredClone(claims));
      return code;
    },
    async exchange(code) {
      if (!codes.has(code)) throw new Error('Unknown or consumed fixture provider code.');
      const claims = codes.get(code);
      codes.delete(code);
      return structuredClone(claims);
    },
  });
}

// Fixture resources are random schemas only; callers cannot supply paths or a schema.
// The injected factory permits offline lifecycle assertions; production uses the shared pool.
export async function withDisposableAuthDatabase(env, work, options = {}) {
  readDisposableDatabaseConfig(env);
  if (!options || Object.getPrototypeOf(options) !== Object.prototype
    || Object.keys(options).some(key => key !== 'createDatabase')) throw new TypeError('Only an injected database factory is supported; fixture roots and schema overrides are forbidden.');
  const { createDatabase = createPostgresDatabase } = options;
  if (typeof work !== 'function') throw new TypeError('Fixture callback required.');
  const database = createDatabase({ env: {
    DATABASE_URL: env.MPF_TEST_DATABASE_URL, NODE_ENV: 'test', DATABASE_POOL_MAX: '3',
    DATABASE_CONNECT_TIMEOUT_MS: '3000', DATABASE_STATEMENT_TIMEOUT_MS: '5000',
    DATABASE_LOCK_TIMEOUT_MS: '2000', DATABASE_TRANSACTION_IDLE_TIMEOUT_MS: '5000',
  } });
  const schema = `mpf_test_auth_${randomUUID().replaceAll('-', '')}`;
  let created = false;
  try {
    await database.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    return await work(Object.freeze({ database, schema, fixtureId: schema }));
  } finally {
    try { if (created) await database.query(`DROP SCHEMA "${schema}" CASCADE`); }
    finally { await database.close(); }
  }
}
