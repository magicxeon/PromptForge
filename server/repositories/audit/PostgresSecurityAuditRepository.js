import { assertLivePostgresTransaction } from '../postgres/database.js';
import { auditSchema } from './securityAuditMigrations.js';

export class PostgresSecurityAuditRepository {
  constructor({ schema = 'public' } = {}) { this.table = `${auditSchema(schema)}.audit_security_events`; }

  async appendSecurityEvent(event, transaction) {
    assertLivePostgresTransaction(transaction);
    const values = [event.eventId, event.actorType, event.accountId, event.action, event.outcome, event.occurredAt,
      event.requestFingerprint, event.targetFingerprint, event.peerFingerprint, event.peerKeyVersion, JSON.stringify(event.metadata)];
    const columns = 'event_id, actor_type, account_id, action, outcome, occurred_at, request_fingerprint, target_fingerprint, peer_fingerprint, peer_key_version, metadata';
    const inserted = await transaction.query(`INSERT INTO ${this.table} (${columns})
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`, values);
    if (inserted.rowCount === 1) return { eventId: event.eventId, replayed: false };
    // A separate statement observes the winning committed insert under READ COMMITTED.
    // No UPDATE is used; recorded_at remains the original value on exact replay.
    const same = await transaction.query(`SELECT event_id FROM ${this.table} WHERE event_id=$1
      AND actor_type=$2 AND account_id IS NOT DISTINCT FROM $3 AND action=$4 AND outcome=$5 AND occurred_at=$6::timestamptz
      AND request_fingerprint=$7 AND target_fingerprint=$8 AND peer_fingerprint=$9 AND peer_key_version=$10 AND metadata=$11::jsonb`, values);
    if (same.rowCount !== 1) throw Object.assign(new Error('Security audit event rejected.'), { code: 'AUDIT_SECURITY_EVENT_CONFLICT' });
    return { eventId: event.eventId, replayed: true };
  }
}
