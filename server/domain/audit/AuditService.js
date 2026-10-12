import crypto from 'crypto';
import { isIP } from 'node:net';
import { assertLivePostgresTransaction } from '../../repositories/postgres/database.js';
import { auditLogRepo } from '../../repositories/audit/AuditLogRepository.js';

export class AuditService {
  constructor({ auditRepository = auditLogRepo, ipHashSalt = process.env.AUDIT_IP_HASH_SALT || 'local-audit-salt',
    securityRepository, securityFingerprintKey, securityFingerprintKeyVersion } = {}) {
    this.auditRepository = auditRepository;
    this.ipHashSalt = ipHashSalt;
    this.securityRepository = securityRepository;
    this.securityFingerprintKey = Buffer.isBuffer(securityFingerprintKey) ? Buffer.from(securityFingerprintKey) : null;
    this.securityFingerprintKeyVersion = securityFingerprintKeyVersion;
  }

  async recordSecurityEvent(event, { transaction, actor, peerAddress } = {}) {
    try {
      assertLivePostgresTransaction(transaction);
      if (!this.securityRepository || this.securityFingerprintKey?.length !== 32
        || !positiveInteger(this.securityFingerprintKeyVersion)) throw new Error();
      const normalized = normalizeSecurityEvent(event, actor);
      if (event.peerFingerprint !== undefined) {
        if (peerAddress !== undefined || !digest(event.peerFingerprint) || !positiveInteger(event.peerKeyVersion)) throw new Error();
        normalized.peerFingerprint = event.peerFingerprint;
        normalized.peerKeyVersion = event.peerKeyVersion;
      } else {
        if (typeof peerAddress !== 'string' || !isIP(peerAddress)) throw new Error();
        normalized.peerFingerprint = crypto.createHmac('sha256', this.securityFingerprintKey)
          .update(`audit:peer:v1:${this.securityFingerprintKeyVersion}\0`).update(peerAddress).digest('hex');
        normalized.peerKeyVersion = this.securityFingerprintKeyVersion;
      }
      return await this.securityRepository.appendSecurityEvent(normalized, transaction);
    } catch (error) {
      throw securityError(error?.code === 'AUDIT_SECURITY_EVENT_CONFLICT' ? error.code : 'AUDIT_SECURITY_EVENT_REJECTED');
    }
  }

  async record(event = {}, actorContext, request = null) {
    const forwardedFor = request?.headers?.['x-forwarded-for'];
    const ip = typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0].trim()
      : request?.ip || request?.socket?.remoteAddress || null;
    return this.auditRepository.appendEvent({
      ...event,
      requestId: event.requestId || request?.requestId || actorContext?.requestId || null,
      ipHash: event.ipHash || this.hashIp(ip)
    }, actorContext);
  }

  hashIp(ip) {
    if (!ip) return null;
    return crypto.createHash('sha256').update(`${this.ipHashSalt}:${ip}`).digest('hex');
  }
}

function securityError(code) { return Object.assign(new Error('Security audit event rejected.'), { code }); }
const record = value => value && typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const opaque = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const positiveInteger = value => Number.isInteger(value) && value > 0 && value <= 2147483647;
const actions = new Set(['registration', 'email_verification', 'password_login', 'otp_login', 'challenge_issue', 'challenge_verify',
  'password_reset', 'password_change', 'social_login', 'method_link', 'method_unlink', 'session_create', 'session_revoke',
  'logout', 'logout_all', 'reauthentication', 'mfa_enroll', 'mfa_verify', 'mfa_disable', 'mfa_recovery', 'account_status', 'rate_limit']);
const metadataRules = {
  provider: value => ['email', 'google', 'facebook'].includes(value),
  purpose: value => ['register', 'login', 'reset', 'link', 'reauth', 'mfa', 'verify_email'].includes(value),
  reason: value => ['invalid_proof', 'expired', 'replayed', 'rate_limited', 'unavailable', 'disabled', 'conflict', 'cancelled', 'policy', 'delivery_failed'].includes(value),
  attemptCount: value => Number.isInteger(value) && value >= 0 && value <= 100,
  securityVersion: positiveInteger,
  remembered: value => typeof value === 'boolean',
};
function normalizeSecurityEvent(event, actor) {
  const allowed = ['eventId', 'action', 'outcome', 'occurredAt', 'requestFingerprint', 'targetFingerprint', 'targetAccountId', 'metadata', 'peerFingerprint', 'peerKeyVersion'];
  if (!record(event) || Object.keys(event).some(key => !allowed.includes(key)) || !opaque(event.eventId)
    || !actions.has(event.action) || !['succeeded', 'denied', 'failed'].includes(event.outcome)
    || !digest(event.requestFingerprint) || !digest(event.targetFingerprint)
    || typeof event.occurredAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(event.occurredAt)
    || !Number.isFinite(Date.parse(event.occurredAt)) || new Date(event.occurredAt).toISOString() !== event.occurredAt
    || !record(actor)) throw new Error();
  let accountId = null;
  if (actor.type === 'account') {
    if (Object.keys(actor).some(key => !['type', 'accountId'].includes(key)) || !opaque(actor.accountId)
      || event.targetAccountId !== actor.accountId) throw new Error();
    accountId = actor.accountId;
  } else if (actor.type !== 'system-security' || Object.keys(actor).length !== 1 || event.targetAccountId !== undefined) throw new Error();
  if (event.peerFingerprint === undefined && event.peerKeyVersion !== undefined) throw new Error();
  const metadata = event.metadata ?? {};
  if (!record(metadata) || Object.keys(metadata).some(key => !Object.hasOwn(metadataRules, key) || !metadataRules[key](metadata[key]))) throw new Error();
  const sortedMetadata = Object.fromEntries(Object.keys(metadata).sort().map(key => [key, metadata[key]]));
  if (Buffer.byteLength(JSON.stringify(sortedMetadata)) > 512) throw new Error();
  return { eventId: event.eventId, action: event.action, outcome: event.outcome, occurredAt: event.occurredAt,
    requestFingerprint: event.requestFingerprint, targetFingerprint: event.targetFingerprint,
    actorType: actor.type, accountId, metadata: sortedMetadata };
}

export const auditService = new AuditService();
