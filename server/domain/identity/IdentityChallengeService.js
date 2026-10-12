import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import {
  challengePolicy,
  challengeRatePolicy,
  challengeContextPurposes,
  challengeNextActions,
} from '../../config/authPolicy.js';
import { normalizeIdentityEmail } from './identityEmail.js';
import {
  keyFor,
  separatedKeys,
  fingerprint,
  equalDigest,
  digest,
  opaque,
  reject,
} from './identitySecrets.js';

const challengeError = () => reject('IDENTITY_CHALLENGE_UNAVAILABLE');
const projection = (row) => ({ challengeId: row.id, expiresAt: row.expires_at, resendAt: row.resend_at });

// Internal facade dependency only. resolveBinding verifies opaque browser/context
// proofs and returns immutable purpose/target authority; it does not receive the
// requested email, purpose or account ID as inputs from which to invent authority.
export class IdentityChallengeService {
  constructor({
    repository,
    operationRepository,
    identityRepository,
    deliveryService,
    resolveBinding,
    handlers,
    otpKeys,
    targetKeys,
    rateKeys,
    operationKeys,
    receiptKeys,
    otherKeyrings = [],
    clock = Date,
  }) {
    if (
      !repository ||
      !operationRepository ||
      !identityRepository ||
      !deliveryService ||
      typeof resolveBinding !== 'function' ||
      !handlers ||
      !Array.isArray(otherKeyrings) ||
      Object.keys(handlers).some(
        (purpose) =>
          !Object.hasOwn(challengeContextPurposes, purpose) || typeof handlers[purpose] !== 'function'
      )
    )
      challengeError();
    for (const ring of [otpKeys, targetKeys, rateKeys, operationKeys, receiptKeys]) keyFor(ring);
    separatedKeys([
      otpKeys,
      targetKeys,
      rateKeys,
      operationKeys,
      receiptKeys,
      deliveryService.keyring,
      deliveryService.recipientKeys,
      ...otherKeyrings,
    ]);
    Object.assign(this, {
      repository,
      operationRepository,
      identityRepository,
      deliveryService,
      resolveBinding,
      handlers: Object.freeze({ ...handlers }),
      otpKeys,
      targetKeys,
      rateKeys,
      operationKeys,
      clock,
    });
  }
  now() {
    return new Date(this.clock.now());
  }
  fresh(...dates) {
    const now = this.now();
    if (dates.some((date) => !(date instanceof Date) || !Number.isFinite(+date) || date <= now))
      challengeError();
    return now;
  }
  async safely(work) {
    try {
      return await work();
    } catch (error) {
      const code =
        typeof error?.code === 'string' &&
        /^IDENTITY_(CHALLENGE_UNAVAILABLE|RATE_LIMITED|RATE_CAPACITY|RATE_ROTATION_PENDING|KEY_UNAVAILABLE|IDEMPOTENCY_CONFLICT)$/.test(
          error.code
        )
          ? error.code
          : 'IDENTITY_CHALLENGE_UNAVAILABLE';
      reject(code);
    }
  }
  source(value) {
    if (typeof value !== 'string' || !isIP(value)) challengeError();
    return isIP(value) === 6 ? new URL(`http://[${value}]/`).hostname.toLowerCase() : value;
  }
  keyed(ring, version, domain, values) {
    return createHmac('sha256', keyFor(ring, version))
      .update(`identity:${domain}:v1:${version}\0`)
      .update(JSON.stringify(values))
      .digest('hex');
  }
  target(binding, version = this.targetKeys.current) {
    return this.keyed(this.targetKeys, version, 'challenge-target', [binding.canonicalEmail]);
  }
  code(row, binding, code) {
    return this.keyed(this.otpKeys, row.key_version, 'challenge-code', [
      row.id,
      row.purpose,
      row.target_digest,
      row.target_id,
      binding.browserDigest,
      code,
    ]);
  }
  buckets(scopes) {
    return scopes.map(([name, scope]) => ({
      name,
      ...challengeRatePolicy[name],
      digest: this.keyed(this.rateKeys, this.rateKeys.current, 'challenge-rate', [name, scope]),
    }));
  }
  async admission(scopes) {
    return this.repository.transaction(async (r) => {
      await r.lockAdmission();
      await r.admit(this.buckets(scopes), this.rateKeys.current, () => this.now());
    });
  }
  async resolve(input, stage) {
    const binding = await this.resolveBinding(
      { contextProof: input.contextProof, browserProof: input.browserProof },
      { stage }
    );
    if (
      !binding ||
      !opaque(binding.contextId) ||
      !digest(binding.browserDigest) ||
      !opaque(binding.targetId) ||
      !Object.hasOwn(challengeContextPurposes, binding.purpose) ||
      typeof this.handlers[binding.purpose] !== 'function' ||
      binding.purpose !== input.purpose ||
      (binding.accountId != null &&
        (!opaque(binding.accountId) ||
          !Number.isSafeInteger(binding.securityVersion) ||
          binding.securityVersion < 1))
    )
      challengeError();
    const email = normalizeIdentityEmail(binding.canonicalEmail);
    const delivery = normalizeIdentityEmail(binding.deliveryEmail);
    if (email.canonicalEmail !== binding.canonicalEmail || delivery.canonicalEmail !== email.canonicalEmail)
      challengeError();
    return Object.freeze({
      contextId: binding.contextId,
      browserDigest: binding.browserDigest,
      targetId: binding.targetId,
      purpose: binding.purpose,
      accountId: binding.accountId ?? null,
      securityVersion: binding.accountId ? binding.securityVersion : null,
      canonicalEmail: email.canonicalEmail,
      deliveryEmail: delivery.deliveryEmail,
    });
  }
  validateContext(binding, account, context) {
    if (
      !context ||
      context.status !== 'pending' ||
      context.account_id !== binding.accountId ||
      context.security_version !== binding.securityVersion ||
      context.browser_digest !== binding.browserDigest ||
      context.purpose !== challengeContextPurposes[binding.purpose] ||
      context.target_binding !== binding.targetId ||
      (binding.accountId &&
        (!account || account.status !== 'active' || account.security_version !== binding.securityVersion))
    )
      challengeError();
    this.fresh(context.expires_at);
  }
  matches(row, binding) {
    return (
      row &&
      row.context_id === binding.contextId &&
      row.account_id === binding.accountId &&
      row.security_version === binding.securityVersion &&
      row.purpose === binding.purpose &&
      row.target_id === binding.targetId &&
      equalDigest(row.target_digest, this.target(binding, row.target_key_version))
    );
  }
  issue(input) {
    return this.safely(async () => {
      const source = this.source(input.sourceAddress);
      if (typeof input.key !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(input.key)) challengeError();
      const binding = await this.resolve(input, 'issue');
      if (normalizeIdentityEmail(input.email).canonicalEmail !== binding.canonicalEmail) challengeError();
      return this.repository.transaction(async (r, tx) => {
        await r.lockAdmission();
        const operationInput = { ...binding, action: 'challenge_issue', key: input.key };
        const existing = await r.peekIssue(operationInput);
        if (!existing)
          await r.admit(
            this.buckets([
              ['send_target_hour', binding.canonicalEmail],
              ['send_target_day', binding.canonicalEmail],
              ['send_cooldown', binding.canonicalEmail],
              ['send_source_hour', source],
              ['send_global_hour', 'fixture'],
            ]),
            this.rateKeys.current,
            () => this.now()
          );
        const { account, context } = await r.lockBinding(binding);
        this.validateContext(binding, account, context);
        const targetDigests = Object.keys(this.targetKeys.keys).map((version) =>
          this.target(binding, Number(version))
        );
        await r.lockPendingTargets(targetDigests, binding.purpose, binding.accountId);
        const operations = this.operationRepository.bind(tx);
        const old = await operations.findByKey(operationInput);
        const payload = {
          contextId: binding.contextId,
          browserDigest: binding.browserDigest,
          purpose: binding.purpose,
          targetId: binding.targetId,
          email: binding.canonicalEmail,
        };
        if (old) {
          const same = equalDigest(
            old.fingerprint,
            fingerprint(this.operationKeys, old.key_version, 'challenge_issue', payload)
          );
          if (!same || (old.binding_context_id ?? old.context_id) !== binding.contextId)
            reject('IDENTITY_IDEMPOTENCY_CONFLICT');
          this.fresh(context.expires_at, old.expires_at);
          const challenge = await r.challengeByOperation(old.id);
          if (!challenge || old.status !== 'succeeded') challengeError();
          return projection(challenge);
        }
        const now = this.fresh(context.expires_at);
        const expiresAt = new Date(Math.min(+context.expires_at, +now + challengePolicy.lifetimeMs));
        const op = await operations.insertOperation({
          ...operationInput,
          id: randomUUID(),
          now,
          expiresAt,
          keyVersion: this.operationKeys.current,
          fingerprint: fingerprint(
            this.operationKeys,
            this.operationKeys.current,
            'challenge_issue',
            payload
          ),
        });
        await r.supersede(targetDigests, binding.purpose, binding.accountId);
        this.fresh(context.expires_at, expiresAt);
        const code = String(randomInt(0, 1000000)).padStart(challengePolicy.digits, '0');
        const id = randomUUID(),
          targetDigest = this.target(binding);
        const row = await r.insert({
          ...binding,
          id,
          operationId: op.id,
          now,
          expiresAt,
          resendAt: new Date(+now + challengePolicy.resendMs),
          keyVersion: this.otpKeys.current,
          targetKeyVersion: this.targetKeys.current,
          targetDigest,
          codeDigest: this.code(
            {
              id,
              purpose: binding.purpose,
              target_digest: targetDigest,
              target_id: binding.targetId,
              key_version: this.otpKeys.current,
            },
            binding,
            code
          ),
        });
        await operations.finish(op.id, { nextAction: 'verify_code', accountId: binding.accountId });
        await this.deliveryService.enqueue(operations, op, {
          purpose: 'challenge_code',
          challengeId: id,
          proofExpiresAt: expiresAt,
          payload: { to: binding.deliveryEmail, code },
        });
        this.fresh(context.expires_at, expiresAt);
        return projection(row);
      });
    });
  }
  verify(input) {
    return this.safely(async () => {
      const source = this.source(input.sourceAddress);
      await this.admission([
        ['verify_source_short', source],
        ['verify_source_hour', source],
        ['verify_global_hour', 'fixture'],
      ]);
      if (!opaque(input.challengeId) || typeof input.code !== 'string' || !/^\d{6}$/.test(input.code))
        challengeError();
      const binding = await this.resolve(input, 'verify');
      const snapshot = await this.repository.transaction((r) => r.challenge(input.challengeId));
      if (!this.matches(snapshot, binding)) challengeError();
      const inspected = await this.repository.transaction((r) => r.readBinding(binding));
      this.validateContext(binding, inspected.account, inspected.context);
      const scopes = [
        ['verify_target_short', binding.canonicalEmail],
        ['verify_target_hour', binding.canonicalEmail],
      ];
      if (binding.accountId)
        scopes.push(['verify_account_short', binding.accountId], ['verify_account_hour', binding.accountId]);
      await this.admission(scopes);
      const result = await this.repository.transaction(async (r, tx) => {
        const { account, context } = await r.lockBinding(binding);
        this.validateContext(binding, account, context);
        const row = await r.challenge(input.challengeId, true);
        if (
          !this.matches(row, binding) ||
          row.status !== 'pending' ||
          row.delivery_status !== 'sent' ||
          row.attempts >= challengePolicy.maximumFailures
        )
          challengeError();
        this.fresh(context.expires_at, row.expires_at);
        if (!equalDigest(row.digest, this.code(row, binding, input.code))) {
          await r.failure(row.id);
          return { denied: true };
        }
        await r.consume(row.id);
        this.fresh(context.expires_at, row.expires_at);
        const handled = await this.handlers[binding.purpose]({
          binding,
          challengeId: row.id,
          transaction: tx,
          identity: this.identityRepository.bind(tx),
          proofs: Object.freeze({ contextProof: input.contextProof, browserProof: input.browserProof }),
        });
        this.fresh(context.expires_at, row.expires_at);
        if (
          !handled ||
          Object.getPrototypeOf(handled) !== Object.prototype ||
          Object.keys(handled).some(
            (key) => !['nextAction', 'contextId', 'session', 'returnPath'].includes(key)
          ) ||
          ((handled.session !== undefined || handled.returnPath !== undefined) &&
            (binding.purpose !== 'login' ||
              handled.nextAction !== 'authenticate' ||
              !handled.session ||
              typeof handled.returnPath !== 'string')) ||
          !challengeNextActions[binding.purpose].includes(handled.nextAction) ||
          (handled.contextId !== undefined && !opaque(handled.contextId))
        )
          challengeError();
        return { denied: false, result: handled };
      });
      if (result.denied) challengeError();
      return result.result;
    });
  }
}
