import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { IdentityCookies } from '../../server/domain/identity/adapters/identityCookies.js';
test('protected cookie policy is explicit, strict and mode isolated', () => {
  const secret = randomBytes(32).toString('base64url'),
    prod = new IdentityCookies({ mode: 'production', allowedOrigins: ['https://app.example.invalid'] });
  const local = new IdentityCookies({
    mode: 'local',
    allowedOrigins: ['http://127.0.0.1:3000'],
    fixtureOnly: true,
  });
  assert.match(
    prod.set('session', secret),
    /__Host-mpf_session=.*; Path=\/; HttpOnly; SameSite=Lax; Secure$/
  );
  assert.doesNotMatch(prod.set('session', secret), /Max-Age|Domain/);
  assert.match(prod.set('session', secret, 30), /Max-Age=30/);
  assert.throws(() => prod.read(`__Host-mpf_session=${secret}; __Host-mpf_session=${secret}`));
  assert.throws(() => prod.read(`mpf_local_session=${secret}`));
  assert.throws(() => local.read(`__Host-mpf_context=${secret}`));
  for (const value of ['x', 'a'.repeat(9000), '\r\n'])
    assert.throws(() => prod.read(`__Host-mpf_session=${value}`));
  assert.throws(() => prod.origin('https://app.example.invalid.evil.invalid'));
  assert.throws(
    () => new IdentityCookies({ mode: 'production', allowedOrigins: ['http://app.example.invalid'] })
  );
  assert.throws(
    () => new IdentityCookies({ mode: 'local', allowedOrigins: ['http://remote.invalid'], fixtureOnly: true })
  );
});
