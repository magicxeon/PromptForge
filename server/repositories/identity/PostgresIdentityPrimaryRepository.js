import { identitySchema } from './identityMigrations.js';
import { assertLivePostgresTransaction } from '../postgres/database.js';
export class PostgresIdentityPrimaryRepository {
  constructor({ database, schema = 'public' }) {
    this.database = database;
    this.s = identitySchema(schema);
  }
  transaction(work) {
    return this.database.transaction((tx) => work(this.bind(tx), tx));
  }
  async credential(email) {
    return this.transaction((r) => r.credential(email));
  }
  bind(tx) {
    assertLivePostgresTransaction(tx);
    const s = this.s,
      one = async (sql, args) => (await tx.query(sql, args)).rows[0];
    return Object.freeze({
      async recordOffer(contextId, challengeId, expiresAt) {
        await tx.query(
          `INSERT INTO ${s}.identity_login_offers(context_id,challenge_id,expires_at) VALUES($1,$2,$3)`,
          [contextId, challengeId, expiresAt]
        );
      },
      otpSource: (id) =>
        one(
          `SELECT p.*,c.browser_digest,c.target_binding FROM ${s}.identity_challenges p JOIN ${s}.identity_contexts c ON c.id=p.context_id WHERE p.id=$1`,
          [id]
        ),
      async insertOtpProof(i) {
        await tx.query(
          `INSERT INTO ${s}.identity_otp_primary_proofs(context_id,proof_ref,challenge_id,account_id,security_version,expires_at,transaction_id) VALUES($1,$2,$3,$4,$5,$6,pg_current_xact_id()::text)`,
          [i.contextId, i.proofRef, i.challengeId, i.accountId, i.securityVersion, i.expiresAt]
        );
      },
      otpProof: (contextId, proofRef) =>
        one(
          `SELECT * FROM ${s}.identity_otp_primary_proofs WHERE context_id=$1 AND proof_ref=$2 AND transaction_id=pg_current_xact_id()::text FOR UPDATE`,
          [contextId, proofRef]
        ),
      async consumeOtp(id, now) {
        const result = await tx.query(
          `UPDATE ${s}.identity_otp_primary_proofs SET consumed_at=$2 WHERE context_id=$1 AND consumed_at IS NULL AND transaction_id=pg_current_xact_id()::text RETURNING context_id`,
          [id, now]
        );
        if (result.rowCount !== 1) throw new Error('OTP proof unavailable.');
      },
      credential: (email) =>
        one(
          `SELECT a.id,a.status,a.security_version,e.canonical_email,e.delivery_email,e.verified_at,e.login_enabled,e.status AS email_status,p.protected_hash,p.algorithm,p.version AS password_version FROM ${s}.identity_email_bindings e JOIN ${s}.identity_accounts a ON a.id=e.account_id LEFT JOIN ${s}.identity_password_credentials p ON p.account_id=a.id WHERE e.canonical_email=$1`,
          [email]
        ),
      async insertProof(i) {
        await tx.query(
          `INSERT INTO ${s}.identity_primary_proofs(context_id,proof_ref,account_id,security_version,method,credential_digest,key_version,verified_at,expires_at,transaction_id) VALUES($1,$2,$3,$4,'password',$5,$6,$7,$8,pg_current_xact_id()::text)`,
          [
            i.contextId,
            i.proofRef,
            i.accountId,
            i.securityVersion,
            i.credentialDigest,
            i.keyVersion,
            i.now,
            i.expiresAt,
          ]
        );
      },
      proof: (contextId, proofRef) =>
        one(
          `SELECT * FROM ${s}.identity_primary_proofs WHERE context_id=$1 AND proof_ref=$2 AND transaction_id=pg_current_xact_id()::text FOR UPDATE`,
          [contextId, proofRef]
        ),
      async consume(contextId, now) {
        const result = await tx.query(
          `UPDATE ${s}.identity_primary_proofs SET consumed_at=$2 WHERE context_id=$1 AND consumed_at IS NULL AND transaction_id=pg_current_xact_id()::text RETURNING context_id`,
          [contextId, now]
        );
        if (result.rowCount !== 1) throw new Error('Primary proof unavailable.');
      },
    });
  }
}
