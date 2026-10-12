import { createHash } from 'node:crypto';
import { identitySchema } from './identityMigrations.js';
import { assertLivePostgresTransaction } from '../postgres/database.js';

const fail = (code) => {
  throw Object.assign(new Error('Identity email event rejected.'), { code });
};
export class PostgresIdentityEmailEventRepository {
  constructor({ database, schema = 'public' }) {
    this.database = database;
    this.s = identitySchema(schema);
    this.lock = createHash('sha256')
      .update(`identity:email-events:v1:${schema}`)
      .digest()
      .readBigInt64BE()
      .toString();
  }
  transaction(work) {
    return this.database.transaction((tx) => work(this.bind(tx), tx));
  }
  async isSuppressed(candidates, readNow) {
    const now = readNow();
    const result = await this.database.query(
      `SELECT max(expires_at) AS expires_at FROM (
      SELECT g.expires_at FROM ${this.s}.identity_email_suppressions g JOIN ${this.s}.identity_email_suppression_aliases a ON a.group_digest=g.recipient_digest
      WHERE g.expires_at>$1 AND (NOT(a.key_version=ANY($2::int[])) OR a.recipient_digest=ANY($3::text[]))
      UNION ALL SELECT d.callback_expires_at FROM ${this.s}.identity_notification_outbox d,jsonb_array_elements(d.recipient_aliases) a
      WHERE d.callback_expires_at>$1 AND NOT((a->>'version')::int=ANY($2::int[]))) deadlines`,
      [now, candidates.map((c) => c.version), candidates.map((c) => c.digest)]
    );
    // A missing historical key deliberately denies all sending until that live
    // suppression expires; rotation never creates a fresh unsuppressed identity.
    return result.rows[0]?.expires_at > readNow();
  }
  bind(tx) {
    assertLivePostgresTransaction(tx);
    const s = this.s,
      lock = this.lock;
    const one = async (sql, values) => (await tx.query(sql, values)).rows[0];
    let admitted = false;
    return Object.freeze({
      async lockAdmission() {
        await tx.query('SELECT pg_advisory_xact_lock($1::bigint)', [lock]);
        admitted = true;
      },
      event: (scope, id) =>
        one(`SELECT * FROM ${s}.identity_email_events WHERE provider_scope=$1 AND event_id=$2`, [scope, id]),
      delivery: (id) => one(`SELECT * FROM ${s}.identity_notification_outbox WHERE id=$1 FOR UPDATE`, [id]),
      async record(event, delivery, readNow) {
        if (!admitted) fail('IDENTITY_EMAIL_EVENT_REJECTED');
        const now = readNow();
        const eventCount = (await one(`SELECT count(*)::int AS n FROM ${s}.identity_email_events`, [])).n;
        if (eventCount >= 10000) fail('IDENTITY_EMAIL_EVENT_CAPACITY');
        if (event.type !== 'delivered') {
          const aliases = delivery.recipient_aliases;
          const matches = (
            await tx.query(
              `SELECT DISTINCT g.* FROM ${s}.identity_email_suppressions g
            JOIN ${s}.identity_email_suppression_aliases a ON a.group_digest=g.recipient_digest
            WHERE a.recipient_digest=ANY($1::text[])`,
              [aliases.map((a) => a.digest)]
            )
          ).rows;
          if (matches.length > 1) fail('IDENTITY_EMAIL_EVENT_REJECTED');
          const prior = matches[0];
          if (prior && prior.expires_at <= readNow()) fail('IDENTITY_EMAIL_EVENT_REJECTED');
          if (!prior) {
            const count = (await one(`SELECT count(*)::int AS n FROM ${s}.identity_email_suppressions`, []))
              .n;
            if (count >= 10000) fail('IDENTITY_EMAIL_EVENT_CAPACITY');
          }
          // Expired suppression is not silently renewed. Explicit bounded cleanup
          // must remove it before a later independent event can start a new window.
          if (!prior)
            await tx.query(
              `INSERT INTO ${s}.identity_email_suppressions(recipient_digest,key_version,created_at,expires_at) VALUES($1,$2,$3,$4)`,
              [delivery.recipient_digest, delivery.recipient_key_version, now, new Date(+now + 86400000)]
            );
          const groupDigest = prior?.recipient_digest ?? delivery.recipient_digest;
          const existing = (
            await tx.query(`SELECT * FROM ${s}.identity_email_suppression_aliases WHERE group_digest=$1`, [
              groupDigest,
            ])
          ).rows;
          const additions = aliases.filter(
            (a) => !existing.some((e) => e.recipient_digest === a.digest && e.key_version === a.version)
          );
          if (existing.length + additions.length > 8) fail('IDENTITY_EMAIL_EVENT_CAPACITY');
          for (const a of additions)
            await tx.query(
              `INSERT INTO ${s}.identity_email_suppression_aliases(recipient_digest,key_version,group_digest) VALUES($1,$2,$3)`,
              [a.digest, a.version, groupDigest]
            );
          if (delivery.challenge_id)
            await tx.query(
              `UPDATE ${s}.identity_challenges SET delivery_status='failed'
            WHERE id=$1 AND status='pending'`,
              [delivery.challenge_id]
            );
          if (['pending', 'leased'].includes(delivery.status))
            await tx.query(
              `UPDATE ${s}.identity_notification_outbox SET status='failed',protected_payload=NULL,lease_expires_at=NULL WHERE id=$1`,
              [delivery.id]
            );
          if (prior && prior.expires_at <= readNow()) fail('IDENTITY_EMAIL_EVENT_REJECTED');
        }
        await tx.query(
          `INSERT INTO ${s}.identity_email_events(provider_scope,event_id,delivery_id,event_type,occurred_at,fingerprint,created_at,expires_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            event.providerScope,
            event.eventId,
            event.deliveryId,
            event.type,
            event.occurredAt,
            event.fingerprint,
            now,
            new Date(+now + 86400000),
          ]
        );
      },
      async cleanup(readNow) {
        if (!admitted) fail('IDENTITY_EMAIL_EVENT_REJECTED');
        const now = readNow();
        const events = await tx.query(
          `DELETE FROM ${s}.identity_email_events WHERE (provider_scope,event_id) IN
          (SELECT provider_scope,event_id FROM ${s}.identity_email_events WHERE expires_at<=$1 ORDER BY expires_at,provider_scope,event_id LIMIT 50) RETURNING event_id`,
          [now]
        );
        const suppressions = await tx.query(
          `DELETE FROM ${s}.identity_email_suppressions WHERE recipient_digest IN
          (SELECT recipient_digest FROM ${s}.identity_email_suppressions WHERE expires_at<=$1 ORDER BY expires_at,recipient_digest LIMIT 50) RETURNING recipient_digest`,
          [now]
        );
        const metadata = await tx.query(
          `WITH expired AS (SELECT id FROM ${s}.identity_notification_outbox WHERE recipient_digest IS NOT NULL AND callback_expires_at<=$1
          ORDER BY callback_expires_at,id FOR UPDATE SKIP LOCKED LIMIT 50)
          UPDATE ${s}.identity_notification_outbox d SET recipient_digest=NULL,recipient_key_version=NULL,template_purpose=NULL,locale=NULL,recipient_aliases=NULL,
            status=CASE WHEN status IN ('pending','leased') THEN 'expired' ELSE status END,protected_payload=NULL,lease_expires_at=NULL
          FROM expired e WHERE d.id=e.id RETURNING d.id`,
          [now]
        );
        return { events: events.rowCount, suppressions: suppressions.rowCount, metadata: metadata.rowCount };
      },
    });
  }
}
