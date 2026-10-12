import { identitySchema } from './identityMigrations.js';
import { assertLivePostgresTransaction } from '../postgres/database.js';
export class PostgresIdentitySessionRepository {
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
      lookup: (digests) =>
        one(
          `SELECT se.*,a.status AS account_status,a.security_version AS current_version FROM ${s}.identity_sessions se JOIN ${s}.identity_accounts a ON a.id=se.account_id WHERE se.digest=ANY($1::text[])`,
          [digests]
        ),
      account: (id) => one(`SELECT * FROM ${s}.identity_accounts WHERE id=$1 FOR UPDATE`, [id]),
      readAccount: (id) => one(`SELECT * FROM ${s}.identity_accounts WHERE id=$1`, [id]),
      enrollmentAccount: (contextId) =>
        one(
          `SELECT a.*,e.canonical_email FROM ${s}.identity_enrollment_proofs p
        JOIN ${s}.identity_accounts a ON a.id=p.result_account_id
        JOIN ${s}.identity_legal_acceptances l ON l.account_id=a.id AND l.context_id=p.context_id
        JOIN ${s}.identity_email_bindings e ON e.account_id=a.id AND e.verified_at IS NOT NULL AND e.status='active'
        WHERE p.context_id=$1 AND p.status='activated' AND p.activation_transaction=pg_current_xact_id()::text FOR UPDATE OF a`,
          [contextId]
        ),
      async roles(id) {
        return (
          await tx.query(
            `SELECT role FROM ${s}.identity_role_memberships WHERE account_id=$1 ORDER BY role`,
            [id]
          )
        ).rows.map((r) => r.role);
      },
      async requiresMfa(id) {
        return (
          await one(
            `SELECT EXISTS(SELECT 1 FROM ${s}.identity_mfa_factors WHERE account_id=$1 AND confirmed_at IS NOT NULL) AS required`,
            [id]
          )
        ).required;
      },
      async sessions(id, now, version) {
        const rows = (
          await tx.query(
            `SELECT * FROM ${s}.identity_sessions WHERE account_id=$1
          AND revoked_at IS NULL AND security_version=$3 AND idle_expires_at>$2 AND absolute_expires_at>$2
          ORDER BY id FOR UPDATE LIMIT 51`,
            [id, now, version]
          )
        ).rows;
        if (rows.length > 50)
          throw Object.assign(new Error('Session capacity invalid.'), {
            code: 'auth_service_unavailable',
          });
        return rows;
      },
      async list(id, cursor, limit) {
        return (
          await tx.query(
            `SELECT * FROM ${s}.identity_sessions WHERE account_id=$1
        AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::text)) ORDER BY created_at DESC,id DESC LIMIT $4`,
            [id, cursor?.createdAt ?? null, cursor?.id ?? null, limit + 1]
          )
        ).rows;
      },
      notificationTarget: (id) =>
        one(
          `SELECT delivery_email FROM ${s}.identity_email_bindings WHERE account_id=$1 AND status='active' AND verified_at IS NOT NULL ORDER BY id LIMIT 1`,
          [id]
        ),
      async insert(i) {
        await tx.query(
          `INSERT INTO ${s}.identity_sessions(id,account_id,digest,key_version,method,assurance,security_version,created_at,last_active_at,idle_expires_at,absolute_expires_at,
        idle_duration_ms,remembered,device_label,authentication_context_id,proof_digest) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [
            i.id,
            i.accountId,
            i.digest,
            i.keyVersion,
            i.method,
            i.assurance,
            i.securityVersion,
            i.now,
            i.idleExpiresAt,
            i.absoluteExpiresAt,
            i.idleMs,
            i.remembered,
            i.deviceLabel,
            i.contextId,
            i.proofDigest,
          ]
        );
      },
      async revoke(ids, now) {
        if (ids.length)
          await tx.query(
            `UPDATE ${s}.identity_sessions SET revoked_at=COALESCE(revoked_at,$2) WHERE id=ANY($1::text[])`,
            [ids, now]
          );
      },
      async invalidateOwner(id, now) {
        await tx.query(
          `UPDATE ${s}.identity_contexts SET status='revoked' WHERE account_id=$1 AND status='pending'`,
          [id]
        );
        await tx.query(
          `UPDATE ${s}.identity_operation_receipts SET revoked_at=COALESCE(revoked_at,$2) WHERE context_id IN (SELECT id FROM ${s}.identity_contexts WHERE account_id=$1)`,
          [id, now]
        );
      },
      async lockContexts(id) {
        await tx.query(`SELECT id FROM ${s}.identity_contexts WHERE account_id=$1 ORDER BY id FOR UPDATE`, [
          id,
        ]);
      },
      async touch(id, now, expiry) {
        await tx.query(`UPDATE ${s}.identity_sessions SET last_active_at=$2,idle_expires_at=$3 WHERE id=$1`, [
          id,
          now,
          expiry,
        ]);
      },
    });
  }
}
