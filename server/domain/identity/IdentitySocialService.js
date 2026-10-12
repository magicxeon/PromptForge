import { randomUUID } from 'node:crypto';
import { identityRuntimeQualified } from '../../config/identityRuntime.js';
import { authFail, authRing, tokenDigest, tokenDigests } from './IdentityContextService.js';
import { newSecret, separatedKeys, sealDelivery, openDelivery, equalDigest } from './identitySecrets.js';
import { IdentityOperationService } from './IdentityOperationService.js';
import { normalizeIdentityEmail } from './identityEmail.js';

const fail = () => authFail('auth_social_unavailable');
export class IdentitySocialService {
  constructor({
    repository,
    operationRepository,
    identityRepository,
    contexts,
    sessions,
    actions,
    enrollment,
    adapter,
    stateKeys,
    protectedKeys,
    fingerprintKeys,
    receiptKeys,
    fixtureOnly = false,
    runtime,
    provider = 'google',
  }) {
    if (!['google', 'facebook'].includes(provider) || repository.provider !== provider || adapter.provider !== provider || adapter.issuer !== repository.issuer) fail();
    this.provider = provider;
    [stateKeys, protectedKeys].forEach(authRing);
    separatedKeys([
      stateKeys,
      protectedKeys,
      fingerprintKeys,
      receiptKeys,
      contexts.browserKeys,
      contexts.csrfKeys,
      contexts.metadataKeys,
      sessions.sessionKeys,
    ]);
    Object.assign(this, {
      repository,
      operationRepository,
      contexts,
      sessions,
      actions,
      enrollment,
      adapter,
      stateKeys,
      protectedKeys,
      fixtureOnly,
      runtime,
    });
    this.available = false;
    this.verified = new WeakSet();
    this.results = new WeakMap();
    this.preparing = new Set();
    this.operations = new IdentityOperationService({
      repository: operationRepository,
      identityRepository,
      auditService: sessions.auditService,
      fingerprintKeys,
      receiptKeys,
      clock: contexts.clock,
      verifyProof: (p) => this.verifyOperation(p),
      handlers: { social_login: (p) => this.finish(p) },
    });
  }
  qualify() {
    if (!this.fixtureOnly && !identityRuntimeQualified(this.runtime, this.provider) || !this.adapter || !this.enrollment) authFail('auth_service_unavailable');
    this.adapter.qualify();
  }
  material(row) {
    return {
      id: row.id,
      operationId: row.operation_id,
      purpose: `${this.provider}_exchange`,
      keyVersion: row.protection_key_version,
      expiresAt: row.expires_at,
      protectedPayload: row.protected_verifier,
    };
  }
  input(row, proofs) {
    return {
      action: 'social_login',
      accountId: row.account_id,
      securityVersion: row.security_version,
      contextId: row.context_id,
      target: row.id,
      key: row.idempotency_key,
      payload: { provider: this.provider, issuer: this.repository.issuer, intent: row.intent },
      browserDigest: row.browser_digest,
      proof: proofs,
      operationId: row.operation_id,
      exchangeId: row.id,
      peerAddress: this.sessions.auditPeer(),
    };
  }
  async verifyOperation({ context, target, proof, payload, transaction }) {
    const bound = await this.contexts.readBound(proof, transaction);
    let sessionExpiry = Infinity;
    if (
      bound.row.id !== context.id ||
      payload.provider !== this.provider ||
      payload.issuer !== this.repository.issuer ||
      !['login', 'reauthentication'].includes(payload.intent) ||
      context.purpose !== payload.intent ||
      context.target_binding !== target
    )
      fail();
    if (!this.preparing.has(target)) {
      const exchange = await this.repository.bind(transaction).exchange(target);
      if (!exchange || exchange.context_id !== context.id) fail();
    }
    if (payload.intent === 'reauthentication') {
      const session = await this.sessions.resolveBound(transaction, proof.sessionProof);
      if (session.accountId !== context.account_id || session.securityVersion !== context.security_version)
        fail();
      const deadlines = await this.actions.repository.bind(transaction).sessionDeadlines(session.sessionId);
      this.contexts.fresh(deadlines.idle_expires_at, deadlines.absolute_expires_at);
      sessionExpiry = Math.min(+deadlines.idle_expires_at, +deadlines.absolute_expires_at);
    }
    return {
      authorized: true,
      expiresAt: new Date(Math.min(+context.expires_at, +bound.row.browser_expiry, sessionExpiry)),
    };
  }
  async start(proofs, input) {
    this.qualify();
    if (
      !input ||
      Object.keys(input).some((k) => !['intent', 'rememberDevice', 'returnPath'].includes(k)) ||
      !['login', 'reauthentication'].includes(input.intent) ||
      (input.intent === 'reauthentication' && Object.keys(input).length !== 1) ||
      (input.intent === 'login' && proofs.sessionProof)
    )
      fail();
    const state = newSecret(),
      nonce = newSecret(),
      verifier = newSecret(),
      id = randomUUID();
    const authorizationUrl = this.adapter.authorization({ state, nonce, verifier });
    return this.repository.transaction(async (r, tx) => {
      let original;
      if (input.intent === 'reauthentication') {
        if (!this.actions) fail();
        original = await this.actions.scope(tx, proofs);
        if (original.context.purpose !== 'reauthentication' || original.typed.assurance_proof_ref) fail();
      }
      const flow = await this.contexts.issueResolved(
        {
          browserProof: proofs.browserProof,
          binding: {
            purpose: input.intent,
            provider: this.provider,
            targetId: id,
            accountId: original?.account.id ?? null,
            securityVersion: original?.account.security_version ?? null,
            canonicalEmail: null,
            deliveryEmail: null,
            rememberDevice: input.rememberDevice ?? false,
            returnPath: input.returnPath ?? '/',
          },
        },
        tx,
        original?.context.expires_at
      );
      const bound = await this.contexts.readBound({ ...proofs, contextProof: flow.contextProof }, tx);
      const row = {
        id,
        intent: input.intent,
        context_id: flow.contextId,
        account_id: bound.row.account_id,
        security_version: bound.row.security_version,
        idempotency_key: newSecret(),
        browser_digest: bound.row.browser_digest,
      };
      let prepared;
      this.preparing.add(id);
      try {
        prepared = await this.operations.prepare(
          this.input(row, { ...proofs, contextProof: flow.contextProof }), tx
        );
      } finally {
        this.preparing.delete(id);
      }
      row.operation_id = prepared.operationId;
      row.expires_at = prepared.expiresAt;
      row.key_version = this.stateKeys.current;
      row.protection_key_version = this.protectedKeys.current;
      await r.insert({
        id,
        contextId: flow.contextId,
        operationId: row.operation_id,
        intent: row.intent,
        accountId: row.account_id,
        securityVersion: row.security_version,
        digest: tokenDigest(this.stateKeys, `${this.provider}-state`, state),
        keyVersion: row.key_version,
        protectedVerifier: sealDelivery(this.protectedKeys, this.material(row), {
          verifier,
          nonce,
          originalContextProof: original ? proofs.contextProof : null,
        }),
        nonceDigest: tokenDigest(this.stateKeys, `${this.provider}-nonce`, nonce),
        now: this.contexts.now(),
        expiresAt: row.expires_at,
        originalContextId: original?.context.id,
        originalSessionId: original?.session.sessionId,
        returnPath: bound.metadata.returnPath,
        protectionKeyVersion: row.protection_key_version,
      });
      this.contexts.fresh(flow.expiresAt);
      return {
        body: {
          contractVersion: 1,
          authorizationUrl,
          operationId: row.operation_id,
          expiresAt: row.expires_at,
        },
        flow,
        ...prepared,
      };
    });
  }
  async callback(proofs, input) {
    this.qualify();
    if (
      !input ||
      Object.keys(input).some((k) => !['state', 'code', 'error'].includes(k)) ||
      typeof input.state !== 'string' ||
      (typeof input.code === 'string') === (typeof input.error === 'string') ||
      (input.error !== undefined && (input.error.length > 128 || !/^[a-z_]+$/.test(input.error)))
    )
      fail();
    const found = await this.repository.transaction((r) =>
      r.byState(tokenDigests(this.stateKeys, `${this.provider}-state`, input.state))
    );
    if (!found) fail();
    const row = await this.repository.transaction((r) => r.exchange(found.id));
    if (!row) fail();
    const bound = await this.contexts.readBound(proofs);
    if (bound.row.id !== row.context_id) fail();
    row.browser_digest = bound.row.browser_digest;
    const i = this.input(row, proofs),
      claim = await this.operations.claimSocial(i);
    if (claim.status !== 'exchange_claimed') fail();
    try {
      if (input.error) fail();
      const material = openDelivery(this.protectedKeys, this.material(row));
      if (
        !equalDigest(
          row.nonce_digest,
          tokenDigest(this.stateKeys, `${this.provider}-nonce`, material.nonce, row.key_version)
        )
      )
        fail();
      const claims = await this.adapter.exchange({
        code: input.code,
        verifier: material.verifier,
        nonce: material.nonce,
        expiresAt: new Date(Math.min(+claim.leaseExpiresAt, +row.expires_at)),
      });
      this.verified.add(claims);
      const extra = { claims, originalContextProof: material.originalContextProof };
      await this.operations.completeSocial(i, extra);
      const result = this.results.get(extra);
      this.results.delete(extra);
      if (!result) fail();
      return result;
    } catch {
      await this.repository.transaction(async (_, tx) => {
        const r = this.operationRepository.bind(tx);
        await r.lockScope(i, this.contexts.now());
        await r.operation(i.operationId);
        const current = await r.social(i.exchangeId);
        if (current?.status === 'exchange_claimed') {
          await r.finishSocial(current.id, 'interrupted');
          await r.interruptOperation(i.operationId);
        }
      });
      if (input.error) return { body: { contractVersion: 1, nextAction: 'fresh_sign_in_required' } };
      fail();
    }
  }
  async finish({ input, transaction, extra }) {
    const claims = extra?.claims;
    if (!this.verified.has(claims)) fail();
    this.verified.delete(claims);
    if (claims.provider !== this.provider || claims.issuer !== this.repository.issuer) fail();
    const r = this.repository.bind(transaction),
      cr = this.contexts.repository.bind(transaction);
    const row = await r.exchange(input.exchangeId),
      bound = await this.contexts.readBound(input.proof, transaction);
    let owner = await r.owner(claims.subject);
    if (owner) {
      const active = await cr.account(owner.id);
      await r.lockSubject(claims.subject);
      owner = await r.owner(claims.subject);
      if (
        !active ||
        active.status !== 'active' ||
        owner?.id !== active.id ||
        owner.security_version !== active.security_version
      )
        fail();
    } else {
      await r.lockSubject(claims.subject);
      if (await r.owner(claims.subject)) fail();
    }
    if (this.provider === 'facebook' && await r.revoked(claims.subject, row.created_at, this.contexts.now())) fail();
    this.contexts.fresh(row.expires_at, claims.expiresAt, bound.row.browser_expiry);
    await r.verified(row.id, claims, this.contexts.now());
    let result, nextAction;
    if (row.intent === 'reauthentication') {
      if (!owner || owner.id !== row.account_id || owner.security_version !== row.security_version) fail();
      const originalProofs = { ...input.proof, contextProof: extra.originalContextProof };
      const original = await this.actions.scope(transaction, originalProofs);
      if (
        original.context.id !== row.original_action_context_id ||
        original.session.sessionId !== row.original_session_id
      )
        fail();
      await r.target(row.id, original.context.id);
      const body = await this.actions.grant(originalProofs, row.id, transaction);
      nextAction = 'reauthenticated';
      result = {
        body,
        flow: {
          contextProof: extra.originalContextProof,
          contextId: original.context.id,
          expiresAt: original.context.expires_at,
        },
      };
    } else if (owner) {
      const email = await r.email(owner.id);
      if (!email) fail();
      const flow = await this.contexts.issueResolved(
        {
          browserProof: input.proof.browserProof,
          binding: {
            purpose: 'login',
            accountId: owner.id,
            securityVersion: owner.security_version,
            targetId: row.id,
            canonicalEmail: email.canonical_email,
            deliveryEmail: email.delivery_email,
            rememberDevice: bound.metadata.rememberDevice,
            returnPath: bound.metadata.returnPath,
          },
        },
        transaction,
        row.expires_at
      );
      await r.target(row.id, flow.contextId);
      const session = await this.sessions.finishVerifiedAuthentication(transaction, {
        ...flowProof(flow, input.proof),
        proofRef: row.id,
      });
      nextAction = 'authenticated';
      result = { body: { contractVersion: 1, nextAction, returnPath: bound.metadata.returnPath }, session };
    } else if (claims.email) {
      const er = this.enrollment.repository.bind(transaction);
      await er.lockEmail(claims.email.canonicalEmail);
      if (await er.emailOwner(claims.email.canonicalEmail)) {
        nextAction = 'sign_in_existing';
        result = { body: { contractVersion: 1, nextAction } };
      } else {
        const flow = await this.contexts.issue(
          {
            browserProof: input.proof.browserProof,
            proposal: {
              purpose: 'registration',
              email: claims.email.canonicalEmail,
              rememberDevice: bound.metadata.rememberDevice,
              returnPath: bound.metadata.returnPath,
            },
          },
          transaction,
          row.expires_at
        );
        await r.target(row.id, flow.contextId);
        await r.enrollmentProof({
          contextId: flow.contextId,
          exchangeId: row.id,
          now: this.contexts.now(),
          expiresAt: flow.expiresAt,
        });
        nextAction = 'complete_registration';
        result = { body: { contractVersion: 1, nextAction, contextId: flow.contextId }, flow };
      }
    } else {
      nextAction = 'verify_email';
      result = { body: { contractVersion: 1, nextAction } };
    }
    await r.finish(row.id, nextAction, result.session?.sessionId ?? null);
    this.contexts.fresh(row.expires_at, claims.expiresAt, bound.row.browser_expiry);
    this.results.set(extra, result);
    return {
      nextAction,
      accountId: owner?.id ?? null,
      audit: {
        action: row.intent === 'reauthentication' ? 'reauthentication' : 'social_login',
        ...(row.account_id ? { targetAccountId: row.account_id } : {}),
        targetFingerprint: tokenDigest(this.stateKeys, 'social-audit', row.id),
        metadata: { provider: this.provider },
      },
    };
  }
  async restricted(proofs, transaction) {
    const cr = this.contexts.repository.bind(transaction),
      r = this.repository.bind(transaction);
    let row;
    if (proofs.contextProof) {
      const context = await cr.snapshot(
        tokenDigests(this.contexts.browserKeys, 'purpose-context', proofs.contextProof)
      );
      if (
        !context ||
        !['pending', 'consumed'].includes(context.status) ||
        context.browser_status !== 'active' ||
        context.generation !== context.current_generation ||
        context.browser_digest !== context.current_browser_digest ||
        !tokenDigests(this.contexts.browserKeys, 'browser', proofs.browserProof).includes(
          context.current_browser_digest
        )
      )
        fail();
      this.contexts.fresh(context.expires_at, context.metadata_expiry, context.browser_expiry);
      const ref = await r.byContext(context.id);
      row = ref && (await r.exchange(ref.exchange_id));
      if (!row) fail();
    } else if (proofs.sessionProof) {
      const session = await this.sessions.resolveBound(transaction, proofs.sessionProof),
        ref = await r.bySession(session.sessionId);
      row = ref && (await r.exchange(ref.exchange_id));
      const browser = await this.contexts.browser(proofs.browserProof, { transaction });
      if (!row || row.result_session_id !== session.sessionId || browser.status !== 'active') fail();
      // The resulting session was issued from this exact child/browser context.
      const child = await cr.context(row.target_context_id);
      const snapshot = await cr.snapshot([child.digest]);
      if (!snapshot || snapshot.browser_id !== browser.id) fail();
    } else fail();
    this.contexts.fresh(row.expires_at);
    if (this.provider === 'facebook' && await r.revoked(row.subject, row.created_at, this.contexts.now())) fail();
    return row;
  }
  async result(proofs) {
    this.qualify();
    return this.repository.transaction(async (_, tx) => {
      const row = await this.restricted(proofs, tx);
      const nextAction = row.status === 'succeeded' ? row.next_action : 'fresh_sign_in_required';
      const cr = this.contexts.repository.bind(tx);
      const original = await cr.context(row.context_id);
      const metadata = this.contexts.open(await cr.snapshot([original.digest]));
      return {
        contractVersion: 1,
        nextAction,
        returnPath: row.return_path,
        rememberDevice: metadata.rememberDevice,
        ...(row.target_context_id && !row.result_session_id ? { contextId: row.target_context_id } : {}),
      };
    });
  }
  async email(proofs, email) {
    this.qualify();
    const normalized = normalizeIdentityEmail(email);
    return this.repository.transaction(async (r, tx) => {
      let row = await this.restricted(proofs, tx);
      await this.contexts.repository.bind(tx).context(row.context_id);
      await this.operationRepository.bind(tx).social(row.id);
      row = await r.exchange(row.id);
      if (
        row.status !== 'succeeded' ||
        row.intent !== 'login' ||
        row.next_action !== 'verify_email' ||
        row.target_context_id ||
        !row.subject ||
        row.email_authoritative
      )
        fail();
      const original = await this.contexts.repository
        .bind(tx)
        .snapshot(tokenDigests(this.contexts.browserKeys, 'purpose-context', proofs.contextProof));
      const metadata = this.contexts.open(original);
      const flow = await this.contexts.issue(
        {
          browserProof: proofs.browserProof,
          proposal: {
            purpose: 'registration',
            email: normalized.canonicalEmail,
            rememberDevice: metadata.rememberDevice,
            returnPath: metadata.returnPath,
          },
        },
        tx,
        row.expires_at
      );
      await r.target(row.id, flow.contextId);
      this.contexts.fresh(row.expires_at);
      return { flow, email: normalized.canonicalEmail };
    });
  }
  async enrollmentSource(contextId, transaction) {
    const r = this.repository.bind(transaction),
      ref = await r.byContext(contextId);
    if (!ref) return null;
    const row = await r.exchange(ref.exchange_id);
    if (
      !row ||
      row.target_context_id !== contextId ||
      row.intent !== 'login' ||
      row.status !== 'succeeded' ||
      !row.subject
    )
      fail();
    this.contexts.fresh(row.expires_at);
    return row;
  }
  async bindEnrollment(transaction, contextId, accountId) {
    const row = await this.enrollmentSource(contextId, transaction);
    if (!row) return;
    const r = this.repository.bind(transaction);
    await r.lockSubject(row.subject);
    if (await r.owner(row.subject)) fail();
    if (this.provider === 'facebook' && await r.revoked(row.subject, row.created_at, this.contexts.now())) fail();
    this.contexts.fresh(row.expires_at);
    await r.linkNewAccount({
      id: randomUUID(),
      accountId,
      subject: row.subject,
      issuer: row.issuer,
      now: this.contexts.now(),
    });
    this.contexts.fresh(row.expires_at);
  }
  async lockEnrollment(transaction, contextId) {
    const row = await this.enrollmentSource(contextId, transaction);
    if (!row) return;
    const r = this.repository.bind(transaction);
    await r.lockSubject(row.subject);
    if (await r.owner(row.subject)) fail();
    if (this.provider === 'facebook' && await r.revoked(row.subject, row.created_at, this.contexts.now())) fail();
    this.contexts.fresh(row.expires_at);
  }
  async verifyAuthentication({ transaction, proofRef, context }) {
    return this.verifyDurable(transaction, proofRef, context);
  }
  async verifyMethod({ transaction, proofRef, context, metadata, session }) {
    const proof = await this.verifyDurable(transaction, proofRef, context);
    const row = await this.repository.bind(transaction).exchange(proofRef);
    if (
      row.intent !== 'reauthentication' ||
      row.original_action_context_id !== context.id ||
      row.original_session_id !== session.sessionId
    )
      fail();
    return {
      ...proof,
      action: metadata.action.name,
      target: metadata.action.target,
      verifiedAt: row.verified_at,
      expiresAt: row.expires_at,
    };
  }
  async verifyDurable(transaction, id, context) {
    const r = this.repository.bind(transaction),
      row = await r.exchange(id),
      current = await r.currentTransaction();
    if (
      !row ||
      row.status !== 'exchange_claimed' ||
      row.verification_transaction !== current.id ||
      row.consumed_at ||
      row.target_context_id !== context.id ||
      !row.subject ||
      !['login', 'reauthentication'].includes(context.purpose)
    )
      fail();
    const owner = await r.owner(row.subject);
    if (
      owner?.id !== context.account_id ||
      owner.status !== 'active' ||
      owner.security_version !== context.security_version
    )
      fail();
    this.contexts.fresh(row.expires_at, row.claim_expires_at, context.expires_at);
    if (!(await r.consume(id, this.contexts.now()))) fail();
    return {
      proofRef: id,
      contextId: context.id,
      accountId: owner.id,
      securityVersion: owner.security_version,
      method: this.provider,
      assurance: 'single_factor',
    };
  }
}
const flowProof = (flow, proofs) => ({ contextProof: flow.contextProof, browserProof: proofs.browserProof });
