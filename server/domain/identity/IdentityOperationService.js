import { randomUUID } from 'node:crypto';
import {
  reject,
  opaque,
  digest,
  keyFor,
  separatedKeys,
  fingerprint,
  newSecret,
  receiptDigest,
  equalDigest,
} from './identitySecrets.js';

const actions = new Set([
  'password_reset',
  'password_change',
  'email_change',
  'method_link',
  'method_unlink',
  'mfa_enroll',
  'mfa_disable',
  'logout_all',
  'social_login',
]);
const outcome = (op) => ({
  contractVersion: 1,
  operationId: op.id,
  status: op.status,
  nextAction: op.next_action ?? null,
});
const socialAction = (social, action) =>
  social &&
  ((social.intent === 'login' && action === 'social_login') ||
    (social.intent === 'link' && action === 'method_link'));

// Private Identity orchestration. Handlers/proof guard are composition-owned;
// caller input cannot select arbitrary functions or substitute a receipt for proof.
export class IdentityOperationService {
  constructor({
    repository,
    identityRepository,
    auditService,
    deliveryService,
    fingerprintKeys,
    receiptKeys,
    handlers,
    verifyProof,
    clock = Date,
  }) {
    if (
      !repository ||
      !identityRepository ||
      typeof auditService?.recordSecurityEvent !== 'function' ||
      typeof verifyProof !== 'function' ||
      !handlers ||
      Object.keys(handlers).some((action) => !actions.has(action) || typeof handlers[action] !== 'function')
    )
      reject();
    keyFor(fingerprintKeys);
    keyFor(receiptKeys);
    separatedKeys([fingerprintKeys, receiptKeys, ...(deliveryService ? [deliveryService.keyring,deliveryService.recipientKeys] : [])]);
    Object.assign(this, {
      repository,
      identityRepository,
      auditService,
      deliveryService,
      fingerprintKeys,
      receiptKeys,
      handlers: Object.freeze({ ...handlers }),
      verifyProof,
      clock,
    });
  }
  transact(work) {
    return this.repository.transaction(work).catch((error) => {
      const code =
        typeof error?.code === 'string' &&
        /^(IDENTITY_[A-Z_]{1,64}|AUDIT_SECURITY_EVENT_REJECTED|AUDIT_SECURITY_EVENT_CONFLICT)$/.test(
          error.code
        )
          ? error.code
          : 'IDENTITY_OPERATION_REJECTED';
      reject(code);
    });
  }
  validate(i) {
    if (
      !i ||
      !actions.has(i.action) ||
      typeof this.handlers[i.action] !== 'function' ||
      !opaque(i.contextId) ||
      !opaque(i.target) ||
      !digest(i.browserDigest) ||
      typeof i.key !== 'string' ||
      !/^[A-Za-z0-9_-]{16,128}$/.test(i.key) ||
      (i.accountId != null &&
        (!opaque(i.accountId) || !Number.isSafeInteger(i.securityVersion) || i.securityVersion < 1))
    )
      reject();
    fingerprint(this.fingerprintKeys, this.fingerprintKeys.current, i.action, {
      target: i.target,
      payload: i.payload,
    });
  }
  assertCurrent(...deadlines) {
    const now = new Date(this.clock.now());
    if (
      deadlines.some(
        (deadline) => !(deadline instanceof Date) || !Number.isFinite(+deadline) || deadline <= now
      )
    ) {
      reject('IDENTITY_PROOF_UNAVAILABLE');
    }
    return now;
  }
  async guard(r, tx, i, stage) {
    const { account, context } = await r.lockScope(i, new Date(this.clock.now()));
    const now = new Date(this.clock.now());
    if (
      !context ||
      context.status !== 'pending' ||
      context.expires_at <= now ||
      context.browser_digest !== i.browserDigest ||
      context.account_id !== (i.accountId ?? null) ||
      context.security_version !== (i.accountId ? i.securityVersion : null) ||
      (i.accountId &&
        (!account || account.status !== 'active' || account.security_version !== i.securityVersion))
    )
      reject('IDENTITY_PROOF_UNAVAILABLE');
    if (
      (await this.verifyProof({
        stage,
        action: i.action,
        target: i.target,
        context,
        account,
        browserDigest: i.browserDigest,
        proof: i.proof,
        payload: i.payload,
        transaction: tx,
      })) !== true
    )
      reject('IDENTITY_PROOF_UNAVAILABLE');
    this.assertCurrent(context.expires_at);
    return { context };
  }
  match(op, i) {
    if (
      !op ||
      op.account_id !== (i.accountId ?? null) ||
      (op.binding_context_id ?? op.context_id) !== i.contextId ||
      op.operation !== i.action ||
      op.idempotency_key !== i.key ||
      op.security_version !== (i.accountId ? i.securityVersion : null) ||
      !equalDigest(
        op.fingerprint,
        fingerprint(this.fingerprintKeys, op.key_version, i.action, { target: i.target, payload: i.payload })
      )
    )
      reject('IDENTITY_IDEMPOTENCY_CONFLICT');
  }
  async prepare(i) {
    this.validate(i);
    return this.transact(async (r, tx) => {
      const { context } = await this.guard(r, tx, i, 'prepare');
      await r.lockKey(i);
      let op = await r.findByKey(i);
      const now = this.assertCurrent(context.expires_at);
      if (op) this.match(op, i);
      else
        op = await r.insertOperation({
          ...i,
          id: randomUUID(),
          now,
          expiresAt: new Date(Math.min(context.expires_at.getTime(), now.getTime() + 300000)),
          keyVersion: this.fingerprintKeys.current,
          fingerprint: fingerprint(this.fingerprintKeys, this.fingerprintKeys.current, i.action, {
            target: i.target,
            payload: i.payload,
          }),
        });
      if (op.status !== 'pending' || op.expires_at <= now || op.receipt_issuances >= 3)
        reject('IDENTITY_PREPARATION_UNAVAILABLE');
      const secret = newSecret();
      await r.issueReceipt({
        id: randomUUID(),
        operationId: op.id,
        contextId: i.contextId,
        browserDigest: i.browserDigest,
        digest: receiptDigest(this.receiptKeys, this.receiptKeys.current, secret),
        keyVersion: this.receiptKeys.current,
        now,
        expiresAt: op.expires_at,
      });
      this.assertCurrent(context.expires_at, op.expires_at);
      return { operationId: op.id, receiptSecret: secret, expiresAt: op.expires_at };
    });
  }
  async commit(i) {
    this.validate(i);
    if (!opaque(i.operationId)) reject();
    return this.transact(async (r, tx) => {
      const { context } = await this.guard(r, tx, i, 'commit');
      const op = await r.operation(i.operationId);
      this.match(op, i);
      const now = this.assertCurrent(context.expires_at, op.expires_at);
      if (op.status !== 'pending' || op.expires_at <= now) reject('IDENTITY_OPERATION_UNAVAILABLE');
      if (i.action === 'social_login' || (await r.socialForOperation(op.id)))
        reject('IDENTITY_SOCIAL_CLAIM_REQUIRED');
      return this.apply(r, tx, op, i, [context.expires_at, op.expires_at]);
    });
  }
  async apply(r, tx, op, i, deadlines, extra) {
    this.assertCurrent(...deadlines);
    const result = await this.handlers[i.action]({
      input: i,
      identity: this.identityRepository.bind(tx),
      transaction: tx,
      operationId: op.id,
      extra,
    });
    const now = this.assertCurrent(...deadlines);
    if (
      !result ||
      Object.keys(result).some((k) => !['nextAction', 'accountId', 'audit', 'deliveries'].includes(k)) ||
      typeof result.nextAction !== 'string' ||
      !/^[a-z][a-z0-9_]{0,63}$/.test(result.nextAction) ||
      (result.accountId != null &&
        (!opaque(result.accountId) || (op.account_id && result.accountId !== op.account_id))) ||
      (result.deliveries && (!Array.isArray(result.deliveries) || result.deliveries.length > 2))
    )
      reject();
    await r.finish(op.id, result);
    await r.consumeContext(i.contextId);
    await this.auditService.recordSecurityEvent(
      {
        ...result.audit,
        eventId: op.id,
        outcome: 'succeeded',
        occurredAt: now.toISOString(),
        requestFingerprint: op.fingerprint,
      },
      {
        transaction: tx,
        actor: op.account_id ? { type: 'account', accountId: op.account_id } : { type: 'system-security' },
        peerAddress: i.peerAddress,
      }
    );
    for (const item of result.deliveries ?? []) {
      if (!this.deliveryService) reject('IDENTITY_DELIVERY_UNAVAILABLE');
      await this.deliveryService.enqueue(r, op, item);
    }
    this.assertCurrent(...deadlines);
    return outcome({ ...op, status: 'succeeded', next_action: result.nextAction });
  }
  async lookup({ operationId, browserDigest, receiptSecret }) {
    if (!opaque(operationId) || !digest(browserDigest)) reject('IDENTITY_RECEIPT_UNAVAILABLE');
    return this.transact(async (r) => {
      const row = await r.receipt(operationId),
        now = new Date(this.clock.now());
      if (
        !row ||
        row.browser_digest !== browserDigest ||
        row.expires_at <= now ||
        row.operation_expires_at <= now ||
        !equalDigest(row.digest, receiptDigest(this.receiptKeys, row.key_version, receiptSecret))
      )
        reject('IDENTITY_RECEIPT_UNAVAILABLE');
      return outcome({ ...row, id: operationId });
    });
  }
  // Called only by the future owning explicit-logout transaction after resolving
  // its context independently. Forced account-version revocation does not call it.
  invalidateReceipts(transaction, contextId) {
    return this.repository.bind(transaction).revokeReceipts(contextId, new Date(this.clock.now()));
  }

  async claimSocial(i) {
    this.validate(i);
    if (!opaque(i.exchangeId)) reject();
    return this.transact(async (r, tx) => {
      const { context } = await this.guard(r, tx, i, 'prepare');
      const op = await r.operation(i.operationId);
      this.match(op, i);
      const social = await r.social(i.exchangeId);
      const now = this.assertCurrent(context.expires_at, op.expires_at);
      if (
        !socialAction(social, i.action) ||
        social.operation_id !== op.id ||
        social.context_id !== i.contextId ||
        op.expires_at <= now
      )
        reject();
      if (social.status === 'interrupted') return { status: 'interrupted' };
      if (op.status !== 'pending') reject();
      if (social.status === 'exchange_claimed' && social.claim_expires_at <= now) {
        await r.finishSocial(social.id, 'interrupted');
        await r.interruptOperation(op.id);
        return { status: 'interrupted' };
      }
      if (social.expires_at <= now) {
        await r.finishSocial(social.id, 'interrupted');
        await r.interruptOperation(op.id);
        return { status: 'interrupted' };
      }
      if (social.status !== 'initiated')
        return { status: social.status === 'exchange_claimed' ? 'pending' : 'interrupted' };
      const claimed = await r.claimSocial(social.id, now);
      this.assertCurrent(context.expires_at, op.expires_at, claimed.expires_at, claimed.claim_expires_at);
      return { status: 'exchange_claimed', exchangeId: claimed.id, leaseExpiresAt: claimed.claim_expires_at };
    });
  }
  async completeSocial(i, claims) {
    this.validate(i);
    let finalizationStarted = false;
    try {
      return await this.transact(async (r, tx) => {
        const { context } = await this.guard(r, tx, i, 'commit');
        const op = await r.operation(i.operationId);
        this.match(op, i);
        const social = await r.social(i.exchangeId);
        const now = new Date(this.clock.now());
        if (
          !socialAction(social, i.action) ||
          social.operation_id !== op.id ||
          social.context_id !== i.contextId ||
          social.status !== 'exchange_claimed' ||
          social.claim_expires_at <= now ||
          social.expires_at <= now ||
          op.expires_at <= now ||
          op.status !== 'pending'
        )
          reject('IDENTITY_SOCIAL_UNAVAILABLE');
        finalizationStarted = true;
        const deadlines = [context.expires_at, op.expires_at, social.expires_at, social.claim_expires_at];
        const result = await this.apply(r, tx, op, i, deadlines, claims);
        await r.finishSocial(social.id, 'succeeded');
        this.assertCurrent(...deadlines);
        return result;
      });
    } catch (error) {
      // Provider success cannot be rolled back. Once finalization fails, discard
      // its transient proof rather than allowing a second completion attempt.
      // A process crash before this compensating write is covered by lease expiry.
      if (finalizationStarted)
        await this.repository
          .transaction(async (r) => {
            await r.lockScope(i, new Date(this.clock.now()));
            await r.operation(i.operationId);
            const social = await r.social(i.exchangeId);
            if (
              social?.operation_id === i.operationId &&
              social.context_id === i.contextId &&
              social.status === 'exchange_claimed'
            ) {
              await r.finishSocial(social.id, 'interrupted');
              await r.interruptOperation(i.operationId);
            }
          })
          .catch(() => {});
      throw error;
    }
  }
  // Trusted maintenance entry point, never request authorization. It accepts no
  // caller-supplied IDs/proofs and grants no access. Each bounded candidate is
  // re-read under account -> context -> operation -> exchange locks.
  async reconcileSocial() {
    const candidates = await this.transact((r) => r.expiredSocialCandidates(new Date(this.clock.now())));
    let interrupted = 0;
    for (const candidate of candidates) {
      interrupted += await this.transact(async (r) => {
        const { context } = await r.lockScope(
          { accountId: candidate.account_id, contextId: candidate.context_id },
          new Date(this.clock.now())
        );
        const op = await r.operation(candidate.operation_id);
        const social = await r.social(candidate.id);
        const now = new Date(this.clock.now());
        if (
          !social ||
          !['initiated', 'exchange_claimed'].includes(social.status) ||
          !op ||
          !context ||
          social.operation_id !== op.id ||
          social.context_id !== context.id
        )
          return 0;
        if (
          social.expires_at > now &&
          op.expires_at > now &&
          context.expires_at > now &&
          (social.status !== 'exchange_claimed' || social.claim_expires_at > now)
        )
          return 0;
        await r.finishSocial(social.id, 'interrupted');
        await r.interruptOperation(op.id);
        return 1;
      });
    }
    return { interrupted };
  }
}
