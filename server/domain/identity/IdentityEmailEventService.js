import { createHash } from 'node:crypto';
import { identityRuntimeQualified } from '../../config/identityRuntime.js';
import { opaque } from './identitySecrets.js';

const fail = (code) => {
  throw Object.assign(new Error('Identity email event rejected.'), { code });
};
export class IdentityEmailEventService {
  constructor({ repository, verifyEvent, providerScope, clock = Date, fixtureOnly = false, runtime }) {
    if (
      !repository ||
      typeof verifyEvent !== 'function' ||
      fixtureOnly !== true && !identityRuntimeQualified(runtime, 'email') ||
      typeof providerScope !== 'string' ||
      !/^[A-Za-z0-9_-]{1,64}$/.test(providerScope)
    )
      fail('IDENTITY_EMAIL_EVENT_UNAVAILABLE');
    Object.assign(this, { repository, verifyEvent, providerScope, clock });
  }
  async accept(packet) {
    try {
      if (!packet || !Buffer.isBuffer(packet.body) || packet.body.length > 32768)
        fail('IDENTITY_EMAIL_EVENT_REJECTED');
      const event = await this.verifyEvent(packet);
      if (
        !event ||
        Object.getPrototypeOf(event) !== Object.prototype ||
        Object.keys(event).some((k) => !['eventId', 'deliveryId', 'type', 'occurredAt'].includes(k)) ||
        !opaque(event.eventId) ||
        !opaque(event.deliveryId) ||
        !['delivered', 'bounce', 'complaint'].includes(event.type) ||
        typeof event.occurredAt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(event.occurredAt) ||
        !Number.isFinite(Date.parse(event.occurredAt)) ||
        new Date(event.occurredAt).toISOString() !== event.occurredAt
      )
        fail('IDENTITY_EMAIL_EVENT_REJECTED');
      const fingerprint = createHash('sha256')
        .update(JSON.stringify([event.deliveryId, event.type, event.occurredAt]))
        .digest('hex');
      return await this.repository.transaction(async (r) => {
        await r.lockAdmission();
        const prior = await r.event(this.providerScope, event.eventId);
        if (prior) {
          if (prior.fingerprint !== fingerprint) fail('IDENTITY_EMAIL_EVENT_CONFLICT');
          if (prior.expires_at <= new Date(this.clock.now())) fail('IDENTITY_EMAIL_EVENT_REJECTED');
          return { accepted: true, replayed: true };
        }
        const delivery = await r.delivery(event.deliveryId),
          now = new Date(this.clock.now());
        if (
          !delivery?.recipient_digest ||
          delivery.callback_expires_at <= now ||
          Date.parse(event.occurredAt) < +delivery.created_at ||
          Date.parse(event.occurredAt) > +now + 60000
        )
          fail('IDENTITY_EMAIL_EVENT_REJECTED');
        await r.record(
          { ...event, providerScope: this.providerScope, fingerprint },
          delivery,
          () => new Date(this.clock.now())
        );
        if (delivery.callback_expires_at <= new Date(this.clock.now())) fail('IDENTITY_EMAIL_EVENT_REJECTED');
        return { accepted: true, replayed: false };
      });
    } catch (error) {
      fail(
        ['IDENTITY_EMAIL_EVENT_CONFLICT', 'IDENTITY_EMAIL_EVENT_CAPACITY'].includes(error?.code)
          ? error.code
          : 'IDENTITY_EMAIL_EVENT_REJECTED'
      );
    }
  }
  cleanup() {
    return this.repository.transaction(async (r) => {
      await r.lockAdmission();
      return r.cleanup(() => new Date(this.clock.now()));
    });
  }
}
