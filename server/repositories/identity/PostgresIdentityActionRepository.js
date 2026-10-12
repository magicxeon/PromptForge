import { identitySchema } from './identityMigrations.js';
import { assertLivePostgresTransaction } from '../postgres/database.js';
export class PostgresIdentityActionRepository {
  constructor({ database, schema = 'public' }) {
    this.database = database;
    this.s = identitySchema(schema);
  }
  transaction(work) {
    return this.database.transaction((tx) => work(this.bind(tx), tx));
  }
  bind(tx) {
    assertLivePostgresTransaction(tx);
    const s = this.s,
      one = async (sql, args) => (await tx.query(sql, args)).rows[0];
    return Object.freeze({
      metadata: (id, lock = false) =>
        one(`SELECT * FROM ${s}.identity_context_metadata WHERE context_id=$1${lock ? ' FOR UPDATE' : ''}`, [
          id,
        ]),
      sessionDeadlines: (id) =>
        one(`SELECT idle_expires_at,absolute_expires_at FROM ${s}.identity_sessions WHERE id=$1`, [id]),
      password: (id) =>
        one(`SELECT algorithm,version FROM ${s}.identity_password_credentials WHERE account_id=$1`, [id]),
      async requiresMfa(id) {
        return (
          await one(
            `SELECT EXISTS(SELECT 1 FROM ${s}.identity_mfa_factors WHERE account_id=$1 AND confirmed_at IS NOT NULL) OR EXISTS(SELECT 1 FROM ${s}.identity_role_memberships WHERE account_id=$1 AND role IN ('admin','support')) AS required`,
            [id]
          )
        ).required;
      },
      async grant(id, p) {
        const result = await tx.query(
          `UPDATE ${s}.identity_context_metadata SET assurance_proof_ref=$2,assurance_method=$3,assurance_level=$4,assurance_verified_at=$5,assurance_expires_at=$6 WHERE context_id=$1 AND assurance_proof_ref IS NULL RETURNING context_id`,
          [id, p.proofRef, p.method, p.assurance, p.verifiedAt, p.expiresAt]
        );
        if (result.rowCount !== 1) throw new Error('Assurance unavailable.');
      },
      async consume(id, now) {
        const result = await tx.query(
          `UPDATE ${s}.identity_context_metadata SET assurance_consumed_at=$2 WHERE context_id=$1 AND assurance_proof_ref IS NOT NULL AND assurance_consumed_at IS NULL RETURNING context_id`,
          [id, now]
        );
        if (result.rowCount !== 1) throw new Error('Assurance unavailable.');
      },
      operation: (id) =>
        one(
          `SELECT o.*,c.browser_digest,m.browser_id,m.generation,m.action_session_id FROM ${s}.identity_operations o JOIN ${s}.identity_contexts c ON c.id=COALESCE(o.binding_context_id,o.context_id) JOIN ${s}.identity_context_metadata m ON m.context_id=c.id WHERE o.id=$1`,
          [id]
        ),
    });
  }
}
