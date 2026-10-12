import { randomUUID } from 'node:crypto';
import {
  keyFor,
  separatedKeys,
  equalDigest,
  sealDelivery,
  openDelivery,
  reject,
  opaque,
} from './identitySecrets.js';
import { recipientDigest, recipientDigests } from './adapters/identityEmailMetadata.js';

// Sharing an adapter between service instances must not create extra dispatch
// capacity. A timed-out promise keeps its slot until the adapter actually settles.
const adapterSlots = new WeakMap();

function validPayload(purpose, payload) {
  if (
    !payload ||
    Object.getPrototypeOf(payload) !== Object.prototype ||
    typeof payload.to !== 'string' ||
    payload.to.length > 254 ||
    !/^[^@\s]+@example\.invalid$/.test(payload.to)
  )
    reject('IDENTITY_DELIVERY_REJECTED');
  if (purpose === 'challenge_code') {
    if (
      Object.keys(payload).some((k) => !['to', 'code'].includes(k)) ||
      typeof payload.code !== 'string' ||
      !/^\d{6}$/.test(payload.code)
    )
      reject('IDENTITY_DELIVERY_REJECTED');
  } else if (purpose === 'security_notification') {
    if (
      Object.keys(payload).some((k) => !['to', 'kind'].includes(k)) ||
      ![
        'password_changed',
        'email_changed',
        'method_linked',
        'method_unlinked',
        'mfa_changed',
        'sessions_revoked',
      ].includes(payload.kind)
    )
      reject('IDENTITY_DELIVERY_REJECTED');
  } else reject('IDENTITY_DELIVERY_REJECTED');
}

// Explicit fixture gate: real composition remains blocked by D02/D05 approval.
export class IdentityDeliveryService {
  constructor({
    repository,
    keyring,
    recipientKeys,
    eventRepository,
    adapter,
    clock = Date,
    fixtureOnly = false,
  }) {
    if (fixtureOnly !== true || !repository || !eventRepository || typeof adapter?.send !== 'function')
      reject('IDENTITY_DELIVERY_UNAVAILABLE');
    keyFor(keyring);
    keyFor(recipientKeys);
    if (Object.keys(recipientKeys.keys).length > 8) reject('IDENTITY_DELIVERY_UNAVAILABLE');
    separatedKeys([keyring, recipientKeys]);
    this.repository = repository;
    this.keyring = keyring;
    this.recipientKeys = recipientKeys;
    this.eventRepository = eventRepository;
    this.adapter = adapter;
    this.clock = clock;
    if (!adapterSlots.has(adapter)) adapterSlots.set(adapter, new Set());
    this.slots = adapterSlots.get(adapter);
  }
  async enqueue(bound, operation, item) {
    const now = new Date(this.clock.now());
    if (
      !opaque(operation.id) ||
      !['security_notification', 'challenge_code'].includes(item.purpose) ||
      (item.purpose === 'challenge_code' && !opaque(item.challengeId)) ||
      (item.purpose === 'security_notification' && item.challengeId != null)
    )
      reject('IDENTITY_DELIVERY_REJECTED');
    validPayload(item.purpose, item.payload);
    await bound.requireRecipientKeys(
      Object.keys(this.recipientKeys.keys).map(Number),
      () => new Date(this.clock.now())
    );
    const expiresAt = new Date(
      Math.min(
        new Date(item.proofExpiresAt).getTime(),
        new Date(operation.expires_at).getTime(),
        now.getTime() + 300000
      )
    );
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt - now < 1000) reject('IDENTITY_DELIVERY_REJECTED');
    const record = {
      id: randomUUID(),
      operationId: operation.id,
      purpose: item.purpose,
      keyVersion: this.keyring.current,
      challengeId: item.challengeId,
      now,
      expiresAt,
      recipientDigest: recipientDigest(this.recipientKeys, this.recipientKeys.current, item.payload.to),
      recipientKeyVersion: this.recipientKeys.current,
      recipientAliases: recipientDigests(this.recipientKeys, item.payload.to),
      templatePurpose:
        item.purpose === 'challenge_code'
          ? await bound.deliveryTemplatePurpose(item.challengeId)
          : item.payload.kind,
      locale: item.locale === 'th' ? 'th' : 'en',
      callbackExpiresAt: new Date(+now + 86400000),
    };
    record.protectedPayload = sealDelivery(this.keyring, record, item.payload);
    await bound.enqueue(record);
    return record.id;
  }
  async cleanup() {
    return this.repository.transaction((r) => r.cleanup(new Date(this.clock.now())));
  }
  async process() {
    let count = 0;
    await this.cleanup();
    // Five pairs bound invocation to ten claims and concurrency to two.
    for (let batch = 0; batch < 5; batch++) {
      const pair = await Promise.all([this.claimAndSend(), this.claimAndSend()]);
      count += pair.filter(Boolean).length;
      if (pair.every((value) => !value)) break;
    }
    return { processed: count };
  }
  eligibilityDeadline(snapshot, item) {
    if (!snapshot || snapshot.id !== item.id || snapshot.generation !== item.generation) return null;
    const deadlines = [snapshot.deliveryExpiresAt, snapshot.leaseExpiresAt];
    if (item.challengeId) deadlines.push(snapshot.challengeExpiresAt, snapshot.contextExpiresAt);
    if (deadlines.some((date) => !(date instanceof Date) || !Number.isFinite(+date))) return null;
    const deadline = Math.min(...deadlines.map(Number));
    return deadline - this.clock.now() >= 1000 ? deadline : null;
  }
  async claimAndSend() {
    if (this.slots.size >= 2 || [...this.slots].some((slot) => slot.timedOut)) return false;
    const slot = { timedOut: false };
    this.slots.add(slot);
    let dispatched = false;
    try {
      const item = await this.repository.transaction((r) => r.claim(new Date(this.clock.now())));
      if (!item) return false;
      const acknowledge = (outcome) =>
        this.repository.transaction((r) => r.acknowledge(item, outcome, () => new Date(this.clock.now())));
      const eligible = () => this.repository.transaction((r) => r.eligible(item));
      if (this.eligibilityDeadline(await eligible(), item) === null) {
        await acknowledge('expired');
        return true;
      }
      let payload;
      try {
        payload = openDelivery(this.keyring, item);
        validPayload(item.purpose, payload);
        if (
          !equalDigest(
            item.recipientDigest,
            recipientDigest(this.recipientKeys, item.recipientKeyVersion, payload.to)
          )
        )
          reject('IDENTITY_DELIVERY_REJECTED');
      } catch {
        await acknowledge('failed');
        return true;
      }
      // Recheck immediately before sending; no network call holds a SQL
      // transaction. A sibling timeout also quarantines work already claimed.
      let eligibility = await eligible();
      if (this.eligibilityDeadline(eligibility, item) === null) {
        await acknowledge('expired');
        return true;
      }
      if ([...this.slots].some((value) => value.timedOut)) {
        await acknowledge('retry');
        return true;
      }
      const suppressed = await this.eventRepository.isSuppressed(
        recipientDigests(this.recipientKeys, payload.to),
        () => new Date(this.clock.now())
      );
      if (suppressed || this.eligibilityDeadline(eligibility, item) === null) {
        await acknowledge(suppressed ? 'failed' : 'expired');
        return true;
      }
      // Final dispatch admission is one fresh SQL snapshot after acquiring the
      // outbox lock. It combines current proof with recipient suppression and
      // historical-key coverage, including callbacks for older deliveries.
      eligibility = await this.repository.transaction((r) =>
        r.eligible(item, recipientDigests(this.recipientKeys, payload.to))
      );
      const blocked = [eligibility?.suppressionExpiresAt, eligibility?.missingKeyExpiresAt].some(
        (deadline) => deadline instanceof Date && +deadline > this.clock.now()
      );
      if (blocked || this.eligibilityDeadline(eligibility, item) === null) {
        await acknowledge(blocked ? 'failed' : 'expired');
        return true;
      }
      if ([...this.slots].some((value) => value.timedOut)) {
        await acknowledge('retry');
        return true;
      }
      const controller = new AbortController();
      let timer;
      let outcome = 'sent';
      dispatched = true;
      let expiredBeforeDispatch = false;
      const external = Promise.resolve().then(() => {
        if ([...this.slots].some((value) => value.timedOut)) {
          throw new Error('Delivery adapter quarantined.');
        }
        // Promise scheduling itself may cross a deadline. Check the exact
        // delivery/lease/challenge/context snapshot immediately before send.
        if (this.eligibilityDeadline(eligibility, item) === null) {
          expiredBeforeDispatch = true;
          throw new Error('Delivery authority expired.');
        }
        return this.adapter.send(
          {
            ...payload,
            id: item.id,
            templatePurpose: item.templatePurpose,
            locale: item.locale,
            expiresAt: item.expiresAt,
            issuedAt: item.createdAt,
          },
          { signal: controller.signal }
        );
      });
      // Both branches handle settlement, avoiding an unhandled rejecting
      // finally-promise after Promise.race has returned on timeout.
      external.then(
        () => this.slots.delete(slot),
        () => this.slots.delete(slot)
      );
      try {
        await Promise.race([
          external,
          new Promise((_, rejectTimeout) => {
            timer = setTimeout(
              () => {
                slot.timedOut = true;
                controller.abort();
                rejectTimeout(new Error('Delivery timeout.'));
              },
              Math.max(
                0,
                Math.min(
                  10000,
                  (this.eligibilityDeadline(eligibility, item) ?? this.clock.now()) - this.clock.now()
                )
              )
            );
          }),
        ]);
      } catch {
        outcome = expiredBeforeDispatch ? 'expired' : 'retry';
      } finally {
        clearTimeout(timer);
        payload = null;
      }
      await acknowledge(outcome);
      return true;
    } finally {
      // Uncertain external work retains its slot; a later invocation cannot
      // create an unbounded set of sends merely because their timers elapsed.
      if (!dispatched) this.slots.delete(slot);
    }
  }
}
