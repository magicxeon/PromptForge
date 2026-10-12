import { createHash } from 'node:crypto';
import { identitySchema } from './identityMigrations.js';
import { assertLivePostgresTransaction } from '../postgres/database.js';
import { challengePolicy } from '../../config/authPolicy.js';

const deny = (code) => {
  throw Object.assign(new Error('Identity challenge rejected.'), { code });
};
export class PostgresIdentityChallengeRepository {
  constructor({ database, schema = 'public' }) {
    this.database = database;
    this.s = identitySchema(schema);
    this.rateLock = createHash('sha256')
      .update(`identity:admission:v1:${schema}`)
      .digest()
      .readBigInt64BE()
      .toString();
  }
  transaction(work) {
    return this.database.transaction((tx) => work(this.bind(tx), tx));
  }
  bind(tx) {
    assertLivePostgresTransaction(tx);
    const s = this.s,
      rateLock = this.rateLock;
    const one = async (sql, values) => (await tx.query(sql, values)).rows[0];
    let admitted = false;
    return Object.freeze({
      async lockAdmission() {
        await tx.query('SELECT pg_advisory_xact_lock($1::bigint)', [rateLock]);
        admitted = true;
      },
      async admit(buckets, keyVersion, readNow) {
        if (!admitted || typeof readNow !== 'function') deny('IDENTITY_RATE_ADMISSION_REQUIRED');
        const now = readNow();
        await tx.query(
          `DELETE FROM ${s}.identity_rate_buckets WHERE digest IN (SELECT digest FROM ${s}.identity_rate_buckets
          WHERE expires_at<=$1 ORDER BY expires_at,digest LIMIT $2)`,
          [now, challengePolicy.cleanupBatch]
        );
        if (
          await one(
            `SELECT digest FROM ${s}.identity_rate_buckets WHERE key_version<>$1 AND expires_at>$2 LIMIT 1`,
            [keyVersion, now]
          )
        )
          deny('IDENTITY_RATE_ROTATION_PENDING');
        const rows = [];
        for (const bucket of [...buckets].sort((a, b) => a.digest.localeCompare(b.digest))) {
          const row = await one(`SELECT * FROM ${s}.identity_rate_buckets WHERE digest=$1 FOR UPDATE`, [
            bucket.digest,
          ]);
          rows.push({ bucket, row });
        }
        const fresh = readNow();
        const needed = rows.filter(({ row }) => !row).length;
        const total = (await one(`SELECT count(*)::int AS n FROM ${s}.identity_rate_buckets`, [])).n;
        if (total + needed > challengePolicy.maximumRateRows) deny('IDENTITY_RATE_CAPACITY');
        for (const { bucket, row } of rows)
          if (row && row.expires_at > fresh && row.count >= bucket.limit) deny('IDENTITY_RATE_LIMITED');
        for (const { bucket, row } of rows) {
          if (!row || row.expires_at <= fresh)
            await tx.query(
              `INSERT INTO ${s}.identity_rate_buckets(digest,key_version,purpose,count,created_at,expires_at)
            VALUES($1,$2,$3,1,$4,$5) ON CONFLICT(digest) DO UPDATE SET count=1,key_version=EXCLUDED.key_version,purpose=EXCLUDED.purpose,created_at=EXCLUDED.created_at,expires_at=EXCLUDED.expires_at`,
              [bucket.digest, keyVersion, bucket.name, fresh, new Date(fresh.getTime() + bucket.windowMs)]
            );
          else
            await tx.query(`UPDATE ${s}.identity_rate_buckets SET count=count+1 WHERE digest=$1`, [
              bucket.digest,
            ]);
        }
      },
      async lockBinding(binding) {
        const account = binding.accountId
          ? await one(`SELECT * FROM ${s}.identity_accounts WHERE id=$1 FOR UPDATE`, [binding.accountId])
          : null;
        const context = await one(`SELECT * FROM ${s}.identity_contexts WHERE id=$1 FOR UPDATE`, [
          binding.contextId,
        ]);
        return { account, context };
      },
      async readBinding(binding) {
        const account = binding.accountId
          ? await one(`SELECT * FROM ${s}.identity_accounts WHERE id=$1`, [binding.accountId])
          : null;
        const context = await one(`SELECT * FROM ${s}.identity_contexts WHERE id=$1`, [binding.contextId]);
        return { account, context };
      },
      peekIssue: (input) =>
        one(
          `SELECT id FROM ${s}.identity_operations WHERE scope_type=$1 AND scope_id=$2 AND operation='challenge_issue' AND idempotency_key=$3`,
          [input.accountId ? 'account' : 'context', input.accountId ?? input.contextId, input.key]
        ),
      challenge: (id, lock = false) =>
        one(`SELECT * FROM ${s}.identity_challenges WHERE id=$1${lock ? ' FOR UPDATE' : ''}`, [id]),
      challengeByOperation: (id) =>
        one(`SELECT * FROM ${s}.identity_challenges WHERE issue_operation_id=$1`, [id]),
      async lockPendingTargets(targetDigests, purpose, accountId) {
        await tx.query(
          `SELECT id FROM ${s}.identity_challenges WHERE target_digest=ANY($1::text[]) AND purpose=$2 AND account_id IS NOT DISTINCT FROM $3 AND status='pending' ORDER BY id FOR UPDATE`,
          [targetDigests, purpose, accountId ?? null]
        );
      },
      async supersede(targetDigests, purpose, accountId) {
        await tx.query(
          `SELECT id FROM ${s}.identity_challenges WHERE target_digest=ANY($1::text[]) AND purpose=$2 AND account_id IS NOT DISTINCT FROM $3 AND status='pending' ORDER BY id FOR UPDATE`,
          [targetDigests, purpose, accountId ?? null]
        );
        await tx.query(
          `UPDATE ${s}.identity_challenges SET status='superseded' WHERE target_digest=ANY($1::text[]) AND purpose=$2 AND account_id IS NOT DISTINCT FROM $3 AND status='pending'`,
          [targetDigests, purpose, accountId ?? null]
        );
      },
      async insert(i) {
        return one(
          `INSERT INTO ${s}.identity_challenges(id,context_id,account_id,security_version,purpose,target_digest,digest,key_version,
          target_key_version,target_id,issue_operation_id,created_at,expires_at,resend_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
          [
            i.id,
            i.contextId,
            i.accountId ?? null,
            i.securityVersion ?? null,
            i.purpose,
            i.targetDigest,
            i.codeDigest,
            i.keyVersion,
            i.targetKeyVersion,
            i.targetId,
            i.operationId,
            i.now,
            i.expiresAt,
            i.resendAt,
          ]
        );
      },
      async failure(id) {
        await tx.query(
          `UPDATE ${s}.identity_challenges SET attempts=attempts+1,status=CASE WHEN attempts+1>=$2 THEN 'locked' ELSE status END WHERE id=$1`,
          [id, challengePolicy.maximumFailures]
        );
      },
      async consume(id) {
        await tx.query(
          `UPDATE ${s}.identity_challenges SET status='consumed' WHERE id=$1 AND status='pending'`,
          [id]
        );
      },
    });
  }
}
