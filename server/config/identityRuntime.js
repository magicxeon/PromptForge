import { hkdfSync } from 'node:crypto';
import { readDatabaseConfig } from './database.js';
import { normalizeIdentityEmail } from '../domain/identity/identityEmail.js';

const qualified = new WeakSet();
const methods = ['password', 'emailOtp', 'google', 'facebook'];
const purposes = ['browser', 'csrf', 'metadata', 'session', 'delivery', 'recipient', 'otp', 'target', 'challengeRate',
  'challengeOperation', 'challengeReceipt', 'primaryProof', 'primaryRate', 'actionFingerprint', 'actionReceipt',
  'googleState', 'googleProtected', 'googleFingerprint', 'googleReceipt', 'facebookState', 'facebookProtected',
  'facebookFingerprint', 'facebookReceipt', 'audit'];
const fail = () => { throw Object.assign(new Error('Authentication runtime configuration unavailable.'), { code: 'AUTH_RUNTIME_CONFIGURATION_INVALID' }); };
const object = value => value && Object.getPrototypeOf(value) === Object.prototype;
const reference = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(value);
const json = value => { try { if (typeof value !== 'string' || value.length > 16384) fail(); const parsed = JSON.parse(value); if (!object(parsed)) fail(); return parsed; } catch { fail(); } };
const bounded = (value, maximum) => typeof value === 'string' && value.length > 0 && value.length <= maximum && !/[\x00-\x1f\x7f]/.test(value);

// Side-effect free. This never loads .env, opens a database or invents approvals.
export function readIdentityRuntimeConfig(env = process.env) {
  if (env.AUTH_LOGIN_ENABLED === undefined || env.AUTH_LOGIN_ENABLED === 'false') return null;
  if (env.AUTH_LOGIN_ENABLED !== 'true' || env.AUTH_DEV_BYPASS_ENABLED === 'true') fail();
  try {
    const enabled = String(env.AUTH_METHODS ?? '').split(',');
    if (!enabled.length || enabled.length > 4 || new Set(enabled).size !== enabled.length || enabled.some(m => !methods.includes(m))) fail();
    const approval = json(env.AUTH_APPROVALS_JSON), legal = json(env.AUTH_LEGAL_JSON);
    if (Object.keys(approval).some(k => !['deployment', 'legal', 'retention', 'email', 'google', 'facebook', 'screening', 'localHttp'].includes(k))
      || Object.keys(legal).some(k => !['termsVersion', 'privacyVersion', 'termsUrl', 'privacyUrl'].includes(k))) fail();
    if (!['deployment', 'legal', 'retention'].every(k => reference(approval[k]))) fail();
    if (![legal.termsVersion, legal.privacyVersion].every(v => typeof v === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(v))) fail();
    const local = env.NODE_ENV === 'development' && env.AUTH_LOCAL_HTTP_APPROVED === 'true';
    const originAllowed = url => url.protocol === 'https:' || local && url.protocol === 'http:' && url.hostname === '127.0.0.1';
    if (typeof env.AUTH_ORIGINS_JSON !== 'string' || env.AUTH_ORIGINS_JSON.length > 16384) fail();
    const origins = JSON.parse(env.AUTH_ORIGINS_JSON);
    if (!Array.isArray(origins) || !origins.length || origins.length > 8 || new Set(origins).size !== origins.length) fail();
    for (const origin of origins) {
      const url = new URL(origin);
      if (origin !== url.origin || url.username || url.password || !originAllowed(url)) fail();
    }
    if (new Set(origins.map(origin => new URL(origin).protocol)).size !== 1) fail();
    if (origins.some(v => v.startsWith('http:')) && !reference(approval.localHttp)) fail();
    for (const value of [legal.termsUrl, legal.privacyUrl]) {
      const url = new URL(value);
      if (!originAllowed(url) || url.username || url.password || url.hash || url.search || !bounded(value, 2048)) fail();
    }
    const master = json(env.AUTH_KEYRING_JSON);
    if (Object.keys(master).sort().join(',') !== 'current,keys') fail();
    if (!Number.isSafeInteger(master.current) || master.current < 1 || !object(master.keys) || Object.keys(master.keys).length < 1 || Object.keys(master.keys).length > 8 || !Object.hasOwn(master.keys, master.current)) fail();
    const keys = Object.entries(master.keys).map(([version, value]) => {
      if (!/^[1-9][0-9]{0,8}$/.test(version) || !Number.isSafeInteger(+version) || typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) fail();
      const key = Buffer.from(value, 'base64url');
      if (key.length !== 32 || key.toString('base64url') !== value || key.every(b => b === 0)) fail();
      return [+version, key];
    });
    if (new Set(keys.map(([, key]) => key.toString('hex'))).size !== keys.length) fail();
    const keyrings = Object.fromEntries(purposes.map(purpose => [purpose, Object.freeze({ current: master.current,
      keys: Object.freeze(Object.fromEntries(keys.map(([version, key]) => [version,
        Buffer.from(hkdfSync('sha256', key, Buffer.from('modelpromptforge-identity-runtime-v1'), Buffer.from(`${purpose}:${version}`), 32))]))) })]));
    const flags = Object.fromEntries(methods.map(method => [method, enabled.includes(method)]));
    if ((flags.password || flags.google || flags.facebook) && !flags.emailOtp) fail();
    let smtp;
    if (flags.emailOtp || flags.password || flags.facebook) {
      if (!reference(approval.email) || !bounded(env.AUTH_SMTP_HOST, 253) || !/^[A-Za-z0-9.-]+$/.test(env.AUTH_SMTP_HOST) || !['465', '587'].includes(env.AUTH_SMTP_PORT)
        || !bounded(env.AUTH_SMTP_USERNAME, 254) || !bounded(env.AUTH_SMTP_PASSWORD, 4096)) fail();
      const from = normalizeIdentityEmail(env.AUTH_SMTP_FROM).deliveryEmail;
      if (from.endsWith('.invalid')) fail();
      smtp = Object.freeze({ enabled: true, host: env.AUTH_SMTP_HOST, port: +env.AUTH_SMTP_PORT, username: env.AUTH_SMTP_USERNAME, password: env.AUTH_SMTP_PASSWORD, from });
    }
    if (flags.password && (!reference(approval.screening) || env.AUTH_PASSWORD_SCREENING !== 'hibp')) fail();
    const social = {};
    for (const provider of ['google', 'facebook']) {
      if (!flags[provider]) continue;
      const prefix = `AUTH_${provider.toUpperCase()}_`;
      if (!reference(approval[provider]) || !bounded(env[`${prefix}CLIENT_ID`], provider === 'facebook' ? 255 : 512)
        || provider === 'facebook' && !/^[0-9]+$/.test(env[`${prefix}CLIENT_ID`]) || !bounded(env[`${prefix}CLIENT_SECRET`], 2048)) fail();
      const callback = new URL(env[`${prefix}REDIRECT_URI`]);
      if (!origins.includes(callback.origin) || callback.pathname !== `/api/auth/social/${provider}/callback` || callback.search || callback.hash || callback.username || callback.password) fail();
      social[provider] = Object.freeze({ clientId: env[`${prefix}CLIENT_ID`], clientSecret: env[`${prefix}CLIENT_SECRET`], redirectUri: callback.href });
    }
    const config = Object.freeze({ methods: Object.freeze(flags), origins: Object.freeze(origins), cookieMode: local && origins.every(v => v.startsWith('http:')) ? 'local' : 'production',
      legal: Object.freeze({ ...legal, approved: true }), approvals: Object.freeze({ ...approval }), keyrings: Object.freeze(keyrings), smtp,
      social: Object.freeze(social), database: readDatabaseConfig(env), databaseEnv: Object.freeze(Object.fromEntries(Object.entries(env).filter(([k]) => k === 'NODE_ENV' || k.startsWith('DATABASE_')))),
      receiptOrigin: origins[0], localHttp: local });
    qualified.add(config);
    return config;
  } catch { fail(); }
}

export function identityRuntimeQualified(runtime, method = 'core') {
  return qualified.has(runtime) && (method === 'core' || runtime.methods[method] === true || method === 'email' && runtime.methods.emailOtp === true);
}

export function assertIdentityRuntime(runtime, method = 'core') {
  if (!identityRuntimeQualified(runtime, method)) fail();
  return runtime;
}
