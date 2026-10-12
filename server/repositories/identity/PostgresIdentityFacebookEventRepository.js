import { identitySchema } from './identityMigrations.js';
import { createHash } from 'node:crypto';
import { assertLivePostgresTransaction } from '../postgres/database.js';
export class PostgresIdentityFacebookEventRepository {
  constructor({ database, schema = 'public' }) { this.database = database; this.s = identitySchema(schema); }
  transaction(work) { return this.database.transaction((tx) => work(this.bind(tx), tx)); }
  bind(tx) {
    assertLivePostgresTransaction(tx);
    const s = this.s, one = async (sql, args) => (await tx.query(sql, args)).rows[0];
    return Object.freeze({
      async lock() { await tx.query('SELECT pg_advisory_xact_lock(713491109)'); },
      async cleanup(now) { await tx.query(`DELETE FROM ${s}.identity_facebook_events WHERE id IN (SELECT id FROM ${s}.identity_facebook_events WHERE expires_at<=$1 ORDER BY expires_at,id LIMIT 1000)`, [now]); },
      receipt: (issuer, kind, fingerprint) => one(`SELECT * FROM ${s}.identity_facebook_events WHERE issuer=$1 AND kind=$2 AND fingerprint=$3`, [issuer, kind, fingerprint]),
      confirmation: (code, issuer) => one(`SELECT expires_at FROM ${s}.identity_facebook_events WHERE confirmation_code=$1 AND issuer=$2 AND kind='deletion_request'`, [code, issuer]),
      capacity: () => one(`SELECT count(*)::int AS count FROM ${s}.identity_facebook_events`, []),
      async insert(i) { await tx.query(`INSERT INTO ${s}.identity_facebook_events(id,issuer,kind,fingerprint,subject_digest,occurred_at,confirmation_code,received_at,expires_at) VALUES($1,$2,$3,$4,$9,$5,$6,$7,$8)`, [i.id, i.issuer, i.kind, i.fingerprint, i.occurredAt, i.confirmationCode, i.now, i.expiresAt, createHash('sha256').update(`${i.issuer}:${i.subject}`).digest('hex')]); },
      owner: (issuer, subject) => one(`SELECT a.* FROM ${s}.identity_accounts a JOIN ${s}.identity_external_bindings e ON e.account_id=a.id WHERE e.provider='facebook' AND e.issuer_scope=$1 AND e.subject=$2`, [issuer, subject]),
      lockAccount: (id) => one(`SELECT * FROM ${s}.identity_accounts WHERE id=$1 FOR UPDATE`, [id]),
      async lockSubject(issuer, subject) { await tx.query('SELECT pg_advisory_xact_lock($1::bigint)', [createHash('sha256').update(`identity:facebook:${issuer}:${s}:${subject}`).digest().readBigInt64BE().toString()]); },
      async revoke(i) {
        await tx.query(`DELETE FROM ${s}.identity_external_bindings WHERE provider='facebook' AND issuer_scope=$1 AND subject=$2 AND account_id=$3`, [i.issuer, i.subject, i.accountId]);
        await tx.query(`UPDATE ${s}.identity_accounts SET security_version=security_version+1 WHERE id=$1 AND security_version=$2`, [i.accountId, i.securityVersion]);
        await tx.query(`UPDATE ${s}.identity_sessions SET revoked_at=COALESCE(revoked_at,$2) WHERE account_id=$1`, [i.accountId, i.now]);
        await tx.query(`UPDATE ${s}.identity_contexts SET status='revoked' WHERE account_id=$1 AND status='pending'`, [i.accountId]);
        await tx.query(`UPDATE ${s}.identity_operation_receipts SET revoked_at=COALESCE(revoked_at,$2) WHERE context_id IN (SELECT id FROM ${s}.identity_contexts WHERE account_id=$1)`, [i.accountId, i.now]);
      },
    });
  }
}
