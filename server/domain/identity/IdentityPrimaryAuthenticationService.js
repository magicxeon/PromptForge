import { randomUUID, createHmac } from 'node:crypto';
import { identityRuntimeQualified } from '../../config/identityRuntime.js';
import { isIP } from 'node:net';
import { authFail, authRing, tokenDigest } from './IdentityContextService.js';
import { normalizeIdentityEmail } from './identityEmail.js';
import { keyFor, separatedKeys, equalDigest } from './identitySecrets.js';
import { challengeRatePolicy } from '../../config/authPolicy.js';
const invalid = () => authFail('auth_invalid_credentials');
export class IdentityPrimaryAuthenticationService {
  constructor({
    repository,
    rateRepository,
    contexts,
    sessions,
    passwordAdapter,
    proofKeys,
    rateKeys,
    fixtureOnly = false,
    runtime,
    clock = Date,
    otherKeyrings = [],
  }) {
    [proofKeys, rateKeys].forEach(authRing);
    separatedKeys([
      proofKeys,
      rateKeys,
      contexts.browserKeys,
      contexts.csrfKeys,
      contexts.metadataKeys,
      sessions.sessionKeys,
      ...otherKeyrings,
    ]);
    Object.assign(this, {
      repository,
      rateRepository,
      contexts,
      sessions,
      passwordAdapter,
      proofKeys,
      rateKeys,
      fixtureOnly,
      runtime,
      clock,
    });
    this.available = false;
  }
  qualify() {
    if (this.fixtureOnly === true ? typeof this.passwordAdapter?.verify !== 'function'
      : !identityRuntimeQualified(this.runtime, 'email') || this.runtime.methods.password && typeof this.passwordAdapter?.verify !== 'function')
      authFail('auth_service_unavailable');
  }
  eligible(row) {
    return (
      row?.status === 'active' &&
      row.email_status === 'active' &&
      row.verified_at &&
      row.login_enabled === true &&
      row.algorithm === 'argon2id' &&
      row.password_version === 1 &&
      typeof row.protected_hash === 'string'
    );
  }
  emailEligible(row) {
    return (
      row?.status === 'active' &&
      row.email_status === 'active' &&
      row.verified_at &&
      row.login_enabled === true
    );
  }
  async resolveOtpTarget(proposal) {
    this.qualify();
    if (proposal?.purpose !== 'login') authFail('auth_service_unavailable');
    const email = normalizeIdentityEmail(proposal.email),
      row = await this.repository.credential(email.canonicalEmail);
    // Non-active targets receive an anonymous context and the same request shape;
    // proof verification will refuse their enrollment or authentication.
    const active = this.emailEligible(row);
    return {
      purpose: 'login',
      targetId: active ? row.id : randomUUID(),
      accountId: active ? row.id : null,
      securityVersion: active ? row.security_version : null,
      ...email,
      rememberDevice: proposal.rememberDevice ?? false,
      returnPath: proposal.returnPath ?? '/',
    };
  }
  async recordOtpVerification({ binding, challengeId, transaction, proofs }) {
    this.qualify();
    const r = this.repository.bind(transaction),
      source = await r.otpSource(challengeId);
    const { row: context, metadata } = await this.contexts.readBound(proofs, transaction);
    if (
      !source ||
      context.id !== binding.contextId ||
      source.context_id !== context.id ||
      context.purpose !== 'login' ||
      source.purpose !== 'login' ||
      source.status !== 'consumed' ||
      source.delivery_status !== 'sent' ||
      source.account_id !== context.account_id ||
      source.security_version !== context.security_version ||
      source.target_id !== context.target_binding ||
      source.browser_digest !== binding.browserDigest
    )
      invalid();
    this.contexts.fresh(source.expires_at, context.expires_at, context.browser_expiry);
    const current = await r.credential(metadata.canonicalEmail),
      expiresAt = new Date(Math.min(+source.expires_at, +context.expires_at));
    if (context.account_id === null) {
      if (current) return { nextAction: 'unavailable' };
      await r.recordOffer(context.id, challengeId, expiresAt);
      this.contexts.fresh(expiresAt, context.browser_expiry);
      return { nextAction: 'offer_registration', contextId: context.id };
    }
    if (
      !this.emailEligible(current) ||
      current.id !== context.account_id ||
      current.security_version !== context.security_version
    )
      invalid();
    const proofRef = randomUUID();
    await r.insertOtpProof({
      contextId: context.id,
      proofRef,
      challengeId,
      accountId: current.id,
      securityVersion: current.security_version,
      expiresAt,
    });
    const session = await this.sessions.finishVerifiedAuthentication(transaction, { ...proofs, proofRef });
    await this.sessions.audit(transaction, 'otp_login', current.id, context.id, this.sessions.auditPeer(), {
      securityVersion: current.security_version,
      remembered: session.remembered,
    });
    this.contexts.fresh(expiresAt, context.browser_expiry);
    return { nextAction: 'authenticate', session, returnPath: metadata.returnPath };
  }
  async admit(source, email) {
    if (typeof source !== 'string' || !isIP(source)) authFail('auth_service_unavailable');
    const peer = isIP(source) === 6 ? new URL(`http://[${source}]/`).hostname : source;
    const scopes = [
      ['verify_source_short', peer],
      ['verify_source_hour', peer],
      ['verify_global_hour', 'global'],
    ];
    if (email) scopes.push(['verify_target_short', email], ['verify_target_hour', email]);
    const version = this.rateKeys.current;
    const buckets = scopes.map(([name, value]) => ({
      name: `password_${name}`,
      ...challengeRatePolicy[name],
      digest: createHmac('sha256', keyFor(this.rateKeys, version))
        .update(`password-admission-v1:${version}:${JSON.stringify([name, value])}`)
        .digest('hex'),
    }));
    try {
      await this.rateRepository.transaction(async (r) => {
        await r.lockAdmission();
        await r.admit(buckets, version, () => new Date(this.clock.now()));
      });
    } catch (error) {
      if (error?.code === 'IDENTITY_RATE_LIMITED') authFail('auth_rate_limited');
      authFail('auth_service_unavailable');
    }
  }
  async resolveTarget(proposal) {
    this.qualify();
    if (proposal?.purpose !== 'login') authFail('auth_service_unavailable');
    const email = normalizeIdentityEmail(proposal.email),
      row = await this.repository.credential(email.canonicalEmail);
    if (!this.eligible(row)) invalid();
    return {
      purpose: 'login',
      targetId: row.id,
      accountId: row.id,
      securityVersion: row.security_version,
      canonicalEmail: row.canonical_email,
      deliveryEmail: row.delivery_email,
      rememberDevice: proposal.rememberDevice ?? false,
      returnPath: proposal.returnPath ?? '/',
    };
  }
  async verifyAuthentication({ transaction, proofRef, context, metadata }) {
    this.qualify();
    const r = this.repository.bind(transaction),
      proof = await r.proof(context.id, proofRef);
    if (!proof) {
      const otp = await r.otpProof(context.id, proofRef),
        current = await r.credential(metadata.canonicalEmail);
      if (
        !otp ||
        otp.consumed_at ||
        context.purpose !== 'login' ||
        otp.account_id !== context.account_id ||
        otp.security_version !== context.security_version ||
        !this.emailEligible(current) ||
        current.id !== otp.account_id ||
        current.security_version !== otp.security_version
      )
        invalid();
      const source = await r.otpSource(otp.challenge_id);
      if (
        !source ||
        source.status !== 'consumed' ||
        source.delivery_status !== 'sent' ||
        source.context_id !== context.id ||
        source.purpose !== 'login'
      )
        invalid();
      this.contexts.fresh(otp.expires_at, source.expires_at, context.expires_at, context.browser_expiry);
      await r.consumeOtp(context.id, new Date(this.clock.now()));
      return {
        proofRef,
        contextId: context.id,
        accountId: otp.account_id,
        securityVersion: otp.security_version,
        method: 'email_otp',
        assurance: 'single_factor',
        mfaQualified: false,
      };
    }
    if (
      !proof ||
      proof.consumed_at ||
      proof.method !== 'password' ||
      context.purpose !== 'login' ||
      proof.account_id !== context.account_id ||
      proof.security_version !== context.security_version
    )
      invalid();
    const current = await r.credential(metadata.canonicalEmail);
    if (
      !this.eligible(current) ||
      current.id !== proof.account_id ||
      current.security_version !== proof.security_version ||
      !equalDigest(
        proof.credential_digest,
        tokenDigest(this.proofKeys, 'password-credential', current.protected_hash, proof.key_version)
      )
    )
      invalid();
    this.contexts.fresh(proof.expires_at, context.expires_at, context.browser_expiry);
    await r.consume(context.id, new Date(this.clock.now()));
    this.contexts.fresh(proof.expires_at, context.expires_at, context.browser_expiry);
    return {
      proofRef,
      contextId: context.id,
      accountId: proof.account_id,
      securityVersion: proof.security_version,
      method: 'password',
      assurance: 'single_factor',
      mfaQualified: false,
    };
  }
  async loginPassword({ browserProof, sourceAddress }, input) {
    this.qualify();
    const browser = await this.contexts.browser(browserProof);
    let email;
    try {
      email = normalizeIdentityEmail(input.email);
    } catch {}
    await this.admit(sourceAddress, email?.canonicalEmail);
    const snapshot = email ? await this.repository.credential(email.canonicalEmail) : null;
    const matched = await this.passwordAdapter.verify(
      this.eligible(snapshot) ? snapshot.protected_hash : undefined,
      input.password
    );
    this.contexts.fresh(browser.expires_at);
    if (matched !== true || !this.eligible(snapshot) || !email) invalid();
    const flow = await this.contexts.issue({
      browserProof,
      proposal: {
        purpose: 'login',
        email: email.canonicalEmail,
        rememberDevice: input.rememberDevice ?? false,
        returnPath: input.returnPath ?? '/',
      },
    });
    const proofs = { contextProof: flow.contextProof, browserProof };
    const peerAddress = this.sessions.auditPeer();
    try {
      return await this.repository.transaction(async (r, tx) => {
        const sr = this.sessions.repository.bind(tx),
          cr = this.contexts.repository.bind(tx);
        const account = await sr.account(snapshot.id);
        await cr.context(flow.contextId);
        const { row: context, metadata } = await this.contexts.readBound(proofs, tx),
          current = await r.credential(email.canonicalEmail);
        if (
          !account ||
          account.status !== 'active' ||
          account.security_version !== snapshot.security_version ||
          context.account_id !== snapshot.id ||
          context.security_version !== snapshot.security_version ||
          !this.eligible(current) ||
          current.id !== snapshot.id ||
          current.security_version !== snapshot.security_version ||
          current.protected_hash !== snapshot.protected_hash
        )
          invalid();
        this.contexts.fresh(browser.expires_at, context.expires_at, context.browser_expiry);
        const proofRef = randomUUID();
        await r.insertProof({
          contextId: context.id,
          proofRef,
          accountId: account.id,
          securityVersion: account.security_version,
          credentialDigest: tokenDigest(this.proofKeys, 'password-credential', current.protected_hash),
          keyVersion: this.proofKeys.current,
          now: new Date(this.clock.now()),
          expiresAt: context.expires_at,
        });
        const session = await this.sessions.finishVerifiedAuthentication(tx, { ...proofs, proofRef });
        await this.sessions.audit(tx, 'password_login', account.id, context.id, peerAddress, {
          securityVersion: account.security_version,
          remembered: session.remembered,
        });
        this.contexts.fresh(browser.expires_at, context.expires_at, context.browser_expiry);
        return {
          session,
          body: { contractVersion: 1, nextAction: 'authenticated', returnPath: metadata.returnPath },
        };
      });
    } catch (error) {
      if (error?.code === 'auth_mfa_required') invalid();
      throw error;
    }
  }
}
