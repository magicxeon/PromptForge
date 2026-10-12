import { randomUUID } from 'node:crypto';
import { identityRuntimeQualified } from '../../config/identityRuntime.js';
import { authFail } from './IdentityContextService.js';
import { normalizeIdentityEmail } from './identityEmail.js';

// Private collaborator of IdentityApplicationService. Runtime activation remains
// unavailable until real legal/mail/password-screening adapters are qualified.
export class IdentityEnrollmentService {
  constructor({ repository, contexts, sessions, passwordAdapter, legal, social, fixtureOnly = false, runtime }) {
    Object.assign(this, { repository, contexts, sessions, passwordAdapter, legal, fixtureOnly, runtime });
    this.legal = Object.freeze({ ...legal });
    this.available = false;
    this.social = social;
  }
  qualify() {
    if (
      this.fixtureOnly !== true && !identityRuntimeQualified(this.runtime) ||
      this.legal?.approved !== true ||
      !['termsVersion', 'privacyVersion'].every(
        (k) => typeof this.legal[k] === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(this.legal[k])
      )
    )
      authFail('auth_service_unavailable');
  }
  resolveTarget(proposal) {
    this.qualify();
    if (!proposal || proposal.purpose !== 'registration') authFail('auth_service_unavailable');
    const email = normalizeIdentityEmail(proposal.email);
    return {
      purpose: 'registration',
      targetId: randomUUID(),
      accountId: null,
      securityVersion: null,
      ...email,
      rememberDevice: proposal.rememberDevice ?? false,
      returnPath: proposal.returnPath ?? '/',
    };
  }
  async recordVerification({ binding, challengeId, transaction }) {
    this.qualify();
    const r = this.repository.bind(transaction),
      source = await r.source(challengeId);
    if (
      !source ||
      binding.accountId !== null ||
      binding.purpose !== 'registration' ||
      source.context_id !== binding.contextId ||
      source.context_account !== null ||
      source.context_purpose !== 'registration' ||
      source.context_status !== 'pending' ||
      source.status !== 'consumed' ||
      source.delivery_status !== 'sent' ||
      source.browser_digest !== binding.browserDigest ||
      source.target_id !== binding.targetId ||
      source.target_binding !== binding.targetId
    )
      authFail();
    this.contexts.fresh(source.expires_at, source.context_expiry);
    await r.recordProof({
      contextId: binding.contextId,
      challengeId,
      now: this.contexts.now(),
      expiresAt: new Date(Math.min(+source.expires_at, +source.context_expiry)),
      socialExchangeId: this.social
        ? (await this.social.enrollmentSource(binding.contextId, transaction))?.id
        : undefined,
    });
    this.contexts.fresh(source.expires_at, source.context_expiry);
    return { nextAction: 'complete_registration', contextId: binding.contextId };
  }
  async verifiedActivation({ transaction, context }) {
    this.qualify();
    const proof = await this.repository.bind(transaction).activation(context.id);
    if (!proof) authFail();
    this.contexts.fresh(proof.expires_at, context.expires_at);
    return {
      proofRef: proof.challenge_id ?? proof.social_exchange_id,
      contextId: context.id,
      accountId: proof.result_account_id,
      securityVersion: 1,
      method: proof.source_kind === 'social' ? 'google' : 'email_otp',
      assurance: 'single_factor',
    };
  }
  async acceptIntent(proofs) {
    this.qualify();
    const initial = await this.contexts.readBound(proofs);
    if (initial.row.purpose !== 'login' || initial.row.account_id !== null) authFail();
    return this.repository.transaction(async (r, tx) => {
      const cr = this.contexts.repository.bind(tx);
      await cr.context(initial.row.id);
      const { row: context, metadata } = await this.contexts.readBound(proofs, tx),
        offer = await r.offer(context.id);
      if (!offer || context.purpose !== 'login' || context.account_id !== null) authFail();
      const source = await r.source(offer.challenge_id);
      if (
        !source ||
        source.context_id !== context.id ||
        source.purpose !== 'login' ||
        source.account_id !== null ||
        source.status !== 'consumed' ||
        source.delivery_status !== 'sent' ||
        source.target_id !== context.target_binding ||
        source.browser_digest !== context.browser_digest
      )
        authFail();
      this.contexts.fresh(offer.expires_at, source.expires_at, context.expires_at, context.browser_expiry);
      await r.lockEmail(metadata.canonicalEmail);
      const existing = await r.emailOwner(metadata.canonicalEmail);
      this.contexts.fresh(offer.expires_at, source.expires_at, context.expires_at, context.browser_expiry);
      if (existing) {
        await r.recordExchange({
          sourceContextId: context.id,
          challengeId: source.id,
          targetContextId: null,
          outcome: 'handoff',
          expiresAt: offer.expires_at,
        });
        await cr.consume(context.id);
        this.contexts.fresh(offer.expires_at, context.browser_expiry);
        return { body: { contractVersion: 1, nextAction: 'sign_in_existing' } };
      }
      const flow = await this.contexts.issue(
        {
          browserProof: proofs.browserProof,
          proposal: {
            purpose: 'registration',
            email: metadata.canonicalEmail,
            rememberDevice: metadata.rememberDevice,
            returnPath: metadata.returnPath,
          },
        },
        tx,
        offer.expires_at
      );
      await r.recordExchange({
        sourceContextId: context.id,
        challengeId: source.id,
        targetContextId: flow.contextId,
        outcome: 'registration',
        expiresAt: offer.expires_at,
      });
      await cr.consume(context.id);
      await r.recordExchangeProof({
        contextId: flow.contextId,
        challengeId: source.id,
        now: this.contexts.now(),
        expiresAt: flow.expiresAt,
      });
      this.contexts.fresh(offer.expires_at, flow.expiresAt, context.browser_expiry);
      return {
        body: { contractVersion: 1, nextAction: 'complete_registration', contextId: flow.contextId },
        flow,
      };
    });
  }
  async complete(proofs, input) {
    this.qualify();
    if (
      !input ||
      Object.keys(input).some(
        (k) =>
          ![
            'displayName',
            'password',
            'passwordConfirmation',
            'termsVersion',
            'privacyVersion',
            'termsAccepted',
          ].includes(k)
      ) ||
      typeof input.displayName !== 'string' ||
      !input.displayName.trim() ||
      input.displayName.trim().length > 80 ||
      /[\x00-\x1f\x7f]/.test(input.displayName) ||
      input.termsAccepted !== true ||
      input.termsVersion !== this.legal.termsVersion ||
      input.privacyVersion !== this.legal.privacyVersion
    )
      authFail('auth_forbidden');
    if (
      (input.password !== undefined &&
        (typeof input.password !== 'string' || input.password !== input.passwordConfirmation)) ||
      (input.password === undefined && input.passwordConfirmation !== undefined)
    )
      authFail('auth_forbidden');
    const initial = await this.contexts.readBound(proofs);
    if (initial.row.purpose !== 'registration' || initial.row.account_id !== null) authFail();
    const initialProof = await this.repository.transaction((r) => r.proof(initial.row.id));
    if (!initialProof || initialProof.status !== 'verified') authFail();
    this.contexts.fresh(initialProof.expires_at, initial.row.expires_at, initial.row.browser_expiry);
    let passwordHash;
    if (input.password !== undefined) {
      if (!this.passwordAdapter) authFail('auth_service_unavailable');
      passwordHash = await this.passwordAdapter.hash(input.password);
    }
    const peerAddress = this.sessions.auditPeer();
    try {
      return await this.repository.transaction(async (r, tx) => {
        const cr = this.contexts.repository.bind(tx);
        await cr.context(initial.row.id);
        const { row: context, metadata } = await this.contexts.readBound(proofs, tx),
          proof = await r.proof(context.id);
        if (
          !proof ||
          proof.status !== 'verified' ||
          context.purpose !== 'registration' ||
          context.account_id !== null
        )
          authFail();
        const social =
          proof.source_kind === 'social' && this.social
            ? await this.social.enrollmentSource(context.id, tx)
            : null;
        const source = social ? null : await r.source(proof.challenge_id);
        const exchange = proof.source_kind === 'login_exchange' ? await r.exchange(context.id) : null;
        const sourceMatches = exchange
          ? exchange.challenge_id === proof.challenge_id &&
            exchange.source_context_id === source?.context_id &&
            exchange.outcome === 'registration' &&
            source?.context_status === 'consumed' &&
            source?.context_purpose === 'login' &&
            source?.context_account === null &&
            source?.purpose === 'login'
          : source?.context_id === context.id &&
            source?.target_id === context.target_binding &&
            source?.purpose === 'registration';
        if (social) {
          if (social.id !== proof.social_exchange_id || social.email_authoritative !== true) authFail();
        } else if (
          !source ||
          !sourceMatches ||
          source.status !== 'consumed' ||
          source.delivery_status !== 'sent' ||
          source.browser_digest !== context.browser_digest
        )
          authFail();
        this.contexts.fresh(
          proof.expires_at,
          (social ?? source).expires_at,
          context.expires_at,
          context.browser_expiry
        );
        if (this.social) await this.social.lockEnrollment(tx, context.id);
        await r.lockEmail(metadata.canonicalEmail);
        this.contexts.fresh(proof.expires_at, context.expires_at, context.browser_expiry);
        const existing = await r.emailOwner(metadata.canonicalEmail);
        this.contexts.fresh(proof.expires_at, context.expires_at, context.browser_expiry);
        if (existing) {
          await r.handoff(context.id);
          await cr.consume(context.id);
          this.contexts.fresh(proof.expires_at, context.browser_expiry);
          return { body: { contractVersion: 1, nextAction: 'sign_in_existing' } };
        }
        const accountId = randomUUID();
        await r.createAccount({
          accountId,
          contextId: context.id,
          displayName: input.displayName.trim(),
          ...metadata,
          passwordHash,
          termsVersion: this.legal.termsVersion,
          privacyVersion: this.legal.privacyVersion,
          now: this.contexts.now(),
        });
        if (this.social) await this.social.bindEnrollment(tx, context.id, accountId);
        await this.sessions.audit(tx, 'registration', accountId, context.id, peerAddress, {
          securityVersion: 1,
          provider: 'email',
        });
        const session = await this.sessions.finishVerifiedEnrollment(tx, proofs);
        this.contexts.fresh(proof.expires_at, context.expires_at, context.browser_expiry);
        return {
          body: { contractVersion: 1, nextAction: 'authenticated', returnPath: metadata.returnPath },
          session,
        };
      });
    } catch (error) {
      if (error?.code === '23505' && error.constraint === 'identity_email_bindings_canonical_email_key')
        return { body: { contractVersion: 1, nextAction: 'sign_in_existing' } };
      throw error;
    }
  }
}
