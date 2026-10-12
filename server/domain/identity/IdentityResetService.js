import { randomUUID } from 'node:crypto';
import { identityRuntimeQualified } from '../../config/identityRuntime.js';
import { authFail, tokenDigest } from './IdentityContextService.js';
import { normalizeIdentityEmail } from './identityEmail.js';
import { opaque } from './identitySecrets.js';
const deny = () => authFail('auth_action_unavailable');
export class IdentityResetService {
  #preparedHashes = new WeakMap();
  constructor({ repository, contexts, actions, operations, passwordAdapter, fixtureOnly = false, runtime }) {
    Object.assign(this, { repository, contexts, actions, operations, passwordAdapter, fixtureOnly, runtime });
    this.available = false;
  }
  qualify() {
    if (this.fixtureOnly !== true && !identityRuntimeQualified(this.runtime, 'password') || typeof this.passwordAdapter?.hash !== 'function')
      authFail('auth_service_unavailable');
  }
  eligible(row) {
    return (
      row?.status === 'active' &&
      row.email_status === 'active' &&
      row.verified_at &&
      row.recovery_enabled === true &&
      row.algorithm === 'argon2id' &&
      row.password_version === 1 &&
      typeof row.protected_hash === 'string'
    );
  }
  async resolveTarget(proposal) {
    this.qualify();
    if (proposal?.purpose !== 'password_reset') deny();
    const email = normalizeIdentityEmail(proposal.email),
      row = await this.repository.credential(email.canonicalEmail),
      active = this.eligible(row);
    return {
      purpose: 'password_reset',
      targetId: active ? row.id : randomUUID(),
      accountId: active ? row.id : null,
      securityVersion: active ? row.security_version : null,
      ...email,
      rememberDevice: false,
      returnPath: '/',
      ...(active ? { action: { name: 'password_reset', target: row.id, sessionId: null } } : {}),
    };
  }
  async verifyMethod({ transaction, proofRef, context, metadata }) {
    this.qualify();
    const r = this.repository.bind(transaction),
      source = await r.source(proofRef),
      current = await r.credential(metadata.canonicalEmail);
    if (
      !source ||
      context.purpose !== 'password_reset' ||
      metadata.action?.name !== 'password_reset' ||
      metadata.action.target !== context.account_id ||
      metadata.action.sessionId !== null ||
      source.purpose !== 'password_reset' ||
      source.context_id !== context.id ||
      source.account_id !== context.account_id ||
      source.security_version !== context.security_version ||
      source.target_id !== context.target_binding ||
      source.status !== 'consumed' ||
      source.delivery_status !== 'sent' ||
      !this.eligible(current) ||
      current.id !== context.account_id ||
      current.security_version !== context.security_version
    )
      deny();
    this.contexts.fresh(context.expires_at, context.browser_expiry, source.expires_at);
    return {
      proofRef,
      contextId: context.id,
      accountId: current.id,
      securityVersion: current.security_version,
      action: 'password_reset',
      target: current.id,
      method: 'email_otp',
      assurance: 'single_factor',
      verifiedAt: this.contexts.now(),
      expiresAt: new Date(Math.min(+source.expires_at, +context.expires_at, +context.browser_expiry)),
      mfaQualified: false,
    };
  }
  async recordVerification({ binding, challengeId, transaction, proofs }) {
    this.qualify();
    const { row: context } = await this.contexts.readBound(proofs, transaction);
    if (
      binding.purpose !== 'password_reset' ||
      binding.contextId !== context.id ||
      binding.browserDigest !== context.browser_digest
    )
      deny();
    if (context.account_id === null) return { nextAction: 'unavailable' };
    await this.actions.grant(proofs, challengeId, transaction);
    return { nextAction: 'reset_password', contextId: context.id };
  }
  validatePayload(input) {
    if (
      !input ||
      Object.keys(input).some((k) => !['password', 'passwordConfirmation'].includes(k)) ||
      typeof input.password !== 'string' ||
      input.password !== input.passwordConfirmation
    )
      authFail('auth_password_policy');
  }
  async inspect(proofs) {
    this.qualify();
    return this.repository.transaction(async (r, tx) => {
      const state = await this.actions.scope(tx, proofs);
      if (state.context.purpose !== 'password_reset' || state.metadata.action.name !== 'password_reset')
        deny();
      const current = await r.credential(state.metadata.canonicalEmail);
      if (
        !this.eligible(current) ||
        current.id !== state.account.id ||
        current.security_version !== state.account.security_version
      )
        deny();
      await this.actions.verifyOperation({
        stage: 'prepare',
        action: 'password_reset',
        target: current.id,
        context: state.context,
        account: state.account,
        browserDigest: state.context.browser_digest,
        proof: proofs,
        transaction: tx,
      });
      return {
        accountId: current.id,
        securityVersion: current.security_version,
        originalHash: current.protected_hash,
        contextId: state.context.id,
      };
    });
  }
  async hash(payload) {
    this.validatePayload(payload);
    try {
      return await this.passwordAdapter.hash(payload.password);
    } catch (error) {
      if (error?.code === 'IDENTITY_PASSWORD_POLICY_REJECTED') authFail('auth_password_policy');
      authFail('auth_service_unavailable');
    }
  }
  async prepare(proofs, payload, key) {
    this.validatePayload(payload);
    const scope = await this.inspect(proofs);
    await this.hash(payload);
    return this.actions.prepare(proofs, { action: 'password_reset', target: scope.accountId, payload, key });
  }
  async commit(proofs, input, key) {
    if (
      !input ||
      Object.keys(input).some((k) => !['operationId', 'password', 'passwordConfirmation'].includes(k)) ||
      !opaque(input.operationId)
    )
      deny();
    const payload = { password: input.password, passwordConfirmation: input.passwordConfirmation };
    this.validatePayload(payload);
    const scope = await this.inspect(proofs),
      passwordHash = await this.hash(payload);
    const operationInput = await this.actions.operationInput(proofs, {
      action: 'password_reset',
      target: scope.accountId,
      payload,
      key,
      operationId: input.operationId,
    });
    this.#preparedHashes.set(operationInput, { ...scope, passwordHash });
    try {
      return await this.operations.commit(operationInput);
    } finally {
      this.#preparedHashes.delete(operationInput);
    }
  }
  async mutate({ input, identity, transaction }) {
    const prepared = this.#preparedHashes.get(input);
    if (
      !prepared ||
      input.action !== 'password_reset' ||
      input.contextId !== prepared.contextId ||
      input.accountId !== prepared.accountId ||
      input.securityVersion !== prepared.securityVersion
    )
      deny();
    const { row: context, metadata } = await this.contexts.readBound(input.proof, transaction),
      r = this.repository.bind(transaction),
      current = await r.credential(metadata.canonicalEmail);
    if (
      context.purpose !== 'password_reset' ||
      !this.eligible(current) ||
      current.id !== prepared.accountId ||
      current.security_version !== prepared.securityVersion ||
      current.protected_hash !== prepared.originalHash
    )
      deny();
    this.contexts.fresh(context.expires_at, context.browser_expiry);
    await r.replace({ ...prepared, now: this.contexts.now() });
    await identity.advanceSecurityVersion({
      accountId: prepared.accountId,
      expectedSecurityVersion: prepared.securityVersion,
    });
    this.contexts.fresh(context.expires_at, context.browser_expiry);
    return {
      nextAction: 'sign_in',
      accountId: prepared.accountId,
      audit: {
        action: 'password_reset',
        targetAccountId: prepared.accountId,
        targetFingerprint: tokenDigest(
          this.operations.fingerprintKeys,
          'reset-audit-target',
          input.contextId
        ),
      },
      deliveries: [
        {
          purpose: 'security_notification',
          proofExpiresAt: context.expires_at,
          payload: { to: current.delivery_email, kind: 'password_changed' },
        },
      ],
    };
  }
}
