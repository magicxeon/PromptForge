import crypto from 'crypto';
import { auditLogRepo } from '../../repositories/audit/AuditLogRepository.js';

export class AuditService {
  constructor({ auditRepository = auditLogRepo, ipHashSalt = process.env.AUDIT_IP_HASH_SALT || 'local-audit-salt' } = {}) {
    this.auditRepository = auditRepository;
    this.ipHashSalt = ipHashSalt;
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

export const auditService = new AuditService();
