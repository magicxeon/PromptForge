import { randomUUID } from 'node:crypto';
import { identityRuntimeQualified } from '../../config/identityRuntime.js';
import { authFail } from './IdentityContextService.js';
export class IdentityFacebookEventService {
  constructor({ repository, adapter, sessions, receiptOrigin, fixtureOnly = false, runtime }) {
    let origin;
    try { origin = new URL(receiptOrigin); } catch { authFail('auth_service_unavailable'); }
    if (origin.href !== `${origin.origin}/` || origin.username || origin.password ||
      !(origin.protocol === 'https:' || (fixtureOnly || identityRuntimeQualified(runtime, 'facebook') && runtime.localHttp) && origin.protocol === 'http:' && origin.hostname === '127.0.0.1')) authFail('auth_service_unavailable');
    Object.assign(this, { repository, adapter, sessions, receiptOrigin: origin.origin, fixtureOnly, runtime });
    this.available = false;
  }
  async receive(kind, signedRequest) {
    if (!this.fixtureOnly && !identityRuntimeQualified(this.runtime, 'facebook') || !['deauthorization', 'deletion_request'].includes(kind)) authFail('auth_service_unavailable');
    // Verify every retry before inspecting any durable receipt.
    const event = this.adapter.signedEvent(signedRequest), issuer = this.adapter.issuer;
    const result = await this.repository.transaction(async (r, tx) => {
      await r.lock();
      const now = this.sessions.now();
      if (event.issuedAt > +now) authFail('auth_social_unavailable');
      const prior = await r.receipt(issuer, kind, event.fingerprint);
      if (prior) {
        if (+prior.expires_at <= +now) authFail('auth_social_unavailable');
        return prior.confirmation_code;
      }
      if (event.issuedAt <= +now - 300000) authFail('auth_social_unavailable');
      await r.cleanup(now);
      if ((await r.capacity()).count >= 10000) authFail('auth_service_unavailable');
      let owner = await r.owner(issuer, event.subject);
      const expectedOwner = owner?.id;
      if (owner) {
        await r.lockAccount(owner.id);
      }
      await r.lockSubject(issuer, event.subject);
      owner = await r.owner(issuer, event.subject);
      if (owner?.id !== expectedOwner) authFail('auth_service_unavailable');
      const id = randomUUID(), confirmationCode = randomUUID();
      if (owner) await r.revoke({ issuer, subject: event.subject, accountId: owner.id, securityVersion: owner.security_version, now });
      await this.sessions.audit(tx, 'method_unlink', owner?.id, id, this.sessions.auditPeer(), { provider: 'facebook' });
      if (event.issuedAt > this.sessions.clock.now() || event.issuedAt <= this.sessions.clock.now() - 300000) authFail('auth_social_unavailable');
      await r.insert({ id, issuer, kind, subject: event.subject, fingerprint: event.fingerprint, occurredAt: new Date(event.issuedAt), confirmationCode, now, expiresAt: new Date(+now + 86400000) });
      return confirmationCode;
    });
    return kind === 'deletion_request'
      ? { url: `${this.receiptOrigin}/auth/facebook/data-deletion?confirmation_code=${result}`, confirmation_code: result }
      : { contractVersion: 1, received: true };
  }
  async status(query) {
    if (!this.fixtureOnly && !identityRuntimeQualified(this.runtime, 'facebook') || !query || Object.keys(query).length !== 1 || typeof query.confirmation_code !== 'string' || !/^[a-f0-9-]{36}$/.test(query.confirmation_code)) authFail('auth_forbidden');
    const row = await this.repository.transaction((r) => r.confirmation(query.confirmation_code, this.adapter.issuer));
    if (!row || +row.expires_at <= this.sessions.clock.now()) authFail('auth_forbidden');
    return { contractVersion: 1, status: 'received' };
  }
}
