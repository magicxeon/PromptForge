import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHmac } from 'node:crypto';
import { IdentityFacebookAdapter } from '../../server/domain/identity/adapters/IdentityFacebookAdapter.js';
const now = Date.now(), secret = () => randomBytes(32).toString('base64url');
const make = (changes = {}, overrides = {}) => new IdentityFacebookAdapter({
  clientId: '123456', clientSecret: 'fixture-secret', fixtureOnly: true,
  redirectUri: 'http://127.0.0.1/api/auth/social/facebook/callback', clock: { now: () => now },
  fetch: async (url, options) => {
    const uri = new URL(url);
    assert.equal(uri.origin, 'https://graph.facebook.com');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal);
    let value;
    if (uri.pathname.endsWith('/oauth/access_token')) value = { access_token: 'fixture-token', expires_in: 300 };
    else if (uri.pathname.endsWith('/debug_token')) {
      assert.equal(uri.searchParams.get('access_token'), '123456|fixture-secret');
      value = { data: { app_id: '123456', type: 'USER', user_id: '998877', is_valid: true,
        expires_at: Math.floor(now/1000)+300, data_access_expires_at: Math.floor(now/1000)+300, ...changes } };
    } else {
      assert.equal(uri.pathname, '/v26.0/me');
      assert.equal(uri.searchParams.get('fields'), 'id');
      assert.equal(options.headers.authorization, 'Bearer fixture-token');
      assert.equal(uri.searchParams.get('appsecret_proof'), createHmac('sha256', 'fixture-secret').update('fixture-token').digest('hex'));
      value = { id: '998877', email: 'untrusted@example.invalid' };
    }
    return new Response(JSON.stringify(value));
  }, ...overrides,
});
const exchange = (adapter) => adapter.exchange({ code: 'fixture-code', expiresAt: new Date(now+15000) });
test('Facebook validates native app-scoped subject, with independent email proof', async () => {
  const adapter = make(), url = new URL(adapter.authorization({ state: secret() }));
  assert.equal(url.origin, 'https://www.facebook.com');
  assert.equal(url.pathname, '/v26.0/dialog/oauth');
  assert.equal(url.searchParams.get('scope'), 'public_profile,email');
  assert.equal(url.searchParams.has('nonce'), false);
  assert.equal(url.searchParams.has('code_challenge'), false);
  assert.deepEqual(Object.keys(await exchange(adapter)), ['provider','issuer','subject','email','expiresAt']);
  assert.equal((await exchange(adapter)).email, null);
  assert.equal((await exchange(adapter)).issuer, 'https://www.facebook.com/123456');
});
test('Facebook foreign app, invalid type/subject, token and data-access expiry reject', async () => {
  for (const changes of [{ app_id: 'foreign' }, { is_valid: false }, { type: 'APP' },
    { user_id: 'fabricated' }, { expires_at: 0 }, { data_access_expires_at: 0 }]) await assert.rejects(exchange(make(changes)));
});
test('Facebook profile subject mismatch, oversized body and redirect reject', async () => {
  for (const fetch of [async (url) => new Response(JSON.stringify(url.includes('/oauth/access_token') ? { access_token: 'fixture-token', expires_in: 300 } : url.includes('/debug_token') ? { data: { app_id: '123456', type: 'USER', user_id: '998877', is_valid: true, expires_at: Math.floor(now/1000)+300, data_access_expires_at: Math.floor(now/1000)+300 } } : { id: 'another-subject' })),
    async () => new Response('x'.repeat(262145)), async () => ({ ok: true, redirected: true })])
    await assert.rejects(exchange(make({}, { fetch })));
});
test('Facebook provider deadline and inactive runtime fail closed', async () => {
  await assert.rejects(make().exchange({ code: 'code', expiresAt: new Date(now) }));
  assert.throws(() => make({}, { fixtureOnly: false }).authorization({ state: secret() }));
  assert.throws(() => make({}, { redirectUri: 'https://attacker.invalid/api/auth/social/google/callback' }));
});
const sign = (payload, key = 'fixture-secret') => {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${createHmac('sha256',key).update(encoded).digest('base64url')}.${encoded}`;
};
test('Facebook signed callbacks verify exact HMAC before trusting event fields', () => {
  const payload = { algorithm: 'HMAC-SHA256', user_id: '998877', issued_at: Math.floor(now/1000) };
  const value = make().signedEvent(sign(payload));
  assert.equal(value.subject, '998877');
  assert.equal(value.issuedAt, payload.issued_at*1000);
  assert.equal(Object.hasOwn(value, 'access_token'), false);
  for (const request of [sign(payload,'foreign-secret'), sign({ ...payload, algorithm: 'none' }),
    sign({ ...payload, user_id: 'foreign-id' }), sign({ ...payload, issued_at: '1' }), 'abc.def.extra'])
    assert.throws(() => make().signedEvent(request));
});
