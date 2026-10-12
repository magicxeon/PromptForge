import { identityRuntimeQualified } from '../../../config/identityRuntime.js';

const fail = () => {
  throw Object.assign(new Error('Authentication request rejected.'), { code: 'auth_forbidden' });
};
export const validIdentitySecret = (value) =>
  typeof value === 'string' &&
  /^[A-Za-z0-9_-]{43}$/.test(value) &&
  Buffer.from(value, 'base64url').length === 32 &&
  Buffer.from(value, 'base64url').toString('base64url') === value;

export class IdentityCookies {
  constructor({ mode, allowedOrigins, fixtureOnly = false, runtime }) {
    if (
      !['production', 'local'].includes(mode) ||
      !Array.isArray(allowedOrigins) ||
      !allowedOrigins.length ||
      allowedOrigins.length > 8
    )
      fail();
    this.secure = mode === 'production';
    this.origins = new Set(
      allowedOrigins.map((value) => {
        const url = new URL(value);
        if (
          url.origin !== value ||
          url.username ||
          url.password ||
          (this.secure
            ? url.protocol !== 'https:'
            : !(fixtureOnly || identityRuntimeQualified(runtime) && runtime.localHttp) ||
              url.protocol !== 'http:' ||
              !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
        )
          fail();
        return value;
      })
    );
    const prefix = this.secure ? '__Host-mpf_' : 'mpf_local_';
    this.names = Object.freeze({
      session: prefix + 'session',
      browser: prefix + 'context',
      flow: prefix + 'flow',
      receipt: prefix + 'receipt',
    });
  }
  read(header = '') {
    if (typeof header !== 'string' || Buffer.byteLength(header) > 8192 || /[\r\n]/.test(header)) fail();
    const parts = header ? header.split(';') : [];
    if (parts.length > 40) fail();
    const result = {},
      seen = new Set();
    for (const part of parts) {
      const split = part.trim().split('=');
      const name = split[0];
      if (!/^(__Host-mpf_|mpf_local_)(session|context|flow|receipt)$/.test(name)) continue;
      const kind = Object.keys(this.names).find((key) => this.names[key] === name);
      if (!kind || seen.has(name) || split.length !== 2 || !validIdentitySecret(split[1])) fail();
      seen.add(name);
      result[kind] = split[1];
    }
    return result;
  }
  origin(value) {
    if (typeof value !== 'string' || !this.origins.has(value)) fail();
  }
  set(kind, value, maxAge) {
    if (!this.names[kind] || !validIdentitySecret(value)) fail();
    if (maxAge !== undefined && (!Number.isSafeInteger(maxAge) || maxAge < 0 || maxAge > 2592000)) fail();
    return `${this.names[kind]}=${value}; Path=/; HttpOnly; SameSite=Lax${this.secure ? '; Secure' : ''}${maxAge === undefined ? '' : `; Max-Age=${maxAge}`}`;
  }
  clear() {
    return Object.values(this.names).map(
      (name) => `${name}=; Path=/; HttpOnly; SameSite=Lax${this.secure ? '; Secure' : ''}; Max-Age=0`
    );
  }
}
