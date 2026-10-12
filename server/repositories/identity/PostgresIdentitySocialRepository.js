import { createHash } from 'node:crypto';
import { identitySchema } from './identityMigrations.js';
import { assertLivePostgresTransaction } from '../postgres/database.js';
export class PostgresIdentitySocialRepository {
  constructor({ database, schema = 'public', provider = 'google', issuer = 'https://accounts.google.com' }) {
    if (!['google', 'facebook'].includes(provider) || typeof issuer !== 'string' || !issuer.length || issuer.length > 512) throw new Error('Social scope required.');
    this.provider = provider;
    this.issuer = issuer;
    this.database = database;
    this.s = identitySchema(schema);
  }
  transaction(work) {
    return this.database.transaction((tx) => work(this.bind(tx), tx));
  }
  bind(tx) {
    assertLivePostgresTransaction(tx);
    const s = this.s, provider = this.provider, issuer = this.issuer,
      one = async (sql, args) => (await tx.query(sql, args)).rows[0];
    return Object.freeze({
      exchange: (id) =>
        one(
          `SELECT e.*,o.idempotency_key,m.original_action_context_id,m.original_session_id,m.target_context_id,m.result_session_id,m.subject,m.issuer,m.issuer_scope,m.email_authoritative,m.next_action,m.verified_at,m.verification_transaction,m.consumed_at,m.return_path,m.protection_key_version FROM ${s}.identity_social_exchanges e JOIN ${s}.identity_operations o ON o.id=e.operation_id JOIN ${s}.identity_social_metadata m ON m.exchange_id=e.id WHERE e.id=$1 AND e.provider=$2 AND m.issuer_scope=$3 AND (m.issuer IS NULL OR m.issuer=$3)`,
          [id, provider, issuer]
        ),
      byContext: (id) =>
        one(
          `SELECT m.exchange_id FROM ${s}.identity_social_metadata m JOIN ${s}.identity_social_exchanges e ON e.id=m.exchange_id WHERE (m.context_id=$1 OR m.target_context_id=$1) AND e.provider=$2 AND m.issuer_scope=$3`,
          [id, provider, issuer]
        ),
      byState: (digests) =>
        one(`SELECT e.id FROM ${s}.identity_social_exchanges e JOIN ${s}.identity_social_metadata m ON m.exchange_id=e.id WHERE e.digest=ANY($1::text[]) AND e.provider=$2 AND m.issuer_scope=$3`, [digests, provider, issuer]),
      bySession: (id) =>
        one(`SELECT m.exchange_id FROM ${s}.identity_social_metadata m JOIN ${s}.identity_social_exchanges e ON e.id=m.exchange_id WHERE m.result_session_id=$1 AND e.provider=$2 AND m.issuer_scope=$3`, [id, provider, issuer]),
      async insert(i) {
        await tx.query(
          `INSERT INTO ${s}.identity_social_exchanges(id,context_id,operation_id,provider,intent,account_id,security_version,digest,key_version,protected_verifier,nonce_digest,created_at,expires_at) VALUES($1,$2,$3,$13,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            i.id,
            i.contextId,
            i.operationId,
            i.intent,
            i.accountId,
            i.securityVersion,
            i.digest,
            i.keyVersion,
            i.protectedVerifier,
            i.nonceDigest,
            i.now,
            i.expiresAt,
            provider,
          ]
        );
        await tx.query(
          `INSERT INTO ${s}.identity_social_metadata(context_id,exchange_id,original_action_context_id,original_session_id,expires_at,return_path,protection_key_version,issuer_scope) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            i.contextId,
            i.id,
            i.originalContextId ?? null,
            i.originalSessionId ?? null,
            i.expiresAt,
            i.returnPath,
            i.protectionKeyVersion,
            issuer,
          ]
        );
      },
      async verified(id, claims, now) {
        await tx.query(
          `UPDATE ${s}.identity_social_metadata m SET subject=$2,issuer=$3,email_authoritative=$4,verified_at=$5,verification_transaction=pg_current_xact_id()::text WHERE exchange_id=$1 AND subject IS NULL AND m.issuer_scope=$6 AND $3=$6 AND EXISTS(SELECT 1 FROM ${s}.identity_social_exchanges e WHERE e.id=m.exchange_id AND e.provider=$7)`,
          [id, claims.subject, claims.issuer, !!claims.email, now, issuer, provider]
        );
      },
      async target(id, target) {
        await tx.query(
          `UPDATE ${s}.identity_social_metadata m SET target_context_id=$2 WHERE exchange_id=$1 AND target_context_id IS NULL AND issuer_scope=$3 AND EXISTS(SELECT 1 FROM ${s}.identity_social_exchanges e WHERE e.id=m.exchange_id AND e.provider=$4)`,
          [id, target, issuer, provider]
        );
      },
      async finish(id, nextAction, sessionId = null) {
        await tx.query(
          `UPDATE ${s}.identity_social_metadata m SET next_action=$2,result_session_id=$3 WHERE exchange_id=$1 AND next_action IS NULL AND issuer_scope=$4 AND EXISTS(SELECT 1 FROM ${s}.identity_social_exchanges e WHERE e.id=m.exchange_id AND e.provider=$5)`,
          [id, nextAction, sessionId, issuer, provider]
        );
      },
      async consume(id, now) {
        return one(
          `UPDATE ${s}.identity_social_metadata m SET consumed_at=$2 WHERE exchange_id=$1 AND consumed_at IS NULL AND verification_transaction=pg_current_xact_id()::text AND issuer_scope=$3 AND EXISTS(SELECT 1 FROM ${s}.identity_social_exchanges e WHERE e.id=m.exchange_id AND e.provider=$4) RETURNING *`,
          [id, now, issuer, provider]
        );
      },
      async lockSubject(subject) {
        await tx.query('SELECT pg_advisory_xact_lock($1::bigint)', [
          createHash('sha256').update(`identity:${provider}:${issuer}:${s}:${subject}`).digest().readBigInt64BE().toString(),
        ]);
      },
      revoked: (subject, createdAt, now) => one(`SELECT id FROM ${s}.identity_facebook_events WHERE issuer=$1 AND subject_digest=$2 AND received_at>=$3 AND expires_at>$4 LIMIT 1`, [issuer, createHash('sha256').update(`${issuer}:${subject}`).digest('hex'), createdAt, now]),
      owner: (subject) =>
        one(
          `SELECT a.*,e.id AS binding_id FROM ${s}.identity_external_bindings e JOIN ${s}.identity_accounts a ON a.id=e.account_id WHERE e.provider=$2 AND e.issuer_scope=$3 AND e.subject=$1`,
          [subject, provider, issuer]
        ),
      email: (id) =>
        one(
          `SELECT canonical_email,delivery_email FROM ${s}.identity_email_bindings WHERE account_id=$1 AND status='active' AND verified_at IS NOT NULL ORDER BY id LIMIT 1`,
          [id]
        ),
      async enrollmentProof(i) {
        await tx.query(
          `INSERT INTO ${s}.identity_enrollment_proofs(context_id,challenge_id,verified_at,expires_at,source_kind,social_exchange_id) SELECT $1,NULL,$2,$3,'social',m.exchange_id FROM ${s}.identity_social_metadata m JOIN ${s}.identity_social_exchanges e ON e.id=m.exchange_id WHERE m.exchange_id=$4 AND m.issuer_scope=$5 AND e.provider=$6`,
          [i.contextId, i.now, i.expiresAt, i.exchangeId, issuer, provider]
        );
      },
      async linkNewAccount(i) {
        await tx.query(
          `INSERT INTO ${s}.identity_external_bindings(id,account_id,provider,issuer_scope,subject,linked_at) SELECT $1,$2,$6,$3,$4,$5 WHERE $3=$7`,
          [i.id, i.accountId, i.issuer, i.subject, i.now, provider, issuer]
        );
      },
      currentTransaction: () => one('SELECT pg_current_xact_id()::text AS id', []),
    });
  }
}
