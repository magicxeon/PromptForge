import { randomBytes, randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { keyFor, separatedKeys, opaque } from './identitySecrets.js';
import { authFail, authRing, tokenDigest, tokenDigests } from './IdentityContextService.js';
import { sessionPolicy } from '../../config/authPolicy.js';
import { isIP } from 'node:net';
export class IdentitySessionService {
  constructor({
    repository,
    contexts,
    sessionKeys,
    verifyAuthentication,
    verifyEnrollment,
    operationRepository,
    deliveryService,
    auditService,
    peerProvider,
    staffBootstrapQualified = false,
    clock = Date,
    otherKeyrings = [],
  }) {
    authRing(sessionKeys);
    if (!repository || !contexts || typeof verifyAuthentication !== 'function')
      authFail('auth_service_unavailable');
    separatedKeys([
      sessionKeys,
      contexts.browserKeys,
      contexts.csrfKeys,
      contexts.metadataKeys,
      deliveryService?.keyring,
      deliveryService?.recipientKeys,
      ...otherKeyrings,
    ]);
    Object.assign(this, {
      repository,
      contexts,
      sessionKeys,
      verifyAuthentication,
      verifyEnrollment,
      operationRepository,
      deliveryService,
      auditService,
      peerProvider,
      staffBootstrapQualified,
      clock,
    });
  }
  now() {
    return new Date(this.clock.now());
  }
  auditPeer() {
    const peerAddress = this.peerProvider?.();
    if (
      !this.auditService ||
      typeof this.auditService.recordSecurityEvent !== 'function' ||
      typeof peerAddress !== 'string' ||
      !isIP(peerAddress)
    )
      authFail('auth_service_unavailable');
    return peerAddress;
  }
  async audit(transaction, action, accountId, target, peerAddress, metadata = {}) {
    const eventId = `${action}_${target}`;
    await this.auditService.recordSecurityEvent(
      {
        eventId,
        action,
        outcome: 'succeeded',
        occurredAt: this.now().toISOString(),
        requestFingerprint: tokenDigest(this.sessionKeys, 'audit-request', eventId),
        targetFingerprint: tokenDigest(this.sessionKeys, 'audit-target', target),
        ...(accountId ? { targetAccountId: accountId } : {}),
        metadata,
      },
      {
        transaction,
        actor: accountId ? { type: 'account', accountId } : { type: 'system-security' },
        peerAddress,
      }
    );
  }
  async authorize(transaction, secret, { lockAccount = true } = {}) {
    const r = this.repository.bind(transaction),
      digests = tokenDigests(this.sessionKeys, 'session', secret);
    let session = await r.lookup(digests);
    if (!session) authFail();
    const account = lockAccount
      ? await r.account(session.account_id)
      : await r.readAccount(session.account_id);
    session = await r.lookup(digests);
    if (!this.valid(session, account)) authFail();
    const roles = await r.roles(account.id);
    if (roles.some((role) => !['customer', 'admin', 'support'].includes(role))) authFail('auth_forbidden');
    const staff = roles.some((role) => ['admin', 'support'].includes(role));
    if (
      (staff && (!this.staffBootstrapQualified || session.assurance !== 'mfa')) ||
      ((await r.requiresMfa(account.id)) && session.assurance !== 'mfa')
    )
      authFail('auth_mfa_required');
    if (!this.valid(session, account)) authFail();
    return { session, account, roles };
  }
  valid(row, account) {
    const now = this.clock.now();
    return (
      !!row &&
      !row.revoked_at &&
      row.idle_duration_ms != null &&
      +row.idle_expires_at > now &&
      +row.absolute_expires_at > now &&
      (account?.status ?? row.account_status) === 'active' &&
      row.security_version === (account?.security_version ?? row.current_version)
    );
  }
  async scope(secret) {
    if (!secret) return 'anonymous';
    const digests = tokenDigests(this.sessionKeys, 'session', secret);
    return this.repository.transaction(async (r) => (await r.lookup(digests))?.digest ?? digests[0]);
  }
  async resolve(secret) {
    if (!secret) return null;
    return this.repository.transaction((_, tx) => this.resolveBound(tx, secret));
  }
  async resolveBound(transaction, secret) {
    const { session: row } = await this.authorize(transaction, secret);
    return {
      sessionId: row.id,
      accountId: row.account_id,
      securityVersion: row.security_version,
      method: row.method,
      assurance: row.assurance,
    };
  }
  async finishVerifiedAuthentication(transaction, input) {
    const peerAddress = this.auditPeer();
    if (
      !input ||
      !opaque(input.proofRef) ||
      Object.keys(input).some(
        (k) => !['proofRef', 'contextProof', 'browserProof', 'sessionProof', 'deviceLabel'].includes(k)
      )
    )
      authFail();
    const r = this.repository.bind(transaction),
      cr = this.contexts.repository.bind(transaction);
    let { row: context, metadata } = await this.contexts.readBound(input, transaction);
    // Anonymous enrollment needs the future owning activation adapter; an OTP
    // registration proof alone can never become an existing-account login.
    if (context.purpose !== 'login' || !context.account_id) authFail('auth_service_unavailable');
    const account = await r.account(context.account_id);
    if (!account || account.status !== 'active' || account.security_version !== context.security_version)
      authFail();
    await cr.context(context.id);
    ({ row: context, metadata } = await this.contexts.readBound(input, transaction));
    const proof = await this.verifyAuthentication({
      transaction,
      proofRef: input.proofRef,
      context,
      metadata,
    });
    if (
      !proof ||
      proof.proofRef !== input.proofRef ||
      proof.contextId !== context.id ||
      proof.accountId !== account.id ||
      proof.securityVersion !== account.security_version ||
      !['password', 'email_otp', 'google', 'facebook'].includes(proof.method) ||
      !['single_factor', 'mfa'].includes(proof.assurance)
    )
      authFail();
    return this.#issueVerifiedSession(transaction, { input, context, metadata, account, proof, peerAddress });
  }
  async finishVerifiedEnrollment(transaction, input) {
    if (
      typeof this.verifyEnrollment !== 'function' ||
      !input ||
      Object.keys(input).some((k) => !['contextProof', 'browserProof'].includes(k))
    )
      authFail('auth_service_unavailable');
    const peerAddress = this.auditPeer(),
      r = this.repository.bind(transaction);
    const { row: context, metadata } = await this.contexts.readBound(input, transaction);
    if (
      context.purpose !== 'registration' ||
      context.account_id !== null ||
      context.security_version !== null
    )
      authFail();
    const proof = await this.verifyEnrollment({ transaction, context, metadata });
    if (
      !proof ||
      proof.contextId !== context.id ||
      !opaque(proof.proofRef) ||
      !opaque(proof.accountId) ||
      proof.securityVersion !== 1 ||
      !['email_otp', 'google'].includes(proof.method) ||
      proof.assurance !== 'single_factor'
    )
      authFail();
    const account = await r.enrollmentAccount(context.id);
    if (
      !account ||
      account.id !== proof.accountId ||
      account.canonical_email !== metadata.canonicalEmail ||
      account.status !== 'active' ||
      account.security_version !== 1 ||
      (await r.roles(account.id)).some((role) => role !== 'customer') ||
      (await r.requiresMfa(account.id)) ||
      (await r.sessions(account.id, this.now(), 1)).length
    )
      authFail();
    this.contexts.fresh(context.expires_at, context.browser_expiry);
    return this.#issueVerifiedSession(transaction, {
      input: { ...input, proofRef: proof.proofRef },
      context,
      metadata,
      account,
      proof,
      peerAddress,
    });
  }
  async #issueVerifiedSession(transaction, { input, context, metadata, account, proof, peerAddress }) {
    const r = this.repository.bind(transaction),
      cr = this.contexts.repository.bind(transaction);
    const roles = await r.roles(account.id);
    if (roles.some((role) => !['customer', 'admin', 'support'].includes(role))) authFail('auth_forbidden');
    const staff = roles.some((role) => ['admin', 'support'].includes(role)),
      mfa = await r.requiresMfa(account.id);
    if (
      ((staff || mfa) && (proof.assurance !== 'mfa' || proof.mfaQualified !== true)) ||
      (staff && this.staffBootstrapQualified !== true)
    )
      authFail('auth_mfa_required');
    const browser = await cr.lockBrowser(context.browser_id);
    if (
      !browser ||
      browser.status !== 'active' ||
      browser.digest !== context.browser_digest ||
      browser.generation !== context.generation
    )
      authFail();
    this.contexts.fresh(context.expires_at, browser.expires_at);
    const sessions = await r.sessions(account.id, this.now(), account.security_version),
      old = input.sessionProof
        ? await r.lookup(tokenDigests(this.sessionKeys, 'session', input.sessionProof))
        : null;
    if (input.sessionProof && (!old || old.account_id !== account.id)) authFail();
    const remembered = !staff && metadata.rememberDevice === true,
      policy = staff ? sessionPolicy.staff : remembered ? sessionPolicy.remembered : sessionPolicy.customer;
    const revoked = old && !old.revoked_at ? [old.id] : [];
    const active = sessions
      .filter((row) => this.valid(row, account) && !revoked.includes(row.id))
      .sort((a, b) => +a.created_at - +b.created_at || a.id.localeCompare(b.id));
    while (active.length >= policy.cap) revoked.push(active.shift().id);
    if (revoked.length) {
      if (!this.operationRepository || !this.deliveryService) authFail('auth_service_unavailable');
      const target = await r.notificationTarget(account.id);
      if (!target) authFail('auth_service_unavailable');
      await r.revoke(revoked, this.now());
      for (const id of revoked)
        await this.audit(transaction, 'session_revoke', account.id, id, peerAddress, {
          securityVersion: account.security_version,
        });
      const opRepo = this.operationRepository.bind(transaction),
        opId = randomUUID(),
        now = this.now();
      const op = await opRepo.insertOperation({
        id: opId,
        accountId: account.id,
        contextId: context.id,
        securityVersion: account.security_version,
        action: 'session_rotation',
        key: opId,
        fingerprint: tokenDigest(this.sessionKeys, 'session-rotation', JSON.stringify(revoked)),
        keyVersion: this.sessionKeys.current,
        now,
        expiresAt: context.expires_at,
      });
      await opRepo.finish(opId, {
        nextAction: 'sign_in',
        accountId: account.id,
      });
      await this.deliveryService.enqueue(opRepo, op, {
        purpose: 'security_notification',
        proofExpiresAt: context.expires_at,
        payload: { to: target.delivery_email, kind: 'sessions_revoked' },
      });
    }
    this.contexts.fresh(context.expires_at, browser.expires_at);
    const now = this.now(),
      secret = randomBytes(32).toString('base64url'),
      browserSecret = randomBytes(32).toString('base64url');
    const i = {
      id: randomUUID(),
      accountId: account.id,
      digest: tokenDigest(this.sessionKeys, 'session', secret),
      keyVersion: this.sessionKeys.current,
      method: proof.method,
      assurance: proof.assurance,
      securityVersion: account.security_version,
      now,
      idleExpiresAt: new Date(+now + policy.idleMs),
      absoluteExpiresAt: new Date(+now + policy.absoluteMs),
      idleMs: policy.idleMs,
      remembered,
      deviceLabel: ['Desktop browser', 'Mobile browser', 'Tablet browser'].includes(input.deviceLabel)
        ? input.deviceLabel
        : 'Browser',
      contextId: context.id,
      proofDigest: tokenDigest(this.sessionKeys, 'authentication-proof', input.proofRef),
    };
    await r.insert(i);
    await cr.consume(context.id);
    await cr.rotateBrowser({
      id: browser.id,
      digest: tokenDigest(this.contexts.browserKeys, 'browser', browserSecret),
      keyVersion: this.contexts.browserKeys.current,
      now,
      expiresAt: new Date(+now + 300000),
    });
    await this.audit(transaction, 'session_create', account.id, i.id, peerAddress, {
      securityVersion: account.security_version,
      remembered,
    });
    this.contexts.fresh(context.expires_at, browser.expires_at);
    // This result is PRIVATE. The owning caller must await transaction commit
    // before writing cookies; never include it in the public challenge DTO.
    return {
      sessionId: i.id,
      sessionSecret: secret,
      browserSecret,
      remembered,
      absoluteExpiresAt: i.absoluteExpiresAt,
    };
  }
  cursor(owner, row) {
    const body = Buffer.from(
        JSON.stringify({
          owner,
          createdAt: row.created_at.toISOString(),
          id: row.id,
        })
      ).toString('base64url'),
      version = this.sessionKeys.current;
    return `${version}.${body}.${createHmac('sha256', keyFor(this.sessionKeys, version)).update(`session-cursor:${body}`).digest('base64url')}`;
  }
  decodeCursor(owner, value) {
    if (!value) return null;
    try {
      if (typeof value !== 'string' || value.length > 1024) authFail();
      const [v, b, m, ...rest] = value.split('.');
      if (rest.length) authFail();
      const mac = createHmac('sha256', keyFor(this.sessionKeys, Number(v)))
        .update(`session-cursor:${b}`)
        .digest('base64url');
      if (mac.length !== m.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(m))) authFail();
      const data = JSON.parse(Buffer.from(b, 'base64url'));
      if (
        data.owner !== owner ||
        !opaque(data.id) ||
        new Date(data.createdAt).toISOString() !== data.createdAt
      )
        authFail();
      return data;
    } catch {
      authFail('auth_forbidden');
    }
  }
  async list(secret, { limit = 20, cursor } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) authFail('auth_forbidden');
    return this.repository.transaction(async (r, tx) => {
      const { session, account } = await this.authorize(tx, secret);
      const rows = await r.list(account.id, this.decodeCursor(account.id, cursor), limit);
      if (!this.valid(session, account)) authFail();
      return {
        contractVersion: 1,
        sessions: rows.slice(0, limit).map((row) => ({
          id: row.id,
          deviceLabel: row.device_label,
          createdAt: row.created_at,
          lastActiveAt: row.last_active_at,
          expiresAt: new Date(Math.min(+row.idle_expires_at, +row.absolute_expires_at)),
          current: row.id === session.id,
          revoked: !!row.revoked_at,
        })),
        nextCursor: rows.length > limit ? this.cursor(account.id, rows[limit - 1]) : null,
      };
    });
  }
  async activity(secret) {
    return this.repository.transaction(async (r, tx) => {
      const { session: row, account } = await this.authorize(tx, secret);
      const sessions = await r.sessions(row.account_id, this.now(), account.security_version),
        current = sessions.find((s) => s.id === row.id);
      if (!this.valid(current, account)) authFail();
      const now = this.now();
      await r.touch(
        row.id,
        now,
        new Date(Math.min(+current.absolute_expires_at, +now + Number(current.idle_duration_ms)))
      );
      this.contexts.fresh(current.idle_expires_at, current.absolute_expires_at);
    });
  }
  async revoke({ sessionProof, browserProof, targetId, all = false, logout = false }) {
    if (all && logout) authFail('auth_forbidden');
    const requiresSession = !logout;
    const peerAddress = this.auditPeer();
    return this.repository.transaction(async (r, tx) => {
      let authority;
      const cr = this.contexts.repository.bind(tx),
        snapshot = sessionProof
          ? await r.lookup(tokenDigests(this.sessionKeys, 'session', sessionProof))
          : null;
      let account;
      if (snapshot) {
        account = logout
          ? await r.account(snapshot.account_id)
          : (await this.authorize(tx, sessionProof)).account;
        await r.lockContexts(account.id);
      } else if (!logout) authFail();
      const b = await this.contexts.browser(browserProof, {
          tombstone: logout,
          transaction: tx,
        }),
        browser = await cr.lockBrowser(b.id);
      if (!browser || browser.digest !== b.digest || (!logout && browser.status !== 'active')) authFail();
      this.contexts.fresh(browser.expires_at);
      if (account) {
        const sessions = await r.sessions(account.id, this.now(), account.security_version),
          current = sessions.find((s) => s.id === snapshot.id);
        if (!logout && !this.valid(current, account)) authFail();
        if (requiresSession) authority = current;
        const ids = all
          ? sessions.map((s) => s.id)
          : logout
            ? [snapshot.id]
            : sessions.filter((s) => s.id === targetId).map((s) => s.id);
        await r.revoke(ids, this.now());
        for (const id of ids.filter((id) => sessions.some((s) => s.id === id && !s.revoked_at)))
          await this.audit(tx, 'session_revoke', account.id, id, peerAddress, {
            securityVersion: account.security_version,
          });
        if (all) await r.invalidateOwner(account.id, this.now());
        if (targetId === snapshot.id) logout = true;
      }
      if (logout || all) await cr.logoutBrowser(browser.id, this.now());
      if ((logout || all) && browser.status === 'active')
        await this.audit(
          tx,
          all ? 'logout_all' : 'logout',
          account?.id ?? null,
          `${browser.id}_${browser.generation}`,
          peerAddress
        );
      this.contexts.fresh(browser.expires_at);
      if (requiresSession) this.contexts.fresh(authority.idle_expires_at, authority.absolute_expires_at);
    });
  }
}
