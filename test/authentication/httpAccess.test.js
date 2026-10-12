import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { requestOwnedHttp } from '../../scripts/authentication/fixtures.mjs';
import { optionalIdentityReadPaths, permitsOptionalIdentityRead } from '../../server/config/identityAccessPolicy.js';
import { createIdentityAccessMiddleware } from '../../server/middleware/identityAccessMiddleware.js';

test('real Identity HTTP admission preserves public reads and denies private bypass before handlers', async t => {
  const owned = new WeakSet();
  let revoked = false, mutations = 0, privateReads = 0;
  const actor = () => {
    const value = Object.freeze({ userId: 'fixture_owner', username: 'fixture_owner', authMode: 'session',
      isMockActor: false, accountStatus: 'active', securityVersion: 1, role: 'user' });
    owned.add(value); return value;
  };
  const denied = code => { throw Object.assign(new Error('Private internal test detail'), { code }); };
  const identity = {
    actorProof(value) { if (!owned.has(value)) denied('auth_forbidden'); },
    async resolveActor(cookie) { return revoked || cookie !== 'fixture_session' ? null : actor(); },
    async unsafe({ cookieHeader, origin, csrfToken }) {
      if (origin !== 'http://127.0.0.1:5173' || csrfToken !== 'fixture_csrf' || cookieHeader !== 'fixture_session')
        denied('auth_forbidden');
    },
  };
  const app = express();
  app.use(async (req, res, next) => {
    req.requestId = 'fixture_request';
    req.actorContext = req.headers['x-fixture-forged'] ? { ...actor() } : await identity.resolveActor(req.headers.cookie);
    next();
  });
  app.use(createIdentityAccessMiddleware({ identityApplicationService: identity }));
  app.get('/api/community/posts', (req, res) => res.json({ public: true, actor: req.actorContext?.userId ?? null }));
  app.get('/api/private-fixture', (req, res) => { privateReads++; res.json({ owner: req.actorContext.userId }); });
  app.post('/api/private-fixture', (req, res) => { mutations++; res.json({ changed: true }); });
  app.get('/api/admin/fixture', (req, res) => res.json({ staff: true }));
  app.get('/outputs/fixture.png', (req, res) => { privateReads++; res.send('fixture bytes'); });
  app.get('/api/fixture-progress', async (req, res) => {
    revoked = true;
    try { await req.reauthorizeIdentity(); res.send('private progress'); }
    catch { res.status(401).end(); }
  });
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, options = {}) => requestOwnedHttp(base + path, options);
  try {
    await t.test('anonymous public feed remains null; neighboring private reads and media HEAD deny', async () => {
      assert.deepEqual(await (await call('/api/community/posts')).json(), { public: true, actor: null });
      for (const [path, method] of [['/api/private-fixture', 'GET'], ['/outputs/fixture.png', 'HEAD']]) {
        const response = await call(path, { method, headers: { 'x-mpf-user-id': 'usr_demo' } });
        assert.equal(response.status, 401); assert.equal(response.headers.get('cache-control'), 'no-store');
      }
      assert.equal(privateReads, 0);
      assert.equal(permitsOptionalIdentityRead('GET', '/api/community/posts/foreign/comments'), false);
      assert.equal(permitsOptionalIdentityRead('POST', '/api/community/posts'), false);
    });
    await t.test('facade-issued active actor admits private owner; fabricated actor and staff claims deny', async () => {
      assert.deepEqual(await (await call('/api/private-fixture', { headers: { cookie: 'fixture_session' } })).json(), { owner: 'fixture_owner' });
      assert.equal((await call('/api/private-fixture', { headers: { 'x-fixture-forged': 'true' } })).status, 403);
      assert.equal((await call('/api/admin/fixture', { headers: { cookie: 'fixture_session', 'x-user-role': 'admin' } })).status, 403);
      assert.equal(privateReads, 1);
    });
    await t.test('unsafe private entry requires exact Origin and CSRF before mutation', async () => {
      for (const headers of [{ cookie: 'fixture_session' },
        { cookie: 'fixture_session', origin: 'http://attacker.invalid', 'x-csrf-token': 'fixture_csrf' }]) {
        const response = await call('/api/private-fixture', { method: 'POST', headers });
        assert.equal(response.status, 403); assert.equal(mutations, 0);
        assert.equal(JSON.stringify(await response.json()).includes('Private internal'), false);
      }
      assert.equal((await call('/api/private-fixture', { method: 'POST', headers: {
        cookie: 'fixture_session', origin: 'http://127.0.0.1:5173', 'x-csrf-token': 'fixture_csrf',
      } })).status, 200);
      assert.equal(mutations, 1);
    });
    await t.test('stream owner can reauthorize and stop output after revocation without a mock fallback', async () => {
      const response = await call('/api/fixture-progress', { headers: { cookie: 'fixture_session' } });
      assert.equal(response.status, 401); assert.equal(await response.text(), '');
      assert.equal((await call('/api/private-fixture', { headers: { cookie: 'fixture_session' } })).status, 401);
    });
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('public endpoint policy is exact and covers each approved literal and constrained media expansion', () => {
  for (const pattern of optionalIdentityReadPaths) {
    const path = pattern.replace(/:[A-Za-z]+\(([^)]+)\)/g, (_, alternatives) => alternatives.split('|')[0])
      .replace(/:[A-Za-z]+/g, 'fixture');
    assert.equal(permitsOptionalIdentityRead('GET', path), true, path);
    assert.equal(permitsOptionalIdentityRead('HEAD', path + '/'), true, path);
    assert.equal(permitsOptionalIdentityRead('GET', path + '/private/unregistered/endpoint/more'), false, path);
    assert.equal(permitsOptionalIdentityRead('DELETE', path), false, path);
  }
  for (const path of ['/api/templates/fixture/pose-proxy/private', '/api/community/posts/fixture/private',
    '/api/community/characters/fixture/handoffs', '/api/templates/%2fprivate', '/api/auth/unknown'])
    assert.equal(permitsOptionalIdentityRead('GET', path), false, path);
});
