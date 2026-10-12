import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import { identityRuntimeQualified } from '../../../config/identityRuntime.js';
import { FACEBOOK_IDENTITY_PROTOCOL as protocol } from '../../../config/identityProviders.js';
import { authFail } from '../IdentityContextService.js';

const fail = () => authFail('auth_social_unavailable');
const bounded = (value, limit) => typeof value === 'string' && value.length > 0 && value.length <= limit;
const decimal = (value) => bounded(value, 255) && /^[0-9]+$/.test(value);

// Private, inactive Graph adapter. Every external request uses an injected
// transport and server-owned URL; the access token never leaves this stack.
export class IdentityFacebookAdapter {
  constructor({ clientId, clientSecret, redirectUri, fetch, fixtureOnly = false, clock = Date, runtime }) {
    if (!decimal(clientId) || !bounded(clientSecret, 2048) || typeof fetch !== 'function') fail();
    let uri;
    try { uri = new URL(redirectUri); } catch { fail(); }
    if (uri.username || uri.password || uri.hash || uri.search ||
      uri.pathname !== '/api/auth/social/facebook/callback' ||
      !(uri.protocol === 'https:' || (fixtureOnly || identityRuntimeQualified(runtime, 'facebook') && runtime.localHttp) && uri.protocol === 'http:' && uri.hostname === '127.0.0.1')) fail();
    Object.assign(this, { clientId, clientSecret, redirectUri, fetch, fixtureOnly, clock, runtime });
    this.provider = 'facebook';
    this.issuer = `https://www.facebook.com/${clientId}`;
    this.available = false;
  }
  qualify() { if (this.fixtureOnly !== true && !identityRuntimeQualified(this.runtime, 'facebook')) authFail('auth_service_unavailable'); }
  authorization({ state }) {
    this.qualify();
    if (!/^[A-Za-z0-9_-]{43}$/.test(state)) fail();
    const url = new URL(protocol.authorization);
    url.search = new URLSearchParams({ client_id: this.clientId, redirect_uri: this.redirectUri,
      response_type: 'code', scope: 'public_profile,email', state }).toString();
    return url.href;
  }
  async json(endpoint, params, deadline, headers = {}) {
    if (!['token', 'debug', 'profile'].includes(endpoint)) fail();
    const url = new URL(protocol[endpoint]);
    url.search = new URLSearchParams(params).toString();
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => {
      controller.abort(); reject(new Error('Provider timeout.'));
    }, Math.max(1, Math.min(protocol.timeoutMs, deadline - this.clock.now()))); });
    try {
      return await Promise.race([timeout, (async () => {
        const response = await this.fetch(url.href, { method: 'GET', headers, redirect: 'error', signal: controller.signal });
        if (!response?.ok || response.redirected || response.url && response.url !== url.href ||
          Number(response.headers?.get('content-length') ?? 0) > protocol.maximumResponseBytes || !response.body?.getReader) fail();
        const reader = response.body.getReader(), chunks = [];
        let size = 0;
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > protocol.maximumResponseBytes || this.clock.now() >= deadline) fail();
            chunks.push(Buffer.from(value));
          }
        } catch (error) { await reader.cancel().catch(() => {}); throw error; }
        if (this.clock.now() >= deadline) fail();
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
      })()]);
    } catch { controller.abort(); fail(); } finally { clearTimeout(timer); }
  }
  async exchange({ code, expiresAt }) {
    this.qualify();
    if (!bounded(code, 4096) || !Number.isFinite(+expiresAt) || +expiresAt <= this.clock.now()) fail();
    const deadline = Math.min(+expiresAt, this.clock.now() + protocol.timeoutMs);
    const token = await this.json('token', { client_id: this.clientId, client_secret: this.clientSecret,
      redirect_uri: this.redirectUri, code }, deadline);
    if (!bounded(token?.access_token, 16384) || !Number.isSafeInteger(token.expires_in) || token.expires_in <= 0) fail();
    const { data } = await this.json('debug', { input_token: token.access_token,
      access_token: `${this.clientId}|${this.clientSecret}` }, deadline);
    const now = this.clock.now();
    if (data?.is_valid !== true || data.type !== 'USER' || String(data.app_id) !== this.clientId ||
      !decimal(data.user_id) || !Number.isSafeInteger(data.expires_at) || data.expires_at * 1000 <= now ||
      !Number.isSafeInteger(data.data_access_expires_at) || data.data_access_expires_at * 1000 <= now) fail();
    const profile = await this.json('profile', { fields: 'id',
      appsecret_proof: createHmac('sha256', this.clientSecret).update(token.access_token).digest('hex') },
      deadline, { authorization: `Bearer ${token.access_token}` });
    if (profile?.id !== data.user_id) fail();
    // Facebook email presence is not independent proof of current mailbox
    // ownership. Unknown subjects always complete application email OTP.
    return Object.freeze({ provider: 'facebook', issuer: this.issuer, subject: data.user_id, email: null,
      expiresAt: new Date(Math.min(deadline, data.expires_at * 1000, data.data_access_expires_at * 1000)) });
  }
  signedEvent(signedRequest) {
    this.qualify();
    if (!bounded(signedRequest, 16384)) fail();
    const parts = signedRequest.split('.');
    if (parts.length !== 2 || !parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p))) fail();
    const signature = Buffer.from(parts[0], 'base64url'), encoded = Buffer.from(parts[1], 'base64url');
    const expected = createHmac('sha256', this.clientSecret).update(parts[1]).digest();
    if (signature.length !== expected.length || signature.toString('base64url') !== parts[0] ||
      encoded.toString('base64url') !== parts[1] || !timingSafeEqual(signature, expected)) fail();
    let payload;
    try { payload = JSON.parse(encoded.toString('utf8')); } catch { fail(); }
    if (payload?.algorithm !== 'HMAC-SHA256' || !decimal(payload.user_id) ||
      !Number.isSafeInteger(payload.issued_at) || payload.issued_at <= 0) fail();
    return Object.freeze({ subject: payload.user_id, issuedAt: payload.issued_at * 1000,
      fingerprint: createHash('sha256').update(`${this.issuer}:${payload.user_id}:${payload.issued_at}`).digest('hex') });
  }
}
