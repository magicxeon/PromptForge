import { createHash, randomUUID } from 'node:crypto';
import { identitySchema } from './identityMigrations.js';

export class IdentityPersistenceError extends Error {
  constructor(code) { super('Identity persistence operation rejected.'); this.name = 'IdentityPersistenceError'; this.code = code; }
}
const fail = code => { throw new IdentityPersistenceError(code); };
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const accountProjection = row => row ? {
  id: row.id, status: row.status, displayName: row.display_name, securityVersion: row.security_version,
  version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
} : null;

// This adapter is internal to Identity. The caller supplies policy-validated claims,
// never raw social response objects. No connection creation or migrations on import.
export class PostgresIdentityRepository {
  constructor({ database, schema = 'public' }) {
    this.database = database;
    this.schema = identitySchema(schema);
  }

  async findAccount(id) {
    return accountProjection((await this.database.query(`SELECT * FROM ${this.schema}.identity_accounts WHERE id=$1`, [id])).rows[0]);
  }

  async findAccountByEmail(canonicalEmail) {
    return accountProjection((await this.database.query(`SELECT a.* FROM ${this.schema}.identity_accounts a
      JOIN ${this.schema}.identity_email_bindings e ON e.account_id=a.id
      WHERE e.canonical_email=$1 AND e.status='active' AND e.login_enabled`, [canonicalEmail])).rows[0]);
  }

  async findAccountByExternal({ provider, issuerScope, subject }) {
    return accountProjection((await this.database.query(`SELECT a.* FROM ${this.schema}.identity_accounts a
      JOIN ${this.schema}.identity_external_bindings e ON e.account_id=a.id
      WHERE e.provider=$1 AND e.issuer_scope=$2 AND e.subject=$3`, [provider, issuerScope, subject])).rows[0]);
  }

  // All mutations below share one transaction context. Leaked handles fail after
  // commit/rollback through the shared database transaction lifetime guard.
  transaction(work) {
    return this.database.transaction(tx => work(this.bind(tx), tx));
  }

  bind(tx) {
    if (!tx || typeof tx.query !== 'function') fail('IDENTITY_TRANSACTION_REQUIRED');
    const s = this.schema;
    return Object.freeze({
      async createAccount({ id, status, displayName }) {
        return accountProjection((await tx.query(`INSERT INTO ${s}.identity_accounts (id,status,display_name)
          VALUES ($1,$2,$3) RETURNING *`, [id, status, displayName])).rows[0]);
      },
      async findAccount(id) {
        return accountProjection((await tx.query(`SELECT * FROM ${s}.identity_accounts WHERE id=$1`, [id])).rows[0]);
      },
      async lockAccount(id, expectedSecurityVersion) {
        const row = (await tx.query(`SELECT * FROM ${s}.identity_accounts WHERE id=$1 FOR UPDATE`, [id])).rows[0];
        if (!row) fail('IDENTITY_ACCOUNT_NOT_FOUND');
        if (expectedSecurityVersion !== undefined && row.security_version !== expectedSecurityVersion) fail('IDENTITY_SECURITY_VERSION_CONFLICT');
        return accountProjection(row);
      },
      async addEmailBinding({ id, accountId, canonicalEmail, deliveryEmail, verifiedAt, loginEnabled = true, recoveryEnabled = true }) {
        await tx.query(`INSERT INTO ${s}.identity_email_bindings
          (id,account_id,canonical_email,delivery_email,verified_at,login_enabled,recovery_enabled) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, accountId, canonicalEmail, deliveryEmail, verifiedAt, loginEnabled, recoveryEnabled]);
      },
      async addExternalBinding({ id, accountId, provider, issuerScope, subject }) {
        await tx.query(`INSERT INTO ${s}.identity_external_bindings (id,account_id,provider,issuer_scope,subject) VALUES ($1,$2,$3,$4,$5)`,
          [id, accountId, provider, issuerScope, subject]);
      },
      async advanceSecurityVersion({ accountId, expectedSecurityVersion, status }) {
        if (!Number.isSafeInteger(expectedSecurityVersion) || expectedSecurityVersion < 1) fail('IDENTITY_SECURITY_VERSION_REQUIRED');
        const row = (await tx.query(`UPDATE ${s}.identity_accounts SET security_version=security_version+1,
          version=version+1, status=COALESCE($3,status), updated_at=now() WHERE id=$1 AND security_version=$2 RETURNING *`,
        [accountId, expectedSecurityVersion, status ?? null])).rows[0];
        if (!row) fail('IDENTITY_SECURITY_VERSION_CONFLICT');
        await tx.query(`UPDATE ${s}.identity_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE account_id=$1`, [accountId]);
        for (const table of ['identity_contexts', 'identity_challenges', 'identity_pending_bindings']) {
          await tx.query(`UPDATE ${s}.${table} SET status='revoked' WHERE account_id=$1 AND status='pending'`, [accountId]);
        }
        await tx.query(`UPDATE ${s}.identity_social_exchanges SET status='interrupted',claim_expires_at=NULL,
          protected_verifier=NULL,nonce_digest=NULL
          WHERE account_id=$1 AND status IN ('initiated','exchange_claimed')`, [accountId]);
        // Read-only operation receipts deliberately survive forced revocation.
        // Explicit logout invalidation is a separate future session-domain command.
        return accountProjection(row);
      },
    });
  }

  // The future domain supplies a versioned HMAC, never an unhashed request body.
  // Durable replay holds only typed non-secret identifiers and next-action fields.
  async runOperation(input, work) {
    const { scopeType, scopeId, operation, key, fingerprint, keyVersion, expectedSecurityVersion, expiresAt, bindingContextId } = input;
    if (!['account', 'context'].includes(scopeType) || !identifier(scopeId)
      || typeof operation !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(operation)
      || typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(key)
      || typeof fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(fingerprint)
      || !Number.isSafeInteger(keyVersion) || keyVersion < 1
      || !(expiresAt instanceof Date) || !Number.isFinite(expiresAt.getTime())
      || (scopeType === 'account' && (!Number.isSafeInteger(expectedSecurityVersion) || expectedSecurityVersion < 1))
      || (bindingContextId !== undefined && (scopeType !== 'account' || !identifier(bindingContextId)))
      || typeof work !== 'function') fail('IDENTITY_OPERATION_INVALID');
    const s = this.schema;
    const lock = createHash('sha256').update(JSON.stringify([scopeType, scopeId, operation, key])).digest().readBigInt64BE().toString();
    return this.database.transaction(async tx => {
      const bound = this.bind(tx);
      if (scopeType === 'account') await bound.lockAccount(scopeId, expectedSecurityVersion);
      else {
        const context = (await tx.query(`SELECT account_id, status, expires_at > now() AS current FROM ${s}.identity_contexts WHERE id=$1 FOR UPDATE`, [scopeId])).rows[0];
        // Account-bound work must use the account scope/version and lock it first.
        if (!context || context.account_id !== null || context.status !== 'pending' || !context.current) fail('IDENTITY_CONTEXT_UNAVAILABLE');
      }
      if (bindingContextId !== undefined) {
        const context = (await tx.query(`SELECT account_id,security_version,status,expires_at > now() AS current
          FROM ${s}.identity_contexts WHERE id=$1 FOR UPDATE`, [bindingContextId])).rows[0];
        if (!context || context.account_id !== scopeId || context.security_version !== expectedSecurityVersion
          || context.status !== 'pending' || !context.current) fail('IDENTITY_CONTEXT_UNAVAILABLE');
      }
      await tx.query('SELECT pg_advisory_xact_lock($1::bigint)', [lock]);
      const existing = (await tx.query(`SELECT *, expires_at > now() AS current FROM ${s}.identity_operations
        WHERE scope_type=$1 AND scope_id=$2 AND operation=$3 AND idempotency_key=$4 FOR UPDATE`, [scopeType, scopeId, operation, key])).rows[0];
      if (existing) {
        if (existing.fingerprint !== fingerprint || existing.key_version !== keyVersion) fail('IDENTITY_IDEMPOTENCY_CONFLICT');
        if (existing.binding_context_id !== (bindingContextId ?? null)) fail('IDENTITY_IDEMPOTENCY_CONFLICT');
        if (!existing.current) fail('IDENTITY_OPERATION_EXPIRED');
        if (existing.status !== 'succeeded') fail('IDENTITY_OPERATION_NOT_TERMINAL');
        return { replayed: true, operationId: existing.id, result: { nextAction: existing.next_action, accountId: existing.result_account_id } };
      }
      const operationId = randomUUID();
      await tx.query(`INSERT INTO ${s}.identity_operations
        (id,account_id,context_id,scope_type,scope_id,operation,idempotency_key,fingerprint,key_version,security_version,expires_at,binding_context_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [operationId, scopeType === 'account' ? scopeId : null, scopeType === 'context' ? scopeId : null,
        scopeType, scopeId, operation, key, fingerprint, keyVersion, scopeType === 'account' ? expectedSecurityVersion : null, expiresAt, bindingContextId ?? null]);
      const result = await work(bound, { operationId, transaction: tx });
      if (!result || Object.getPrototypeOf(result) !== Object.prototype
        || Object.keys(result).some(key => !['nextAction', 'accountId'].includes(key))
        || typeof result.nextAction !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(result.nextAction)
        || (result.accountId !== undefined && result.accountId !== null && !identifier(result.accountId))) fail('IDENTITY_OPERATION_RESULT_INVALID');
      if (scopeType === 'account' && result.accountId != null && result.accountId !== scopeId) fail('IDENTITY_OPERATION_RESULT_INVALID');
      await tx.query(`UPDATE ${s}.identity_operations SET status='succeeded',next_action=$2,result_account_id=$3 WHERE id=$1`,
        [operationId, result.nextAction, result.accountId ?? null]);
      return { replayed: false, operationId, result: { nextAction: result.nextAction, accountId: result.accountId ?? null } };
    });
  }
}
