import { authFail } from './IdentityContextService.js';
import { identityRuntimeQualified } from '../../config/identityRuntime.js';
import { opaque } from './identitySecrets.js';
const actions = new Set([
  'password_reset',
  'password_change',
  'email_change',
  'method_link',
  'method_unlink',
  'mfa_enroll',
  'mfa_disable',
  'logout_all',
]);
const deny = () => authFail('auth_action_unavailable');
export class IdentityActionService {
  constructor({ repository, contexts, sessions, operations, verifyMethod, fixtureOnly = false, runtime }) {
    Object.assign(this, { repository, contexts, sessions, operations, verifyMethod, fixtureOnly, runtime });
    this.available = false;
  }
  qualify() {
    if (this.fixtureOnly !== true && !identityRuntimeQualified(this.runtime) || typeof this.verifyMethod !== 'function')
      authFail('auth_service_unavailable');
  }
  async scope(tx, proofs) {
    const cr = this.contexts.repository.bind(tx),
      r = this.repository.bind(tx),
      initial = await this.contexts.readBound(proofs, tx);
    if (!initial.row.account_id) deny();
    const account = await cr.account(initial.row.account_id);
    await cr.context(initial.row.id);
    const { row: context, metadata } = await this.contexts.readBound(proofs, tx),
      typed = await r.metadata(context.id),
      a = metadata.action;
    if (
      !account ||
      account.status !== 'active' ||
      account.security_version !== context.security_version ||
      !a ||
      !actions.has(a.name) ||
      a.target !== context.target_binding ||
      typed.action_name !== a.name ||
      typed.action_target !== a.target ||
      typed.action_session_id !== a.sessionId
    )
      deny();
    let session, sessionDeadlines;
    if (a.name === 'password_reset') {
      if (
        context.purpose !== 'password_reset' ||
        a.sessionId !== null ||
        proofs.sessionProof ||
        !(await r.password(account.id))
      )
        deny();
    } else {
      if (context.purpose !== 'reauthentication' || !proofs.sessionProof) deny();
      session = await this.sessions.resolveBound(tx, proofs.sessionProof);
      if (
        session.sessionId !== a.sessionId ||
        session.accountId !== account.id ||
        session.securityVersion !== account.security_version
      )
        deny();
      sessionDeadlines = await r.sessionDeadlines(session.sessionId);
      this.contexts.fresh(sessionDeadlines.idle_expires_at, sessionDeadlines.absolute_expires_at);
    }
    this.contexts.fresh(context.expires_at, context.browser_expiry);
    return { context, metadata, typed, account, session, sessionDeadlines };
  }
  async lockBrowser(tx, state, proofs) {
    const cr = this.contexts.repository.bind(tx);
    await cr.lockBrowser(state.context.browser_id);
    await this.contexts.readBound(proofs, tx);
    this.fresh(state);
  }
  fresh(state, ...dates) {
    this.contexts.fresh(
      state.context.expires_at,
      state.context.browser_expiry,
      ...(state.sessionDeadlines
        ? [state.sessionDeadlines.idle_expires_at, state.sessionDeadlines.absolute_expires_at]
        : []),
      ...dates
    );
  }
  async issue(proofs, input) {
    this.qualify();
    if (
      !input ||
      Object.keys(input).some((k) => !['action', 'target'].includes(k)) ||
      !actions.has(input.action) ||
      input.action === 'password_reset' ||
      !opaque(input.target)
    )
      deny();
    return this.repository.transaction(async (_, tx) => {
      const session = await this.sessions.resolveBound(tx, proofs.sessionProof);
      const flow = await this.contexts.issue(
        {
          browserProof: proofs.browserProof,
          proposal: {
            purpose: 'reauthentication',
            action: input.action,
            target: input.target,
            actor: session,
          },
        },
        tx
      );
      const state = await this.scope(tx, { ...proofs, contextProof: flow.contextProof });
      if (state.metadata.action.name !== input.action || state.metadata.action.target !== input.target)
        deny();
      return flow;
    });
  }
  async grant(proofs, proofRef, transaction) {
    this.qualify();
    if (!opaque(proofRef)) deny();
    const work = async (r, tx) => {
      const state = await this.scope(tx, proofs),
        { context, metadata, account, session } = state;
      if (state.typed.assurance_proof_ref) deny();
      const proof = await this.verifyMethod({ transaction: tx, proofRef, context, metadata, session });
      const now = this.contexts.now();
      if (
        !proof ||
        Object.keys(proof).some(
          (k) =>
            ![
              'proofRef',
              'contextId',
              'accountId',
              'securityVersion',
              'action',
              'target',
              'method',
              'assurance',
              'verifiedAt',
              'expiresAt',
              'mfaQualified',
            ].includes(k)
        ) ||
        proof.proofRef !== proofRef ||
        proof.contextId !== context.id ||
        proof.accountId !== account.id ||
        proof.securityVersion !== account.security_version ||
        proof.action !== metadata.action.name ||
        proof.target !== metadata.action.target ||
        !['password', 'email_otp', 'google', 'facebook', 'mfa'].includes(proof.method) ||
        !['single_factor', 'mfa'].includes(proof.assurance) ||
        !(proof.verifiedAt instanceof Date) ||
        proof.verifiedAt > now ||
        proof.verifiedAt < context.created_at ||
        !(proof.expiresAt instanceof Date) ||
        +proof.expiresAt >
          Math.min(+context.expires_at, +context.browser_expiry, +proof.verifiedAt + 300000) ||
        (proof.assurance === 'mfa' && proof.mfaQualified !== true)
      )
        deny();
      if (await r.requiresMfa(account.id)) {
        if (proof.assurance !== 'mfa' || proof.mfaQualified !== true) deny();
      }
      await this.lockBrowser(tx, state, proofs);
      await r.metadata(context.id, true);
      this.fresh(state, proof.expiresAt);
      await r.grant(context.id, proof);
      await this.sessions.audit(tx, 'reauthentication', account.id, context.id, this.sessions.auditPeer(), {
        securityVersion: account.security_version,
      });
      this.fresh(state, proof.expiresAt);
      return {
        contractVersion: 1,
        nextAction: 'reauthenticated',
        contextId: context.id,
        expiresAt: proof.expiresAt,
      };
    };
    return transaction
      ? work(this.repository.bind(transaction), transaction)
      : this.repository.transaction(work);
  }
  async verifyOperation({ stage, action, target, context, account, browserDigest, proof, transaction }) {
    this.qualify();
    if (!['prepare', 'commit'].includes(stage)) deny();
    const state = await this.scope(transaction, proof),
      r = this.repository.bind(transaction);
    if (
      state.context.id !== context.id ||
      state.account.id !== account?.id ||
      state.context.browser_digest !== browserDigest ||
      state.metadata.action.name !== action ||
      state.metadata.action.target !== target
    )
      deny();
    await this.lockBrowser(transaction, state, proof);
    const row = await r.metadata(context.id, true);
    if (!row.assurance_proof_ref || row.assurance_consumed_at) deny();
    if ((await r.requiresMfa(account.id)) && row.assurance_level !== 'mfa') deny();
    this.fresh(state, row.assurance_expires_at);
    if (stage === 'commit') await r.consume(context.id, this.contexts.now());
    this.fresh(state, row.assurance_expires_at);
    return {
      authorized: true,
      expiresAt: new Date(
        Math.min(
          +row.assurance_expires_at,
          +state.context.browser_expiry,
          ...(state.sessionDeadlines
            ? [+state.sessionDeadlines.idle_expires_at, +state.sessionDeadlines.absolute_expires_at]
            : [])
        )
      ),
    };
  }
  async operationInput(proofs, input) {
    this.qualify();
    if (
      !input ||
      Object.keys(input).some((k) => !['action', 'target', 'payload', 'key', 'operationId'].includes(k)) ||
      !actions.has(input.action) ||
      !opaque(input.target)
    )
      deny();
    const { row, metadata } = await this.contexts.readBound(proofs);
    if (metadata.action?.name !== input.action || metadata.action?.target !== input.target) deny();
    return {
      ...input,
      contextId: row.id,
      accountId: row.account_id,
      securityVersion: row.security_version,
      browserDigest: row.browser_digest,
      proof: proofs,
      peerAddress: this.sessions.auditPeer(),
    };
  }
  async prepare(proofs, input) {
    return this.operations.prepare(await this.operationInput(proofs, input));
  }
  async commit(proofs, input) {
    return this.operations.commit(await this.operationInput(proofs, input));
  }
  async lookup(proofs, operationId, receiptSecret) {
    if (!opaque(operationId)) deny();
    try {
      return await this.repository.transaction(async (r, tx) => {
        let session, sessionDeadlines;
        if (!receiptSecret) {
          session = await this.sessions.resolveBound(tx, proofs.sessionProof);
          sessionDeadlines = await r.sessionDeadlines(session.sessionId);
        }
        const browser = await this.contexts.browser(proofs.browserProof, { transaction: tx });
        await this.contexts.repository.bind(tx).lockBrowser(browser.id);
        const current = await this.contexts.browser(proofs.browserProof, { transaction: tx }),
          op = await r.operation(operationId);
        if (
          !op ||
          op.browser_id !== current.id ||
          op.browser_digest !== current.digest ||
          op.generation !== current.generation
        )
          deny();
        let result;
        if (receiptSecret)
          result = await this.operations.lookup(
            { operationId, browserDigest: current.digest, receiptSecret },
            tx
          );
        else {
          if (
            op.account_id !== session.accountId ||
            op.security_version !== session.securityVersion ||
            op.action_session_id !== session.sessionId
          )
            deny();
          result = { contractVersion: 1, operationId, status: op.status, nextAction: op.next_action ?? null };
        }
        this.contexts.fresh(current.expires_at, op.expires_at);
        if (sessionDeadlines)
          this.contexts.fresh(sessionDeadlines.idle_expires_at, sessionDeadlines.absolute_expires_at);
        return result;
      });
    } catch {
      deny();
    }
  }
}
