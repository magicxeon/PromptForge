import { createHash } from 'node:crypto';
import { identitySchema } from './identityMigrations.js';
import { assertLivePostgresTransaction } from '../postgres/database.js';

const delivery = r => r && ({ id: r.id, operationId: r.operation_id, purpose: r.purpose,
  keyVersion: r.key_version, protectedPayload: r.protected_payload, expiresAt: r.expires_at,
  generation: r.generation, attempts: r.attempts, challengeId: r.challenge_id,createdAt:r.created_at,
  recipientDigest:r.recipient_digest,recipientKeyVersion:r.recipient_key_version,templatePurpose:r.template_purpose,locale:r.locale });
export class PostgresIdentityOperationRepository {
  constructor({ database, schema = 'public' }) { this.database = database; this.s = identitySchema(schema); }
  transaction(work) { return this.database.transaction(tx => work(this.bind(tx), tx)); }
  bind(tx) {
    assertLivePostgresTransaction(tx);
    const s = this.s;
    const one = async (sql, values) => (await tx.query(sql, values)).rows[0];
    return Object.freeze({
      async lockScope(input, now) {
        let account;
        if (input.accountId) account = await one(`SELECT * FROM ${s}.identity_accounts WHERE id=$1 FOR UPDATE`, [input.accountId]);
        const context = await one(`SELECT * FROM ${s}.identity_contexts WHERE id=$1 FOR UPDATE`, [input.contextId]);
        return { account, context, now };
      },
      async lockKey(input) {
        const key = createHash('sha256').update(JSON.stringify([input.accountId ?? input.contextId, input.action, input.key])).digest().readBigInt64BE().toString();
        await tx.query('SELECT pg_advisory_xact_lock($1::bigint)', [key]);
      },
      findByKey: input => one(`SELECT * FROM ${s}.identity_operations WHERE scope_type=$1 AND scope_id=$2 AND operation=$3 AND idempotency_key=$4 FOR UPDATE`,
        [input.accountId ? 'account' : 'context', input.accountId ?? input.contextId, input.action, input.key]),
      operation: id => one(`SELECT * FROM ${s}.identity_operations WHERE id=$1 FOR UPDATE`, [id]),
      async insertOperation(i) {
        return one(`INSERT INTO ${s}.identity_operations(id,account_id,context_id,binding_context_id,scope_type,scope_id,operation,idempotency_key,fingerprint,key_version,security_version,created_at,expires_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, [i.id,i.accountId??null,i.accountId?null:i.contextId,i.accountId?i.contextId:null,
          i.accountId?'account':'context',i.accountId??i.contextId,i.action,i.key,i.fingerprint,i.keyVersion,i.accountId?i.securityVersion:null,i.now,i.expiresAt]);
      },
      async issueReceipt(i) {
        await tx.query(`UPDATE ${s}.identity_operation_receipts SET revoked_at=$2 WHERE operation_id=$1 AND revoked_at IS NULL`, [i.operationId,i.now]);
        await tx.query(`INSERT INTO ${s}.identity_operation_receipts(id,operation_id,context_id,digest,key_version,browser_digest,created_at,expires_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [i.id,i.operationId,i.contextId,i.digest,i.keyVersion,i.browserDigest,i.now,i.expiresAt]);
        await tx.query(`UPDATE ${s}.identity_operations SET receipt_issuances=receipt_issuances+1 WHERE id=$1`, [i.operationId]);
      },
      receipt: id => one(`SELECT r.*,o.status,o.next_action,o.expires_at AS operation_expires_at FROM ${s}.identity_operation_receipts r
        JOIN ${s}.identity_operations o ON o.id=r.operation_id WHERE r.operation_id=$1 AND r.revoked_at IS NULL`, [id]),
      async revokeReceipts(contextId, now) { await tx.query(`UPDATE ${s}.identity_operation_receipts SET revoked_at=$2 WHERE context_id=$1 AND revoked_at IS NULL`, [contextId,now]); },
      async consumeContext(id) { await tx.query(`UPDATE ${s}.identity_contexts SET status='consumed' WHERE id=$1 AND status='pending'`, [id]); },
      async finish(id, result) { await tx.query(`UPDATE ${s}.identity_operations SET status='succeeded',next_action=$2,result_account_id=$3 WHERE id=$1 AND status='pending'`, [id,result.nextAction,result.accountId??null]); },
      async interruptOperation(id) { await tx.query(`UPDATE ${s}.identity_operations SET status='failed',next_action='fresh_sign_in_required' WHERE id=$1 AND status='pending'`,[id]); },
      async deliveryTemplatePurpose(id) { return (await one(`SELECT purpose FROM ${s}.identity_challenges WHERE id=$1`,[id]))?.purpose; },
      async requireRecipientKeys(versions,readNow) {
        const row=await one(`SELECT EXISTS(SELECT 1 FROM ${s}.identity_notification_outbox d,
          jsonb_array_elements(d.recipient_aliases) a WHERE d.callback_expires_at>$1 AND NOT((a->>'version')::int=ANY($2::int[])))
          OR EXISTS(SELECT 1 FROM ${s}.identity_email_suppression_aliases a JOIN ${s}.identity_email_suppressions g ON g.recipient_digest=a.group_digest
          WHERE g.expires_at>$1 AND NOT(a.key_version=ANY($2::int[]))) AS missing`,[readNow(),versions]);
        if(row.missing)throw Object.assign(new Error('Identity delivery unavailable.'),{code:'IDENTITY_DELIVERY_UNAVAILABLE'});
      },
      async enqueue(i) { await tx.query(`INSERT INTO ${s}.identity_notification_outbox(id,operation_id,delivery_key,purpose,protected_payload,key_version,challenge_id,created_at,available_at,expires_at,
        recipient_digest,recipient_key_version,template_purpose,locale,callback_expires_at,recipient_aliases)
        VALUES($1,$2,$1,$3,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,$13,$14)`, [i.id,i.operationId,i.purpose,i.protectedPayload,i.keyVersion,i.challengeId??null,i.now,i.expiresAt,
          i.recipientDigest,i.recipientKeyVersion,i.templatePurpose,i.locale,i.callbackExpiresAt,JSON.stringify(i.recipientAliases)]); },
      async claim(now) {
        const row = await one(`SELECT * FROM ${s}.identity_notification_outbox WHERE
          (status='pending' AND available_at<=$1 OR status='leased' AND lease_expires_at<=$1)
          AND expires_at >= $1::timestamptz+interval '1 second' AND attempts<4 ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1`, [now]);
        if (!row) return null;
        return delivery(await one(`UPDATE ${s}.identity_notification_outbox SET status='leased', attempts=attempts+1,generation=generation+1,
          lease_expires_at=LEAST(expires_at,$2::timestamptz+interval '15 seconds') WHERE id=$1 RETURNING *`, [row.id,now]));
      },
      async eligible(item, recipientCandidates) {
        // Acquire the row lock in a separate statement. A SELECT that waits for
        // this lock must not reuse its pre-wait snapshot for suppression or proof.
        await one(`SELECT id FROM ${s}.identity_notification_outbox WHERE id=$1 FOR UPDATE`, [item.id]);
        const suppressionColumns = recipientCandidates ? `
          (SELECT max(g.expires_at) FROM ${s}.identity_email_suppressions g
            JOIN ${s}.identity_email_suppression_aliases a ON a.group_digest=g.recipient_digest
            WHERE a.recipient_digest=ANY($3::text[])) AS suppression_expiry,
          (SELECT max(expires_at) FROM (
            SELECT g.expires_at FROM ${s}.identity_email_suppressions g
              JOIN ${s}.identity_email_suppression_aliases a ON a.group_digest=g.recipient_digest
              WHERE NOT(a.key_version=ANY($2::int[]))
            UNION ALL SELECT m.callback_expires_at FROM ${s}.identity_notification_outbox m,
              jsonb_array_elements(m.recipient_aliases) a WHERE NOT((a->>'version')::int=ANY($2::int[]))
          ) missing_keys) AS missing_key_expiry,` : '';
        const values = recipientCandidates
          ? [item.id, recipientCandidates.map(c=>c.version), recipientCandidates.map(c=>c.digest)]
          : [item.id];
        const r = await one(`SELECT ${suppressionColumns} d.*,o.status AS operation_status,c.status AS challenge_status,c.delivery_status AS challenge_delivery,c.expires_at AS challenge_expiry,
          x.status AS context_status,x.expires_at AS context_expiry,a.status AS account_status,a.security_version AS current_version,c.security_version AS proof_version
          FROM ${s}.identity_notification_outbox d JOIN ${s}.identity_operations o ON o.id=d.operation_id
          LEFT JOIN ${s}.identity_challenges c ON c.id=d.challenge_id LEFT JOIN ${s}.identity_contexts x ON x.id=c.context_id
          LEFT JOIN ${s}.identity_accounts a ON a.id=c.account_id WHERE d.id=$1`, values);
        if (!r || r.status!=='leased' || r.generation!==item.generation || r.operation_status!=='succeeded'
          || r.challenge_id && (r.challenge_status!=='pending' || r.challenge_delivery!=='pending'
            || r.context_status!=='pending' || r.account_status && (r.account_status!=='active' || r.current_version!==r.proof_version))) return null;
        // Return only the bounded authority deadlines from the locked read. The
        // caller must compare them with a fresh clock after this awaited query;
        // a timestamp captured before waiting for the row lock is not authority.
        return Object.freeze({ id:r.id,generation:r.generation,deliveryExpiresAt:r.expires_at,leaseExpiresAt:r.lease_expires_at,
          challengeExpiresAt:r.challenge_id?r.challenge_expiry:null,contextExpiresAt:r.challenge_id?r.context_expiry:null,
          ...(recipientCandidates?{suppressionExpiresAt:r.suppression_expiry,missingKeyExpiresAt:r.missing_key_expiry}:{}) });
      },
      async acknowledge(item, outcome, readNow) {
        if (typeof readNow !== 'function') throw new Error('Identity acknowledgement clock required.');
        const current = await one(`SELECT status,generation,lease_expires_at FROM ${s}.identity_notification_outbox WHERE id=$1 FOR UPDATE`, [item.id]);
        // Resolve time only after any lock wait. The row remains locked through
        // the conditional mutation, preserving the claimant's generation fence.
        const now = readNow();
        if (!(now instanceof Date) || !Number.isFinite(+now) || !current || current.status!=='leased'
          || current.generation!==item.generation || current.lease_expires_at<=now) return false;
        const retry = outcome==='retry' && item.attempts<4;
        const delay = 2 ** (item.attempts-1);
        const row=await one(`UPDATE ${s}.identity_notification_outbox SET
          status=CASE WHEN $4 AND expires_at>$3::timestamptz+($5+1)*interval '1 second' THEN 'pending' ELSE $6 END,
          protected_payload=CASE WHEN $4 AND expires_at>$3::timestamptz+($5+1)*interval '1 second' THEN protected_payload ELSE NULL END,
          available_at=LEAST(expires_at,$3::timestamptz+$5*interval '1 second'),lease_expires_at=NULL
          WHERE id=$1 AND generation=$2 AND status='leased' AND lease_expires_at>$3 RETURNING id,status,challenge_id`,
        [item.id,item.generation,now,retry,delay,outcome==='sent'?'sent':outcome==='expired'?'expired':'failed']);
        if (row?.challenge_id && row.status!=='pending') await tx.query(`UPDATE ${s}.identity_challenges SET delivery_status=$2 WHERE id=$1 AND delivery_status='pending'`,[row.challenge_id,row.status==='sent'?'sent':'failed']);
        return !!row;
      },
      async cleanup(now) {
        const rows = (await tx.query(`WITH expired AS (SELECT id FROM ${s}.identity_notification_outbox
          WHERE status IN ('pending','leased') AND (expires_at<$1::timestamptz+interval '1 second' OR attempts>=4 AND (status='pending' OR lease_expires_at<=$1))
          ORDER BY expires_at,id FOR UPDATE SKIP LOCKED LIMIT 50)
          UPDATE ${s}.identity_notification_outbox d SET status='expired',protected_payload=NULL,lease_expires_at=NULL FROM expired e WHERE d.id=e.id RETURNING d.id`, [now])).rows;
        return rows.length;
      },
      social: id => one(`SELECT * FROM ${s}.identity_social_exchanges WHERE id=$1 FOR UPDATE`, [id]),
      socialForOperation: id => one(`SELECT * FROM ${s}.identity_social_exchanges WHERE operation_id=$1 FOR UPDATE`, [id]),
      async expiredSocialCandidates(now) {
        return (await tx.query(`SELECT e.id,e.account_id,e.context_id,e.operation_id
          FROM ${s}.identity_social_exchanges e
          JOIN ${s}.identity_operations o ON o.id=e.operation_id
          JOIN ${s}.identity_contexts c ON c.id=e.context_id
          WHERE e.status IN ('initiated','exchange_claimed')
            AND (e.expires_at<=$1 OR o.expires_at<=$1 OR c.expires_at<=$1
              OR e.status='exchange_claimed' AND e.claim_expires_at<=$1)
          ORDER BY e.account_id NULLS FIRST,e.context_id,e.operation_id,e.id LIMIT 50`, [now])).rows;
      },
      async claimSocial(id, now) { return one(`UPDATE ${s}.identity_social_exchanges SET status='exchange_claimed',claim_expires_at=LEAST(expires_at,$2::timestamptz+interval '15 seconds') WHERE id=$1 AND status='initiated' RETURNING *`, [id,now]); },
      async finishSocial(id, status) { await tx.query(`UPDATE ${s}.identity_social_exchanges SET status=$2,claim_expires_at=NULL,protected_verifier=NULL,nonce_digest=NULL WHERE id=$1`, [id,status]); },
    });
  }
}
