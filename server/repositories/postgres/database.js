import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readDatabaseConfig } from '../../config/database.js';

export class DatabaseError extends Error {
  constructor(code = 'DATABASE_OPERATION_FAILED', sqlState) {
    super('Database operation failed.');
    this.name = 'DatabaseError';
    this.code = code;
    if (typeof sqlState === 'string' && /^[0-9A-Z]{5}$/.test(sqlState)) this.sqlState = sqlState;
  }
}

const clean = error => error instanceof DatabaseError ? error : new DatabaseError('DATABASE_OPERATION_FAILED', error?.code);
const liveTransactions = new WeakMap();
// One scope across facades prevents composing two independent commits as if they
// were the same transaction. Concurrent request scopes remain independent.
const transactionScope = new AsyncLocalStorage();

// A method-shaped object is not proof of a transaction. Also reject a live
// handle borrowed from another concurrent asynchronous transaction context.
export function assertLivePostgresTransaction(transaction) {
  const state = transaction && liveTransactions.get(transaction);
  if (!state || !state.active() || state.scope.getStore() !== transaction) {
    throw new DatabaseError('DATABASE_TRANSACTION_CONTEXT_REQUIRED');
  }
  return transaction;
}

export function createPostgresDatabase({ env = process.env, PoolClass = pg.Pool, onPoolError = () => {} } = {}) {
  const pool = new PoolClass(readDatabaseConfig(env));
  let closePromise;
  pool.on('error', error => {
    // Only a sanitized error is exposed; no driver text, SQL, parameters or credentials.
    try { onPoolError(clean(error)); } catch { /* telemetry cannot crash the pool */ }
  });
  function available() {
    if (closePromise) throw new DatabaseError('DATABASE_CLOSED');
    if (transactionScope.getStore()) throw new DatabaseError('DATABASE_TRANSACTION_CONTEXT_REQUIRED');
  }
  async function transaction(work, options = {}) {
    available();
    if (typeof work !== 'function' || !options || typeof options !== 'object'
      || ![Object.prototype, null].includes(Object.getPrototypeOf(options))
      || Object.keys(options).some(key => !['isolation', 'readOnly'].includes(key))
      || (options.readOnly !== undefined && typeof options.readOnly !== 'boolean')) throw new DatabaseError('DATABASE_TRANSACTION_OPTIONS_INVALID');
    const isolation = options.isolation ?? 'read committed';
    if (!['read committed', 'repeatable read', 'serializable'].includes(isolation)) throw new DatabaseError('DATABASE_TRANSACTION_OPTIONS_INVALID');
    let client;
    try { client = await pool.connect(); } catch (error) { throw clean(error); }
    let begun = false;
    let destroy = false;
    let active = true;
    let queryFailure;
    const query = async (text, values) => {
      if (!active) throw new DatabaseError('DATABASE_TRANSACTION_CLOSED');
      try { return await client.query(text, values); } catch (error) { destroy = true; queryFailure = clean(error); throw queryFailure; }
    };
    const handle = Object.freeze({ query });
    liveTransactions.set(handle, { active: () => active, scope: transactionScope });
    try {
      await query(`BEGIN ISOLATION LEVEL ${isolation.toUpperCase()} ${options.readOnly ? 'READ ONLY' : 'READ WRITE'}`);
      begun = true;
      const result = await transactionScope.run(handle, () => work(handle));
      if (queryFailure) throw queryFailure;
      active = false;
      // COMMIT failures have unknown outcomes. Destroy the client; never retry work.
      try { await client.query('COMMIT'); } catch (error) { destroy = true; throw clean(error); }
      return result;
    } catch (error) {
      active = false;
      destroy = true;
      if (begun) {
        try { await client.query('ROLLBACK'); } catch { /* preserve original failure */ }
      }
      throw error;
    } finally { active = false; liveTransactions.delete(handle); client.release(destroy); }
  }
  return Object.freeze({
    async query(text, values) {
      available();
      try { return await pool.query(text, values); } catch (error) { throw clean(error); }
    },
    transaction,
    close() {
      if (!closePromise) closePromise = Promise.resolve().then(() => pool.end()).catch(error => { throw clean(error); });
      return closePromise;
    },
  });
}
