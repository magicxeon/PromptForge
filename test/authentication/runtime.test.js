import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { readIdentityRuntimeConfig, identityRuntimeQualified } from '../../server/config/identityRuntime.js';
import { IdentityPasswordScreeningAdapter } from '../../server/domain/identity/adapters/IdentityPasswordScreeningAdapter.js';
import { renderIdentityEmail } from '../../server/domain/identity/adapters/IdentityEmailRenderer.js';

const key = randomBytes(32).toString('base64url');
const env = () => ({ NODE_ENV: 'development', AUTH_LOGIN_ENABLED: 'true', AUTH_METHODS: 'password,emailOtp,google,facebook',
  AUTH_LOCAL_HTTP_APPROVED: 'true', AUTH_ORIGINS_JSON: '["http://127.0.0.1:53890"]',
  AUTH_LEGAL_JSON: JSON.stringify({ termsVersion: 'fixture-terms-v1', privacyVersion: 'fixture-privacy-v1', termsUrl: 'http://127.0.0.1:53890/terms', privacyUrl: 'http://127.0.0.1:53890/privacy' }),
  AUTH_APPROVALS_JSON: JSON.stringify(Object.fromEntries(['deployment', 'legal', 'retention', 'email', 'google', 'facebook', 'screening', 'localHttp'].map(k => [k, `isolated-fixture-${k}`]))),
  AUTH_KEYRING_JSON: JSON.stringify({ current: 1, keys: { 1: key } }), AUTH_PASSWORD_SCREENING: 'hibp',
  AUTH_SMTP_HOST: 'mail.example.com', AUTH_SMTP_PORT: '587', AUTH_SMTP_USERNAME: 'fixture', AUTH_SMTP_PASSWORD: 'fixture-not-live', AUTH_SMTP_FROM: 'sender@example.com',
  AUTH_GOOGLE_CLIENT_ID: 'fixture-google', AUTH_GOOGLE_CLIENT_SECRET: 'fixture-secret', AUTH_GOOGLE_REDIRECT_URI: 'http://127.0.0.1:53890/api/auth/social/google/callback',
  AUTH_FACEBOOK_CLIENT_ID: '123456', AUTH_FACEBOOK_CLIENT_SECRET: 'fixture-secret', AUTH_FACEBOOK_REDIRECT_URI: 'http://127.0.0.1:53890/api/auth/social/facebook/callback',
  DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:53889/mpf_test_auth' });

test('runtime requires explicit trusted qualification; cloning flags cannot qualify', () => {
  assert.equal(readIdentityRuntimeConfig({}), null);
  assert.equal(readIdentityRuntimeConfig({ AUTH_LOGIN_ENABLED: 'false' }), null);
  const runtime = readIdentityRuntimeConfig(env());
  assert.equal(identityRuntimeQualified(runtime), true);
  assert.equal(identityRuntimeQualified({ ...runtime }), false);
  assert.equal(identityRuntimeQualified({ methods: { password: true }, productionApproved: true }), false);
  assert.throws(() => new IdentityPasswordScreeningAdapter({ runtime: { ...runtime }, fetch: async () => {} }));
});
test('persistent HKDF keyrings preserve versions across restart and separate every purpose', () => {
  const a = readIdentityRuntimeConfig(env()), b = readIdentityRuntimeConfig(env());
  const values = Object.entries(a.keyrings).map(([purpose, ring]) => {
    assert.deepEqual(ring.keys[1], b.keyrings[purpose].keys[1]);
    return ring.keys[1].toString('hex');
  });
  assert.equal(new Set(values).size, values.length);
  const rotated = readIdentityRuntimeConfig({ ...env(), AUTH_KEYRING_JSON: JSON.stringify({ current: 2, keys: { 1: key, 2: randomBytes(32).toString('base64url') } }) });
  assert.deepEqual(rotated.keyrings.browser.keys[1], a.keyrings.browser.keys[1]);
  assert.equal(rotated.keyrings.browser.current, 2);
});
test('invalid config, unapproved origin, absent keys/legal/vendor or fixture sender deny', () => {
  for (const override of [{ AUTH_LOGIN_ENABLED: 'TRUE' }, { AUTH_DEV_BYPASS_ENABLED: 'true' }, { AUTH_METHODS: 'password' }, { AUTH_METHODS: 'google' },
    { AUTH_KEYRING_JSON: '{}' }, { AUTH_APPROVALS_JSON: '{}' }, { AUTH_LEGAL_JSON: '{}' }, { AUTH_PASSWORD_SCREENING: 'accept-all' },
    { AUTH_ORIGINS_JSON: '["http://localhost:53890"]' }, { NODE_ENV: 'production' }, { AUTH_SMTP_FROM: 'sender@example.invalid' },
    { AUTH_GOOGLE_REDIRECT_URI: 'https://foreign.example/api/auth/social/google/callback' }])
    assert.throws(() => readIdentityRuntimeConfig({ ...env(), ...override }), { code: 'AUTH_RUNTIME_CONFIGURATION_INVALID' });
});
test('HIBP screening sends only prefix with padding; positive count rejects and padding zeros do not', async () => {
  const password = 'A complete fixture password', digest = createHash('sha1').update(password).digest('hex').toUpperCase();
  for (const count of [0, 9]) {
    const adapter = new IdentityPasswordScreeningAdapter({ runtime: readIdentityRuntimeConfig(env()), fetch: async (url, options) => {
      assert.equal(url, `https://api.pwnedpasswords.com/range/${digest.slice(0, 5)}`);
      assert.equal(url.includes(password), false); assert.equal(url.includes(digest), false);
      assert.equal(options.headers['Add-Padding'], 'true'); assert.equal(options.redirect, 'error'); assert.ok(options.signal);
      return new Response(`${digest.slice(5)}:${count}\r\n${'0'.repeat(35)}:0\r\n`);
    } });
    assert.deepEqual(await adapter.check(password), { compromised: count > 0 });
  }
});
test('screening malformed, oversized, redirected or unavailable responses fail closed', async () => {
  for (const fetch of [async () => new Response('invalid'), async () => new Response('0'.repeat(1048577)),
    async () => new Response('unavailable', { status: 503 }), async () => { throw new Error('Private transport details'); }]) {
    const adapter = new IdentityPasswordScreeningAdapter({ runtime: readIdentityRuntimeConfig(env()), fetch });
    await assert.rejects(adapter.check('A complete fixture password'), { code: 'IDENTITY_PASSWORD_UNAVAILABLE' });
  }
});
test('screening follows password code-point policy while hashing complete UTF-8 Unicode secret', async () => {
  const password = '🔑'.repeat(80), digest = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  assert.ok(password.length > 128);
  const adapter = new IdentityPasswordScreeningAdapter({ runtime: readIdentityRuntimeConfig(env()), fetch: async url => {
    assert.equal(url, `https://api.pwnedpasswords.com/range/${digest.slice(0, 5)}`);
    return new Response(`${digest.slice(5)}:0\r\n`);
  } });
  assert.deepEqual(await adapter.check(password), { compromised: false });
});
test('real recipient rendering needs genuine brand; fixture restriction remains', () => {
  const message = { to: 'customer@example.com', code: '123456', templatePurpose: 'login', locale: 'en', issuedAt: new Date(), expiresAt: new Date(Date.now() + 300000) };
  assert.throws(() => renderIdentityEmail(message), { code: 'IDENTITY_EMAIL_TEMPLATE_REJECTED' });
  assert.throws(() => renderIdentityEmail(message, { runtime: {} }), { code: 'IDENTITY_EMAIL_TEMPLATE_REJECTED' });
  assert.match(renderIdentityEmail(message, { runtime: readIdentityRuntimeConfig(env()) }).text, /123456/);
});
