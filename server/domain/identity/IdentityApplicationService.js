import { authFail, tokenDigest } from './IdentityContextService.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { isIP } from 'node:net';
import { createHash } from 'node:crypto';
import { normalizeIdentityEmail } from './identityEmail.js';
export class IdentityApplicationService {
  constructor({
    contexts,
    sessions,
    cookies,
    publicPolicy,
    identityRepository,
    enrollment,
    challenges,
    primary,
    actions,
    reset,
    google,
    facebook,
  }) {
    if (!contexts || !sessions || !cookies || !publicPolicy) authFail('auth_service_unavailable');
    Object.assign(this, {
      contexts,
      sessions,
      cookies,
      publicPolicy,
      identityRepository,
      enrollment,
      challenges,
      primary,
      actions,
      reset,
      google,
      facebook,
    });
    this.actorProofs = new WeakMap();
    this.requestScope = new AsyncLocalStorage();
  }
  withRequestPeer(peerAddress, work) {
    if (typeof peerAddress !== 'string' || !isIP(peerAddress)) authFail('auth_service_unavailable');
    return this.requestScope.run(peerAddress, work);
  }
  requestPeer() {
    return this.requestScope.getStore();
  }
  actorProof(actor) {
    const proof = actor && this.actorProofs.get(actor);
    if (!proof) authFail();
    return proof;
  }
  async resolveActor(cookieHeader, requestId) {
    const proof = this.cookies.read(cookieHeader);
    if (!proof.session) return null;
    return this.sessions.repository.transaction(async (_, tx) => {
      const { session, account, roles } = await this.sessions.authorize(tx, proof.session);
      const actor = Object.freeze({
        userId: account.id,
        username: account.id,
        displayName: account.display_name,
        role: roles.includes('admin') ? 'admin' : roles.includes('support') ? 'support' : 'user',
        roles: Object.freeze([...roles]),
        accountStatus: account.status,
        securityVersion: account.security_version,
        activeCreatorProfileId: null,
        isMockActor: false,
        authProvider: session.method,
        requestId,
        originalRequesterUserId: null,
        authMode: 'session',
      });
      this.actorProofs.set(actor, {
        sessionSecret: proof.session,
        accountId: account.id,
      });
      return actor;
    });
  }
  async preferences(actor, input) {
    if (!this.identityRepository) authFail('auth_service_unavailable');
    const proof = this.actorProof(actor);
    if (
      input !== undefined &&
      (!input || Object.keys(input).length !== 1 || typeof input.confirmCreditUsage !== 'boolean')
    )
      authFail('auth_forbidden');
    return this.sessions.repository.transaction(async (_, tx) => {
      const { session, account } = await this.sessions.authorize(tx, proof.sessionSecret),
        r = this.identityRepository.bind(tx);
      const result =
        input === undefined
          ? await r.preferences(account.id)
          : await r.updatePreferences(account.id, input.confirmCreditUsage);
      this.contexts.fresh(session.idle_expires_at, session.absolute_expires_at);
      return result;
    });
  }
  async changeStatus(input, actor) {
    if (
      !this.identityRepository ||
      typeof this.sessions.auditService?.recordAccountStatusEvent !== 'function'
    )
      authFail('auth_service_unavailable');
    const proof = this.actorProof(actor),
      peerAddress = this.sessions.auditPeer();
    if (
      !input ||
      typeof input.userId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(input.userId) ||
      input.userId === proof.accountId ||
      !['active', 'suspended', 'disabled'].includes(input.status) ||
      typeof input.reason !== 'string' ||
      input.reason.trim().length < 3 ||
      Buffer.byteLength(input.reason) > 2048 ||
      typeof input.idempotencyKey !== 'string' ||
      !/^[A-Za-z0-9_-]{8,128}$/.test(input.idempotencyKey)
    )
      authFail('auth_forbidden');
    return this.sessions.repository.transaction(async (_, tx) => {
      const r = this.identityRepository.bind(tx),
        accounts = await r.lockAccounts([proof.accountId, input.userId]);
      const { session, account, roles } = await this.sessions.authorize(tx, proof.sessionSecret, {
        lockAccount: false,
      });
      if (!roles.includes('admin')) authFail('auth_forbidden');
      const target = accounts.find((a) => a.id === input.userId);
      if (!target) authFail('auth_forbidden');
      // Account closure has no approved reopening policy. The reversible Admin
      // status workflow cannot restore or otherwise mutate a closed account.
      if (target.status === 'closed') authFail('auth_forbidden');
      const id = createHash('sha256')
        .update(JSON.stringify(['identity-status-operation-v1', account.id, input.idempotencyKey]))
        .digest('hex');
      const prior = await r.statusOperation(id);
      const keyVersion = prior?.key_version ?? this.sessions.sessionKeys.current;
      const fingerprint = tokenDigest(
        this.sessions.sessionKeys,
        'status-payload',
        JSON.stringify([input.userId, input.status, input.expectedStatus ?? null, input.reason.trim()]),
        keyVersion
      );
      if (prior) {
        if (prior.fingerprint !== fingerprint) authFail('auth_forbidden');
        this.contexts.fresh(session.idle_expires_at, session.absolute_expires_at);
        return {
          user: {
            id: target.id,
            username: target.id,
            displayName: target.display_name,
            status: prior.status,
            securityVersion: prior.security_version,
          },
          duplicate: true,
          sessionHandling: 'sessions_revoked',
        };
      }
      if (input.expectedStatus && input.expectedStatus !== target.status) authFail('auth_forbidden');
      const changed = await r.advanceSecurityVersion({
          accountId: target.id,
          expectedSecurityVersion: target.security_version,
          status: input.status,
        }),
        now = this.sessions.now();
      await r.recordStatusOperation({
        id,
        actorId: account.id,
        targetId: target.id,
        fingerprint,
        keyVersion,
        previousStatus: target.status,
        status: changed.status,
        securityVersion: changed.securityVersion,
        now,
      });
      await this.sessions.auditService.recordAccountStatusEvent(
        {
          eventId: `status_${id}`,
          occurredAt: now.toISOString(),
          targetAccountId: target.id,
          previousStatus: target.status,
          status: changed.status,
          securityVersion: changed.securityVersion,
          reason: input.reason.trim(),
          operationKey: input.idempotencyKey,
        },
        {
          transaction: tx,
          actor: { type: 'account', accountId: account.id },
          peerAddress,
        }
      );
      this.contexts.fresh(session.idle_expires_at, session.absolute_expires_at);
      return {
        user: {
          id: target.id,
          username: target.id,
          displayName: changed.displayName,
          status: changed.status,
          securityVersion: changed.securityVersion,
        },
        duplicate: false,
        sessionHandling: 'sessions_revoked',
      };
    });
  }
  async config(cookieHeader) {
    const proof = this.cookies.read(cookieHeader),
      scope = await this.sessions.scope(proof.session),
      state = await this.contexts.bootstrap(proof.browser);
    const dto = this.publicPolicy.project();
    return {
      body: {
        ...dto,
        csrfToken: this.contexts.csrf(state.browser, scope, dto.authMode),
      },
      cookies: state.created
        ? [
            this.cookies.set(
              'browser',
              state.secret,
              Math.max(0, Math.floor((+state.browser.expires_at - this.contexts.clock.now()) / 1000))
            ),
          ]
        : [],
    };
  }
  actionProofs(proof) {
    return { contextProof: proof.flow, browserProof: proof.browser, sessionProof: proof.session };
  }
  async startGoogle(request, input) {
    return this.startSocial('google', request, input);
  }
  async startFacebook(request, input) { return this.startSocial('facebook', request, input); }
  async startSocial(provider, request, input) {
    const social = this[provider];
    if (!social) authFail('auth_service_unavailable');
    const proof = await this.unsafe(request),
      result = await social.start(this.actionProofs(proof), input);
    return {
      body: result.body,
      cookies: [
        this.flowCookie(result.flow),
        this.cookies.set(
          'receipt',
          result.receiptSecret,
          Math.max(0, Math.floor((+result.expiresAt - this.contexts.clock.now()) / 1000))
        ),
      ],
    };
  }
  flowCookie(flow) {
    return this.cookies.set(
      'flow',
      flow.contextProof,
      Math.max(0, Math.floor((+flow.expiresAt - this.contexts.clock.now()) / 1000))
    );
  }
  async callbackGoogle(cookieHeader, input) {
    return this.callbackSocial('google', cookieHeader, input);
  }
  async callbackFacebook(cookieHeader, input) { return this.callbackSocial('facebook', cookieHeader, input); }
  async callbackSocial(provider, cookieHeader, input) {
    const social = this[provider];
    if (!social) authFail('auth_service_unavailable');
    const proof = this.cookies.read(cookieHeader),
      result = await social.callback(this.actionProofs(proof), input);
    return {
      ...(result.session
        ? this.sessionResponse(result)
        : { cookies: result.flow ? [this.flowCookie(result.flow)] : [] }),
      redirect: `/auth/callback?provider=${provider}`,
    };
  }
  async googleResult(cookieHeader, query) {
    return this.socialResult('google', cookieHeader, query);
  }
  async facebookResult(cookieHeader, query) { return this.socialResult('facebook', cookieHeader, query); }
  async socialResult(provider, cookieHeader, query) {
    if (!this[provider] || Object.keys(query ?? {}).length) authFail('auth_forbidden');
    return { body: await this[provider].result(this.actionProofs(this.cookies.read(cookieHeader))) };
  }
  async googleEmail(request, input, key) {
    return this.socialEmail('google', request, input, key);
  }
  async facebookEmail(request, input, key) { return this.socialEmail('facebook', request, input, key); }
  async socialEmail(provider, request, input, key) {
    if (!this[provider] || !this.challenges) authFail('auth_service_unavailable');
    if (
      !input ||
      Object.keys(input).length !== 1 ||
      typeof input.email !== 'string' ||
      typeof key !== 'string' ||
      !/^[A-Za-z0-9_-]{16,128}$/.test(key)
    )
      authFail('auth_forbidden');
    const proof = await this.unsafe(request),
      result = await this[provider].email(this.actionProofs(proof), input.email);
    const challenge = await this.challenges.issue({
      contextProof: result.flow.contextProof,
      browserProof: proof.browser,
      key,
      purpose: 'registration',
      email: result.email,
      sourceAddress: this.requestPeer(),
    });
    return { body: { contractVersion: 1, ...challenge }, cookies: [this.flowCookie(result.flow)] };
  }
  async facebookEvent(kind, input) {
    if (!this.facebook?.events) authFail('auth_service_unavailable');
    if (!input || Object.keys(input).length !== 1 || typeof input.signed_request !== 'string') authFail('auth_forbidden');
    return { body: await this.facebook.events.receive(kind, input.signed_request) };
  }
  async facebookDeletionStatus(query) {
    if (!this.facebook?.events) authFail('auth_service_unavailable');
    return { body: await this.facebook.events.status(query) };
  }
  async createActionContext(request, input) {
    if (!this.actions) authFail('auth_service_unavailable');
    const proof = await this.unsafe(request),
      flow = await this.actions.issue(this.actionProofs(proof), input);
    return {
      body: { contractVersion: 1, contextId: flow.contextId, expiresAt: flow.expiresAt },
      cookies: [
        this.cookies.set(
          'flow',
          flow.contextProof,
          Math.max(0, Math.floor((+flow.expiresAt - this.contexts.clock.now()) / 1000))
        ),
      ],
    };
  }
  async grantActionAssurance(request, input) {
    if (!this.actions) authFail('auth_service_unavailable');
    if (!input || Object.keys(input).length !== 1 || typeof input.proofRef !== 'string')
      authFail('auth_forbidden');
    const proof = await this.unsafe(request);
    return { body: await this.actions.grant(this.actionProofs(proof), input.proofRef) };
  }
  async prepareOperation(request, input, key) {
    if (!this.actions) authFail('auth_service_unavailable');
    if (!input || Object.keys(input).some((k) => !['action', 'target', 'payload'].includes(k)))
      authFail('auth_forbidden');
    const proof = await this.unsafe(request);
    let result;
    if (input.action === 'password_reset') {
      if (!this.reset) authFail('auth_service_unavailable');
      if (Object.keys(input).some((k) => !['action', 'payload'].includes(k))) authFail('auth_forbidden');
      result = await this.reset.prepare(this.actionProofs(proof), input.payload, key);
    } else result = await this.actions.prepare(this.actionProofs(proof), { ...input, key });
    return {
      body: { contractVersion: 1, operationId: result.operationId, expiresAt: result.expiresAt },
      cookies: [
        this.cookies.set(
          'receipt',
          result.receiptSecret,
          Math.max(0, Math.floor((+result.expiresAt - this.contexts.clock.now()) / 1000))
        ),
      ],
    };
  }
  async resetPassword(request, input, key) {
    if (!this.reset) authFail('auth_service_unavailable');
    const proof = await this.unsafe(request),
      result = await this.reset.commit(this.actionProofs(proof), input, key);
    return {
      body: result,
      cookies: [
        `${this.cookies.names.flow}=; Path=/; HttpOnly; SameSite=Lax${this.cookies.secure ? '; Secure' : ''}; Max-Age=0`,
      ],
    };
  }
  async lookupOperation(cookieHeader, operationId) {
    if (!this.actions) authFail('auth_service_unavailable');
    const proof = this.cookies.read(cookieHeader);
    return { body: await this.actions.lookup(this.actionProofs(proof), operationId, proof.receipt) };
  }
  async issueChallenge(request, input, key) {
    if (!this.challenges) authFail('auth_service_unavailable');
    if (input?.purpose === 'password_reset') {
      if (!this.reset) authFail('auth_service_unavailable');
      this.reset.qualify();
    } else {
      if (!this.enrollment) authFail('auth_service_unavailable');
      this.enrollment.qualify();
    }
    if (
      !input ||
      Object.keys(input).some((k) => !['purpose', 'email', 'rememberDevice', 'returnPath'].includes(k)) ||
      !['registration', 'login', 'password_reset'].includes(input.purpose) ||
      (input.purpose === 'password_reset' &&
        Object.keys(input).some((k) => !['purpose', 'email'].includes(k))) ||
      typeof key !== 'string' ||
      !/^[A-Za-z0-9_-]{16,128}$/.test(key) ||
      (input.rememberDevice !== undefined && typeof input.rememberDevice !== 'boolean')
    )
      authFail('auth_forbidden');
    const proof = await this.unsafe(request);
    if (proof.session) authFail('auth_forbidden');
    const email = normalizeIdentityEmail(input.email);
    let flow;
    if (proof.flow) {
      try {
        const bound = await this.contexts.readBound({
          contextProof: proof.flow,
          browserProof: proof.browser,
        });
        if (
          bound.row.purpose === input.purpose &&
          bound.metadata.canonicalEmail === email.canonicalEmail &&
          bound.metadata.rememberDevice === (input.rememberDevice ?? false) &&
          bound.metadata.returnPath === (input.returnPath ?? '/')
        )
          flow = { contextId: bound.row.id, contextProof: proof.flow, expiresAt: bound.row.expires_at };
      } catch {}
    }
    flow ??= await this.contexts.issue({ browserProof: proof.browser, proposal: input });
    const challenge = await this.challenges.issue({
      contextProof: flow.contextProof,
      browserProof: proof.browser,
      key,
      purpose: input.purpose,
      email: email.canonicalEmail,
      sourceAddress: this.requestPeer(),
    });
    return {
      body: { contractVersion: 1, ...challenge },
      cookies: [
        this.cookies.set(
          'flow',
          flow.contextProof,
          Math.max(0, Math.floor((+flow.expiresAt - this.contexts.clock.now()) / 1000))
        ),
      ],
    };
  }
  async verifyChallenge(request, challengeId, input) {
    if (!this.challenges) authFail('auth_service_unavailable');
    if (!input || Object.keys(input).length !== 1 || typeof input.code !== 'string')
      authFail('auth_forbidden');
    const proof = await this.unsafe(request);
    if (proof.session) authFail('auth_forbidden');
    const bound = await this.contexts.readBound({ contextProof: proof.flow, browserProof: proof.browser });
    if (!['registration', 'login', 'password_reset'].includes(bound.row.purpose)) authFail('auth_forbidden');
    if (bound.row.purpose === 'password_reset') {
      if (!this.reset) authFail('auth_service_unavailable');
      this.reset.qualify();
    } else {
      if (!this.enrollment) authFail('auth_service_unavailable');
      this.enrollment.qualify();
    }
    const result = await this.challenges.verify({
      challengeId,
      code: input.code,
      purpose: bound.row.purpose,
      contextProof: proof.flow,
      browserProof: proof.browser,
      sourceAddress: this.requestPeer(),
    });
    if (result.session)
      return this.sessionResponse({
        session: result.session,
        body: { contractVersion: 1, nextAction: 'authenticated', returnPath: result.returnPath },
      });
    return {
      body: {
        contractVersion: 1,
        nextAction: result.nextAction,
        ...(result.contextId ? { contextId: result.contextId } : {}),
      },
    };
  }
  async enrollmentIntent(request, input) {
    if (!this.enrollment) authFail('auth_service_unavailable');
    if (!input || Object.keys(input).length) authFail('auth_forbidden');
    const proof = await this.unsafe(request);
    if (proof.session) authFail('auth_forbidden');
    const result = await this.enrollment.acceptIntent({
      contextProof: proof.flow,
      browserProof: proof.browser,
    });
    return {
      body: result.body,
      cookies: [
        result.flow
          ? this.cookies.set(
              'flow',
              result.flow.contextProof,
              Math.max(0, Math.floor((+result.flow.expiresAt - this.contexts.clock.now()) / 1000))
            )
          : `${this.cookies.names.flow}=; Path=/; HttpOnly; SameSite=Lax${this.cookies.secure ? '; Secure' : ''}; Max-Age=0`,
      ],
    };
  }
  async completeEnrollment(request, input) {
    if (!this.enrollment) authFail('auth_service_unavailable');
    const proof = await this.unsafe(request);
    if (proof.session) authFail('auth_forbidden');
    const result = await this.enrollment.complete(
      { contextProof: proof.flow, browserProof: proof.browser },
      input
    );
    if (!result.session)
      return {
        body: result.body,
        cookies: [
          `${this.cookies.names.flow}=; Path=/; HttpOnly; SameSite=Lax${this.cookies.secure ? '; Secure' : ''}; Max-Age=0`,
        ],
      };
    return this.sessionResponse(result);
  }
  async loginPassword(request, input) {
    if (!this.primary) authFail('auth_service_unavailable');
    if (
      !input ||
      Object.keys(input).some((k) => !['email', 'password', 'rememberDevice', 'returnPath'].includes(k)) ||
      (input.rememberDevice !== undefined && typeof input.rememberDevice !== 'boolean') ||
      (input.returnPath !== undefined &&
        (typeof input.returnPath !== 'string' || input.returnPath.length > 1024))
    )
      authFail('auth_forbidden');
    const proof = await this.unsafe(request);
    if (proof.session) authFail('auth_forbidden');
    const result = await this.primary.loginPassword(
      { browserProof: proof.browser, sourceAddress: this.requestPeer() },
      input
    );
    return this.sessionResponse(result);
  }
  sessionResponse(result) {
    const session = result.session;
    return {
      body: result.body,
      cookies: [
        this.cookies.set(
          'session',
          session.sessionSecret,
          session.remembered
            ? Math.max(0, Math.floor((+session.absoluteExpiresAt - this.contexts.clock.now()) / 1000))
            : undefined
        ),
        this.cookies.set('browser', session.browserSecret, 300),
        `${this.cookies.names.flow}=; Path=/; HttpOnly; SameSite=Lax${this.cookies.secure ? '; Secure' : ''}; Max-Age=0`,
      ],
    };
  }
  async unsafe({ cookieHeader, origin, csrfToken }, logout = false) {
    this.cookies.origin(origin);
    const proof = this.cookies.read(cookieHeader),
      sessionDigest = await this.sessions.scope(proof.session);
    await this.contexts.verifyCsrf({
      browserProof: proof.browser,
      sessionDigest,
      token: csrfToken,
      logout,
    });
    return proof;
  }
  async list({ cookieHeader, query = {} }) {
    const proof = this.cookies.read(cookieHeader);
    if (Object.keys(query).some((k) => !['limit', 'cursor'].includes(k))) authFail('auth_forbidden');
    return this.sessions.list(proof.session, {
      limit: query.limit === undefined ? 20 : Number(query.limit),
      cursor: query.cursor,
    });
  }
  async logout(request, { all = false } = {}) {
    const proof = await this.unsafe(request, !all);
    await this.sessions.revoke({
      sessionProof: proof.session,
      browserProof: proof.browser,
      all,
      logout: !all,
    });
    return { cookies: this.cookies.clear() };
  }
  async revoke(request, targetId) {
    if (typeof targetId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(targetId)) authFail('auth_forbidden');
    const proof = await this.unsafe(request);
    const current = await this.sessions.resolve(proof.session);
    await this.sessions.revoke({
      sessionProof: proof.session,
      browserProof: proof.browser,
      targetId,
    });
    return {
      cookies: current.sessionId === targetId ? this.cookies.clear() : [],
    };
  }
}
