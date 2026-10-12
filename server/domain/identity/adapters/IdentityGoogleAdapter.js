import { createHash, timingSafeEqual } from 'node:crypto';
import { identityRuntimeQualified } from '../../../config/identityRuntime.js';
import { createLocalJWKSet, jwtVerify } from 'jose';
import { GOOGLE_IDENTITY_PROTOCOL as protocol } from '../../../config/identityProviders.js';
import { authFail } from '../IdentityContextService.js';
import { normalizeIdentityEmail } from '../identityEmail.js';

const fail = () => authFail('auth_social_unavailable');
const bounded = (v, n) => typeof v === 'string' && v.length > 0 && v.length <= n;
const same = (a, b) =>
  bounded(a, 256) &&
  bounded(b, 256) &&
  a.length === b.length &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Inactive production adapter: a fixture composition must explicitly inject its
// transport. No global fetch, discovery URL, token-controlled JWKS or redirects.
export class IdentityGoogleAdapter {
  constructor({ clientId, clientSecret, redirectUri, fetch, fixtureOnly = false, clock = Date, runtime }) {
    if (!bounded(clientId, 512) || !bounded(clientSecret, 2048) || typeof fetch !== 'function') fail();
    let uri;
    try {
      uri = new URL(redirectUri);
    } catch {
      fail();
    }
    if (
      uri.username ||
      uri.password ||
      uri.hash ||
      uri.search ||
      uri.pathname !== '/api/auth/social/google/callback' ||
      !(
        uri.protocol === 'https:' ||
        ((fixtureOnly || identityRuntimeQualified(runtime, 'google') && runtime.localHttp) && uri.protocol === 'http:' && uri.hostname === '127.0.0.1')
      )
    )
      fail();
    Object.assign(this, { clientId, clientSecret, redirectUri, fetch, fixtureOnly, clock, runtime });
    Object.defineProperties(this, {
      provider: { value: 'google', enumerable: true },
      issuer: { value: protocol.issuer, enumerable: true },
    });
    this.available = false;
  }
  qualify() {
    if (this.fixtureOnly !== true && !identityRuntimeQualified(this.runtime, 'google')) authFail('auth_service_unavailable');
  }
  authorization({ state, nonce, verifier }) {
    this.qualify();
    if (![state, nonce, verifier].every((v) => /^[A-Za-z0-9_-]{43}$/.test(v))) fail();
    const url = new URL(protocol.authorization);
    url.search = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email',
      state,
      nonce,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }).toString();
    return url.href;
  }
  async json(endpoint, options, deadline) {
    if (!['token', 'keys'].includes(endpoint)) fail();
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(
        () => {
          controller.abort();
          reject(new Error('Provider timeout.'));
        },
        Math.max(1, Math.min(protocol.timeoutMs, deadline - this.clock.now()))
      );
    });
    try {
      return await Promise.race([
        timeout,
        (async () => {
          const response = await this.fetch(protocol[endpoint], {
            ...options,
            redirect: 'error',
            signal: controller.signal,
          });
          if (
            !response?.ok ||
            response.redirected ||
            (response.url && response.url !== protocol[endpoint]) ||
            Number(response.headers?.get('content-length') ?? 0) > protocol.maximumResponseBytes
          )
            fail();
          if (!response.body?.getReader) fail();
          const reader = response.body.getReader(),
            chunks = [];
          let size = 0;
          try {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              size += value.byteLength;
              if (size > protocol.maximumResponseBytes || this.clock.now() >= deadline) fail();
              chunks.push(Buffer.from(value));
            }
          } catch (error) {
            await reader.cancel().catch(() => {});
            throw error;
          }
          if (this.clock.now() >= deadline) fail();
          return JSON.parse(Buffer.concat(chunks).toString('utf8'));
        })(),
      ]);
    } catch {
      controller.abort();
      fail();
    } finally {
      clearTimeout(timer);
    }
  }
  async exchange({ code, verifier, nonce, expiresAt }) {
    this.qualify();
    if (
      !bounded(code, 4096) ||
      /[\x00-\x20\x7f]/.test(code) ||
      ![verifier, nonce].every((v) => /^[A-Za-z0-9_-]{43}$/.test(v)) ||
      !(expiresAt instanceof Date)
    )
      fail();
    const deadline = Math.min(+expiresAt, this.clock.now() + protocol.timeoutMs);
    if (deadline <= this.clock.now()) fail();
    try {
      const token = await this.json(
        'token',
        {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uri: this.redirectUri,
            grant_type: 'authorization_code',
            code_verifier: verifier,
          }).toString(),
        },
        deadline
      );
      if (!bounded(token.id_token, 16384)) fail();
      const jwks = await this.json('keys', { method: 'GET' }, deadline);
      if (!Array.isArray(jwks.keys) || !jwks.keys.length || jwks.keys.length > 16) fail();
      const { payload, protectedHeader } = await jwtVerify(token.id_token, createLocalJWKSet(jwks), {
        algorithms: ['RS256'],
        issuer: ['accounts.google.com', protocol.issuer],
        audience: this.clientId,
        requiredClaims: ['exp', 'iat', 'sub', 'nonce'],
        currentDate: new Date(this.clock.now()),
        clockTolerance: 0,
      });
      if (
        protectedHeader.jku ||
        protectedHeader.x5u ||
        !bounded(payload.sub, 255) ||
        /[\x00-\x20\x7f]/.test(payload.sub) ||
        !same(payload.nonce, nonce) ||
        !Number.isSafeInteger(payload.iat) ||
        payload.iat > Math.floor(this.clock.now() / 1000) ||
        (payload.azp !== undefined && payload.azp !== this.clientId) ||
        (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== this.clientId) ||
        this.clock.now() >= deadline
      )
        fail();
      let email = null;
      if (payload.email_verified === true && bounded(payload.email, 254)) {
        try {
          const normalized = normalizeIdentityEmail(payload.email);
          if (
            normalized.canonicalEmail.endsWith('@gmail.com') ||
            (bounded(payload.hd, 253) && !/[\s\x00-\x1f\x7f\/%?#:@]/.test(payload.hd))
          )
            email = normalized;
        } catch {
          /* Missing/unusable email requires independent email verification. */
        }
      }
      return Object.freeze({
        provider: 'google',
        issuer: protocol.issuer,
        subject: payload.sub,
        email,
        expiresAt: new Date(Math.min(deadline, payload.exp * 1000)),
      });
    } catch {
      fail();
    }
  }
}
