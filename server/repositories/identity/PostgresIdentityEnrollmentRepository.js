import { createHash } from 'node:crypto';
import { identitySchema } from './identityMigrations.js';
import { assertLivePostgresTransaction } from '../postgres/database.js';
export class PostgresIdentityEnrollmentRepository {
  constructor({ database, schema = 'public' }) {
    this.database = database;
    this.s = identitySchema(schema);
  }
  transaction(work) {
    return this.database.transaction((tx) => work(this.bind(tx), tx));
  }
  bind(tx) {
    assertLivePostgresTransaction(tx);
    const s = this.s;
    const one = async (sql, args) => (await tx.query(sql, args)).rows[0];
    return Object.freeze({
      offer: (id) => one(`SELECT * FROM ${s}.identity_login_offers WHERE context_id=$1`, [id]),
      exchange: (id) =>
        one(`SELECT * FROM ${s}.identity_enrollment_exchanges WHERE target_context_id=$1`, [id]),
      async recordExchange(i) {
        await tx.query(
          `INSERT INTO ${s}.identity_enrollment_exchanges(source_context_id,challenge_id,target_context_id,outcome,expires_at) VALUES($1,$2,$3,$4,$5)`,
          [i.sourceContextId, i.challengeId, i.targetContextId, i.outcome, i.expiresAt]
        );
      },
      async recordExchangeProof(i) {
        await tx.query(
          `INSERT INTO ${s}.identity_enrollment_proofs(context_id,challenge_id,verified_at,expires_at,source_kind) VALUES($1,$2,$3,$4,'login_exchange')`,
          [i.contextId, i.challengeId, i.now, i.expiresAt]
        );
      },
      source: (id) =>
        one(
          `SELECT p.*,c.purpose AS context_purpose,c.account_id AS context_account,c.browser_digest,c.target_binding,c.status AS context_status,c.expires_at AS context_expiry FROM ${s}.identity_challenges p JOIN ${s}.identity_contexts c ON c.id=p.context_id WHERE p.id=$1`,
          [id]
        ),
      async recordProof({ contextId, challengeId, now, expiresAt, socialExchangeId }) {
        await tx.query(
          `INSERT INTO ${s}.identity_enrollment_proofs(context_id,challenge_id,verified_at,expires_at${socialExchangeId ? ',social_exchange_id' : ''}) VALUES($1,$2,$3,$4${socialExchangeId ? ',$5' : ''})`,
          [contextId, challengeId, now, expiresAt, ...(socialExchangeId ? [socialExchangeId] : [])]
        );
      },
      proof: (id) =>
        one(`SELECT * FROM ${s}.identity_enrollment_proofs WHERE context_id=$1 FOR UPDATE`, [id]),
      async lockEmail(email) {
        await tx.query('SELECT pg_advisory_xact_lock($1::bigint)', [
          createHash('sha256').update(`enrollment:${s}:${email}`).digest().readBigInt64BE().toString(),
        ]);
      },
      emailOwner: (email) =>
        one(`SELECT account_id FROM ${s}.identity_email_bindings WHERE canonical_email=$1`, [email]),
      async createAccount(i) {
        await tx.query(
          `INSERT INTO ${s}.identity_accounts(id,status,display_name,created_at,updated_at) VALUES($1,'active',$2,$3,$3)`,
          [i.accountId, i.displayName, i.now]
        );
        await tx.query(
          `INSERT INTO ${s}.identity_email_bindings(id,account_id,canonical_email,delivery_email,verified_at) VALUES($1,$1,$2,$3,$4)`,
          [i.accountId, i.canonicalEmail, i.deliveryEmail, i.now]
        );
        await tx.query(`INSERT INTO ${s}.identity_role_memberships(account_id,role) VALUES($1,'customer')`, [
          i.accountId,
        ]);
        if (i.passwordHash)
          await tx.query(
            `INSERT INTO ${s}.identity_password_credentials(account_id,protected_hash,algorithm,version,changed_at) VALUES($1,$2,'argon2id',1,$3)`,
            [i.accountId, i.passwordHash, i.now]
          );
        await tx.query(
          `INSERT INTO ${s}.identity_legal_acceptances(account_id,terms_version,privacy_version,accepted_at,context_id) VALUES($1,$2,$3,$4,$5)`,
          [i.accountId, i.termsVersion, i.privacyVersion, i.now, i.contextId]
        );
        await tx.query(
          `UPDATE ${s}.identity_enrollment_proofs SET status='activated',result_account_id=$2,activation_transaction=pg_current_xact_id()::text WHERE context_id=$1 AND status='verified'`,
          [i.contextId, i.accountId]
        );
      },
      activation: (id) =>
        one(
          `SELECT p.* FROM ${s}.identity_enrollment_proofs p JOIN ${s}.identity_legal_acceptances l ON l.account_id=p.result_account_id AND l.context_id=p.context_id WHERE p.context_id=$1 AND p.status='activated' AND p.activation_transaction=pg_current_xact_id()::text`,
          [id]
        ),
      async handoff(id) {
        await tx.query(
          `UPDATE ${s}.identity_enrollment_proofs SET status='handoff' WHERE context_id=$1 AND status='verified'`,
          [id]
        );
      },
    });
  }
}
