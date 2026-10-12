import { createHash } from 'node:crypto';
import { identitySchema } from './identityMigrations.js';
import { assertLivePostgresTransaction } from '../postgres/database.js';
export class PostgresIdentityContextRepository {
  constructor({ database, schema = 'public' }) {
    this.database = database;
    this.s = identitySchema(schema);
    this.admission = createHash('sha256')
      .update(`identity:browsers:${schema}`)
      .digest()
      .readBigInt64BE()
      .toString();
  }
  transaction(work) {
    return this.database.transaction((tx) => work(this.bind(tx), tx));
  }
  bind(tx) {
    assertLivePostgresTransaction(tx);
    const s = this.s;
    const one = async (sql, args) => (await tx.query(sql, args)).rows[0];
    const admission = this.admission;
    return Object.freeze({
      async admit() {
        await tx.query('SELECT pg_advisory_xact_lock($1::bigint)', [admission]);
        return (await one(`SELECT count(*)::int AS n FROM ${s}.identity_browsers`, [])).n < 10000;
      },
      browser: (digests) =>
        one(`SELECT * FROM ${s}.identity_browsers WHERE digest=ANY($1::text[])`, [digests]),
      lockBrowser: (id) => one(`SELECT * FROM ${s}.identity_browsers WHERE id=$1 FOR UPDATE`, [id]),
      account: (id) => one(`SELECT * FROM ${s}.identity_accounts WHERE id=$1 FOR UPDATE`, [id]),
      context: (id) => one(`SELECT * FROM ${s}.identity_contexts WHERE id=$1 FOR UPDATE`, [id]),
      snapshot: (digests) =>
        one(
          `SELECT c.*,m.browser_id,m.generation,m.key_version AS metadata_key_version,m.protected_payload,m.expires_at AS metadata_expiry,
        b.digest AS current_browser_digest,b.key_version AS browser_key_version,b.generation AS current_generation,b.status AS browser_status,b.expires_at AS browser_expiry
        FROM ${s}.identity_contexts c JOIN ${s}.identity_context_metadata m ON m.context_id=c.id
        JOIN ${s}.identity_browsers b ON b.id=m.browser_id WHERE c.digest=ANY($1::text[])`,
          [digests]
        ),
      async insertBrowser(i) {
        await tx.query(
          `INSERT INTO ${s}.identity_browsers(id,digest,key_version,created_at,expires_at) VALUES($1,$2,$3,$4,$5)`,
          [i.id, i.digest, i.keyVersion, i.now, i.expiresAt]
        );
      },
      async countMetadata(id) {
        return (
          await one(`SELECT count(*)::int AS n FROM ${s}.identity_context_metadata WHERE browser_id=$1`, [id])
        ).n;
      },
      async insertContext(i) {
        await tx.query(
          `INSERT INTO ${s}.identity_contexts(id,account_id,purpose,digest,key_version,browser_digest,security_version,target_binding,created_at,expires_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            i.id,
            i.accountId,
            i.purpose,
            i.digest,
            i.keyVersion,
            i.browserDigest,
            i.securityVersion,
            i.targetId,
            i.now,
            i.expiresAt,
          ]
        );
        await tx.query(
          `INSERT INTO ${s}.identity_context_metadata(context_id,browser_id,generation,key_version,protected_payload,expires_at${i.action ? ',action_name,action_target,action_session_id' : ''}) VALUES($1,$2,$3,$4,$5,$6${i.action ? ',$7,$8,$9' : ''})`,
          [
            i.id,
            i.browserId,
            i.generation,
            i.metadataKeyVersion,
            i.protectedPayload,
            i.expiresAt,
            ...(i.action ? [i.action.name, i.action.target, i.action.sessionId] : []),
          ]
        );
      },
      async consume(id) {
        await tx.query(
          `UPDATE ${s}.identity_contexts SET status='consumed' WHERE id=$1 AND status='pending'`,
          [id]
        );
        await tx.query(
          `UPDATE ${s}.identity_context_metadata SET protected_payload=NULL WHERE context_id=$1`,
          [id]
        );
      },
      async rotateBrowser(i) {
        await tx.query(
          `UPDATE ${s}.identity_browsers SET digest=$2,key_version=$3,generation=generation+1,created_at=$4,expires_at=$5 WHERE id=$1`,
          [i.id, i.digest, i.keyVersion, i.now, i.expiresAt]
        );
      },
      async logoutBrowser(id, now) {
        await tx.query(`UPDATE ${s}.identity_browsers SET status='logged_out' WHERE id=$1`, [id]);
        await tx.query(
          `UPDATE ${s}.identity_context_metadata SET protected_payload=NULL WHERE browser_id=$1`,
          [id]
        );
        await tx.query(
          `UPDATE ${s}.identity_operation_receipts SET revoked_at=COALESCE(revoked_at,$2) WHERE context_id IN
          (SELECT context_id FROM ${s}.identity_context_metadata WHERE browser_id=$1)`,
          [id, now]
        );
      },
      async cleanup(now) {
        // No historical account/context locks here. Browser deletion cascades
        // only bounded encrypted metadata, preserving source history.
        const browsers = await tx.query(
          `DELETE FROM ${s}.identity_browsers WHERE id IN
          (SELECT id FROM ${s}.identity_browsers WHERE expires_at<=$1 ORDER BY expires_at,id FOR UPDATE SKIP LOCKED LIMIT 50) RETURNING id`,
          [now]
        );
        const terminal = await tx.query(
          `WITH dead AS (SELECT m.context_id FROM ${s}.identity_context_metadata m JOIN ${s}.identity_contexts c ON c.id=m.context_id
          WHERE m.protected_payload IS NOT NULL AND (c.status<>'pending' OR m.expires_at<=$1) ORDER BY m.context_id FOR UPDATE OF m SKIP LOCKED LIMIT 50)
          UPDATE ${s}.identity_context_metadata m SET protected_payload=NULL FROM dead d WHERE m.context_id=d.context_id RETURNING m.context_id`,
          [now]
        );
        return { browsers: browsers.rowCount, terminal: terminal.rowCount };
      },
    });
  }
}
