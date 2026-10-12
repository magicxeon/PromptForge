import {
  createHmac,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { keyFor, separatedKeys, opaque } from './identitySecrets.js';
import { validIdentitySecret } from './adapters/identityCookies.js';
import { normalizeIdentityEmail } from './identityEmail.js';
export const authFail = (code = 'auth_session_expired') => {
  throw Object.assign(new Error('Authentication unavailable.'), { code });
};
export function authRing(ring) {
  keyFor(ring);
  if (Object.keys(ring.keys).length > 8) authFail('auth_service_unavailable');
  for (const v of Object.keys(ring.keys)) keyFor(ring, Number(v));
}
export const tokenDigest = (ring, domain, secret, version = ring.current) =>
  createHmac('sha256', keyFor(ring, version))
    .update(`identity:${domain}:v1:${version}\0${secret}`)
    .digest('hex');
export const tokenDigests = (ring, domain, secret) => {
  if (!validIdentitySecret(secret)) authFail();
  return Object.keys(ring.keys).map((v) => tokenDigest(ring, domain, secret, Number(v)));
};
const safePath = (value) =>
  typeof value === 'string' &&
  value.length <= 1024 &&
  /^\/(?:playground|profiles|settings|studio)?$/.test(value);
export class IdentityContextService {
  constructor({
    repository,
    browserKeys,
    csrfKeys,
    metadataKeys,
    targetResolver,
    clock = Date,
    otherKeyrings = [],
  }) {
    [browserKeys, csrfKeys, metadataKeys].forEach(authRing);
    separatedKeys([browserKeys, csrfKeys, metadataKeys, ...otherKeyrings]);
    if (!repository || typeof targetResolver !== 'function') authFail('auth_service_unavailable');
    Object.assign(this, { repository, browserKeys, csrfKeys, metadataKeys, targetResolver, clock });
  }
  now() {
    return new Date(this.clock.now());
  }
  fresh(...dates) {
    if (dates.some((d) => !(d instanceof Date) || !Number.isFinite(+d) || +d <= this.clock.now())) authFail();
  }
  aad(row) {
    return Buffer.from(
      JSON.stringify([
        'identity-context-v1',
        row.id,
        row.purpose,
        row.account_id,
        row.security_version,
        row.target_binding,
        row.browser_id,
        row.generation,
        row.expires_at.toISOString(),
      ])
    );
  }
  protect(row, value) {
    const plain = Buffer.from(JSON.stringify(value));
    if (plain.length > 2048) authFail();
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', keyFor(this.metadataKeys), iv);
    cipher.setAAD(this.aad(row));
    return [iv, Buffer.concat([cipher.update(plain), cipher.final()]), cipher.getAuthTag()]
      .map((b) => b.toString('base64url'))
      .join('.');
  }
  open(row) {
    try {
      if (!row.protected_payload) authFail();
      const parts = row.protected_payload.split('.').map((v) => Buffer.from(v, 'base64url'));
      if (parts.length !== 3 || parts[1].length > 2048) authFail();
      const decipher = createDecipheriv(
        'aes-256-gcm',
        keyFor(this.metadataKeys, row.metadata_key_version),
        parts[0]
      );
      decipher.setAAD(this.aad(row));
      decipher.setAuthTag(parts[2]);
      return JSON.parse(Buffer.concat([decipher.update(parts[1]), decipher.final()]).toString());
    } catch {
      authFail();
    }
  }
  async browser(secret, { tombstone = false, transaction } = {}) {
    const work = async (r) => {
      const row = await r.browser(tokenDigests(this.browserKeys, 'browser', secret));
      if (!row || (!tombstone && row.status !== 'active')) authFail();
      this.fresh(row.expires_at);
      return row;
    };
    return transaction ? work(this.repository.bind(transaction)) : this.repository.transaction(work);
  }
  async bootstrap(secret) {
    if (secret) {
      try {
        return { browser: await this.browser(secret), secret, created: false };
      } catch {}
    }
    return this.repository.transaction(async (r) => {
      if (!(await r.admit())) authFail('auth_service_unavailable');
      const secret = randomBytes(32).toString('base64url'),
        now = this.now(),
        browser = {
          id: randomUUID(),
          digest: tokenDigest(this.browserKeys, 'browser', secret),
          keyVersion: this.browserKeys.current,
          now,
          expiresAt: new Date(+now + 300000),
        };
      await r.insertBrowser(browser);
      return {
        browser: {
          ...browser,
          key_version: browser.keyVersion,
          expires_at: browser.expiresAt,
          generation: 1,
          status: 'active',
        },
        secret,
        created: true,
      };
    });
  }
  csrf(browser, sessionDigest = 'anonymous', mode = 'session', version = this.csrfKeys.current) {
    return (
      `${version}.` +
      createHmac('sha256', keyFor(this.csrfKeys, version))
        .update(
          JSON.stringify(['csrf-v1', browser.id, browser.digest, browser.generation, sessionDigest, mode])
        )
        .digest('base64url')
    );
  }
  async verifyCsrf({ browserProof, sessionDigest, token, mode = 'session', logout = false }) {
    if (typeof token !== 'string' || token.length > 64 || !/^\d{1,9}\.[A-Za-z0-9_-]{43}$/.test(token))
      authFail('auth_forbidden');
    const row = await this.browser(browserProof, { tombstone: logout }),
      version = Number(token.split('.')[0]);
    let expected;
    try {
      expected = this.csrf(row, sessionDigest, mode, version);
    } catch {
      authFail('auth_forbidden');
    }
    if (expected.length !== token.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(token)))
      authFail('auth_forbidden');
    return row;
  }
  async issue({ browserProof, proposal }, transaction, maximumExpiresAt) {
    const binding = await this.targetResolver(proposal, { transaction });
    return this.issueResolved({ browserProof, binding }, transaction, maximumExpiresAt);
  }
  // Private composition contract; HTTP callers never supply resolved authority.
  async issueResolved({ browserProof, binding }, transaction, maximumExpiresAt) {
    const browser = await this.browser(browserProof, { transaction });
    if (
      !binding ||
      ![
        'login',
        'registration',
        'password_reset',
        'email_change_new',
        'link',
        'reauthentication',
        'mfa',
        'enrollment',
      ].includes(binding.purpose) ||
      !opaque(binding.targetId) ||
      (binding.accountId != null &&
        (!opaque(binding.accountId) || !Number.isSafeInteger(binding.securityVersion)))
    )
      authFail('auth_service_unavailable');
    const withoutEmail =
      ['google', 'facebook'].includes(binding.provider) &&
      binding.canonicalEmail === null &&
      binding.deliveryEmail === null &&
      ['login', 'reauthentication', 'enrollment'].includes(binding.purpose);
    const email = withoutEmail ? { canonicalEmail: null } : normalizeIdentityEmail(binding.canonicalEmail),
      delivery = withoutEmail
        ? { canonicalEmail: null, deliveryEmail: null }
        : normalizeIdentityEmail(binding.deliveryEmail);
    if (email.canonicalEmail !== delivery.canonicalEmail || !safePath(binding.returnPath ?? '/')) authFail();
    if (binding.rememberDevice !== undefined && typeof binding.rememberDevice !== 'boolean') authFail();
    const action = binding.action;
    if (
      action &&
      (!['reauthentication', 'password_reset'].includes(binding.purpose) ||
        !opaque(action.name) ||
        !opaque(action.target) ||
        action.target !== binding.targetId ||
        (action.sessionId !== null && !opaque(action.sessionId)))
    )
      authFail();
    const work = async (r) => {
      if (binding.accountId) {
        const a = await r.account(binding.accountId);
        if (!a || a.status !== 'active' || a.security_version !== binding.securityVersion) authFail();
      }
      const b = await r.lockBrowser(browser.id);
      if (!b || b.digest !== browser.digest || b.status !== 'active') authFail();
      this.fresh(b.expires_at);
      if ((await r.countMetadata(b.id)) >= 8) authFail('auth_service_unavailable');
      const secret = randomBytes(32).toString('base64url'),
        now = this.now(),
        expiresAt = new Date(
          Math.min(+b.expires_at, +now + 300000, maximumExpiresAt ? +maximumExpiresAt : Infinity)
        );
      this.fresh(expiresAt);
      const i = {
        id: randomUUID(),
        accountId: binding.accountId ?? null,
        securityVersion: binding.accountId ? binding.securityVersion : null,
        purpose: binding.purpose,
        targetId: binding.targetId,
        digest: tokenDigest(this.browserKeys, 'purpose-context', secret),
        keyVersion: this.browserKeys.current,
        browserDigest: b.digest,
        browserId: b.id,
        generation: b.generation,
        metadataKeyVersion: this.metadataKeys.current,
        now,
        expiresAt,
        action,
      };
      i.protectedPayload = this.protect(
        {
          id: i.id,
          purpose: i.purpose,
          account_id: i.accountId,
          security_version: i.securityVersion,
          target_binding: i.targetId,
          browser_id: i.browserId,
          generation: i.generation,
          expires_at: expiresAt,
        },
        {
          canonicalEmail: email.canonicalEmail,
          deliveryEmail: delivery.deliveryEmail,
          rememberDevice:
            ['login', 'registration', 'enrollment', 'mfa'].includes(binding.purpose) &&
            binding.rememberDevice === true,
          returnPath: binding.returnPath ?? '/',
          ...(action
            ? { action: { name: action.name, target: action.target, sessionId: action.sessionId } }
            : {}),
        }
      );
      await r.insertContext(i);
      this.fresh(expiresAt);
      return { contextId: i.id, contextProof: secret, expiresAt };
    };
    return transaction ? work(this.repository.bind(transaction)) : this.repository.transaction(work);
  }
  async readBound({ contextProof, browserProof }, transaction) {
    const work = async (r) => {
      const row = await r.snapshot(tokenDigests(this.browserKeys, 'purpose-context', contextProof));
      if (
        !row ||
        row.status !== 'pending' ||
        row.browser_status !== 'active' ||
        row.generation !== row.current_generation ||
        row.browser_digest !== row.current_browser_digest ||
        !tokenDigests(this.browserKeys, 'browser', browserProof).includes(row.current_browser_digest)
      )
        authFail();
      this.fresh(row.expires_at, row.metadata_expiry, row.browser_expiry);
      const metadata = this.open(row);
      return { row, metadata };
    };
    return transaction ? work(this.repository.bind(transaction)) : this.repository.transaction(work);
  }
  async resolveBinding(proof) {
    const { row, metadata } = await this.readBound(proof);
    return {
      contextId: row.id,
      accountId: row.account_id,
      securityVersion: row.security_version,
      purpose: row.purpose === 'link' ? 'link_email' : row.purpose,
      targetId: row.target_binding,
      browserDigest: row.browser_digest,
      ...metadata,
    };
  }
  cleanup() {
    return this.repository.transaction((r) => r.cleanup(this.now()));
  }
}
