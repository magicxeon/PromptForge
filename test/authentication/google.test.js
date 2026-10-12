import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { randomBytes } from 'node:crypto';
import { IdentityGoogleAdapter } from '../../server/domain/identity/adapters/IdentityGoogleAdapter.js';
const pair = await generateKeyPair('RS256'),
  jwk = { ...(await exportJWK(pair.publicKey)), kid: 'fixture', alg: 'RS256' };
const secret = () => randomBytes(32).toString('base64url');
const nonce = secret(),
  now = Date.now(),
  clock = { now: () => now };
const sign = (claims = {}, key = pair.privateKey) =>
  new SignJWT({
    nonce,
    email: 'fixture@example.invalid',
    email_verified: true,
    hd: 'example.invalid',
    ...claims,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'fixture' })
    .setIssuer('https://accounts.google.com')
    .setAudience('fixture-client')
    .setSubject('fixture-subject')
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor(now / 1000) + 300)
    .sign(key);
const make = (token, changes = {}) =>
  new IdentityGoogleAdapter({
    clientId: 'fixture-client',
    clientSecret: 'fixture-secret',
    redirectUri: 'http://127.0.0.1/api/auth/social/google/callback',
    fixtureOnly: true,
    clock,
    fetch: async (url, options) => {
      assert.equal(options.redirect, 'error');
      assert.ok(options.signal);
      return new Response(JSON.stringify(url.endsWith('/token') ? { id_token: token } : { keys: [jwk] }), {
        headers: { 'content-type': 'application/json' },
      });
    },
    ...changes,
  });
const exchange = (adapter) =>
  adapter.exchange({ code: 'fixture-code', verifier: secret(), nonce, expiresAt: new Date(now + 15000) });
test('Google signed OIDC tokens use subject and authoritative email only', async () => {
  const result = await exchange(make(await sign()));
  assert.equal(result.subject, 'fixture-subject');
  assert.equal(result.email.canonicalEmail, 'fixture@example.invalid');
  assert.equal((await exchange(make(await sign({ hd: undefined })))).email, null);
  assert.equal((await exchange(make(await sign({ email_verified: false })))).email, null);
  assert.equal(
    (await exchange(make(await sign({ email: 'fixture@gmail.com', hd: undefined })))).email.canonicalEmail,
    'fixture@gmail.com'
  );
});
test('Google wrong nonce, azp and signature fail closed', async () => {
  for (const claims of [{ nonce: secret() }, { azp: 'another-client' }])
    await assert.rejects(exchange(make(await sign(claims))));
  const other = await generateKeyPair('RS256');
  await assert.rejects(exchange(make(await sign({}, other.privateKey))));
});
test('Google invalid audience, issuer, expiry and algorithm fail', async () => {
  for (const change of ['audience', 'issuer', 'expiry', 'algorithm']) {
    let jwt = new SignJWT({ nonce })
      .setProtectedHeader({ alg: change === 'algorithm' ? 'PS256' : 'RS256', kid: 'fixture' })
      .setIssuer(change === 'issuer' ? 'https://attacker.invalid' : 'https://accounts.google.com')
      .setAudience(change === 'audience' ? 'another-client' : 'fixture-client')
      .setSubject('subject')
      .setIssuedAt(Math.floor(now / 1000))
      .setExpirationTime(Math.floor(now / 1000) + (change === 'expiry' ? -1 : 60));
    const key = change === 'algorithm' ? (await generateKeyPair('PS256')).privateKey : pair.privateKey;
    await assert.rejects(exchange(make(await jwt.sign(key))));
  }
});
test('Google transport bounds, redirects and production gate deny', async () => {
  await assert.rejects(exchange(make('', { fetch: async () => new Response('x'.repeat(262145)) })));
  await assert.rejects(exchange(make('', { fetch: async () => ({ ok: true, redirected: true }) })));
  assert.throws(() => make('', { fixtureOnly: false }));
  const url = new URL(make('').authorization({ state: secret(), nonce, verifier: secret() }));
  assert.equal(url.origin, 'https://accounts.google.com');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
});
