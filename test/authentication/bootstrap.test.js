import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { EventEmitter, once } from 'node:events';
import http from 'node:http';
import express from 'express';
import { prepareServerComposition, listenServer } from '../../server/server.js';
import { qualifyAuthRuntime } from '../../server/config/authPolicy.js';
import { IdentityCookies } from '../../server/domain/identity/adapters/identityCookies.js';
import { createRealActorContextMiddleware } from '../../server/middleware/actorContextMiddleware.js';
import { createIdentityAccessMiddleware } from '../../server/middleware/identityAccessMiddleware.js';
import { registerAuthRoutes } from '../../server/app/routes/authRoutes.js';

const runtimeEnv = () => ({ PORT: '6500', NODE_ENV: 'development', AUTH_LOGIN_ENABLED: 'true', AUTH_METHODS: 'emailOtp',
  AUTH_LOCAL_HTTP_APPROVED: 'true', AUTH_ORIGINS_JSON: '["http://127.0.0.1:6500"]',
  AUTH_LEGAL_JSON: JSON.stringify({ termsVersion: 'fixture-v1', privacyVersion: 'fixture-v1', termsUrl: 'http://127.0.0.1:6500/terms', privacyUrl: 'http://127.0.0.1:6500/privacy' }),
  AUTH_APPROVALS_JSON: JSON.stringify(Object.fromEntries(['deployment','legal','retention','email','localHttp'].map(k => [k, 'isolated-fixture-'+k]))),
  AUTH_KEYRING_JSON: JSON.stringify({ current: 1, keys: { 1: randomBytes(32).toString('base64url') } }),
  AUTH_SMTP_HOST: 'mail.example.com', AUTH_SMTP_PORT: '587', AUTH_SMTP_USERNAME: 'fixture', AUTH_SMTP_PASSWORD: 'not-live', AUTH_SMTP_FROM: 'sender@example.com',
  DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:53889/mpf_test_auth' });

test('bootstrap denies unavailable/invalid configuration before protected imports', async () => {
  for (const env of [{}, { AUTH_LOGIN_ENABLED: 'false' }, { AUTH_LOGIN_ENABLED: 'true' },
    { AUTH_DEV_BYPASS_ENABLED: 'true', NODE_ENV: 'production' }, { AUTH_BILLABLE_RECOVERY_ENABLED: 'yes' }]) {
    let imported = 0;
    const result = await prepareServerComposition({ env, initialize: qualifyAuthRuntime,
      loadIdentity: async () => { imported++; throw new Error('secret fixture details'); },
      loadProtected: async () => { imported++; throw new Error('must not import'); } });
    assert.equal(imported, 0); assert.equal(result.app.locals.authRuntimeReady, false);
    assert.equal(result.app.locals.billableRecoveryReady, false);
  }
});
test('schema failure or forged factory readiness cannot import protected app or expose errors', async () => {
  for (const forged of [false, true]) {
    let closed = 0, imported = 0; const reports = [];
    const result = await prepareServerComposition({ env: runtimeEnv(), initialize: qualifyAuthRuntime,
      loadIdentity: async () => ({ createIdentityRuntime: async () => {
        if (!forged) throw new Error('private credential details');
        return { sourceQualified: true, deploymentReady: true, close: async () => { closed++; } };
      }, isIdentityRuntimeDeploymentReady: () => true }),
      loadProtected: async () => { imported++; }, report: event => reports.push(event) });
    assert.equal(imported, 0); assert.equal(result.identityRuntime, undefined); assert.equal(closed, Number(forged));
    assert.deepEqual(reports, [{ code: 'AUTH_RUNTIME_STARTUP_UNAVAILABLE' }]);
  }
});
test('guest listen lifecycle never starts recovery and shuts down HTTP/listeners', async () => {
  const app = express(), signals = new EventEmitter(); app.locals.authRuntimeReady = false; app.locals.billableRecoveryReady = false;
  let recovery = 0;
  const running = await listenServer({ app, authRuntime: { port: 0, host: '127.0.0.1' } },
    { signals, loadRecovery: async () => { recovery++; throw new Error(); } });
  assert.equal(recovery, 0); await running.shutdown(); await running.shutdown();
  assert.equal(running.server.listening, false); assert.equal(signals.listenerCount('SIGTERM'), 0);
});
test('forged readiness cannot start dispatcher or billable recovery', async () => {
  const app = express(), signals = new EventEmitter(); app.locals.authRuntimeReady = true; app.locals.billableRecoveryReady = true;
  let started = 0, closed = 0, recovery = 0;
  await assert.rejects(listenServer({ app, authRuntime: { port: 0, host: '127.0.0.1' },
    identityRuntime: { deploymentReady: true, start: () => { started++; }, close: async () => { closed++; } } },
    { signals, loadRecovery: async () => { recovery++; } }), { code: 'AUTH_RUNTIME_STARTUP_UNAVAILABLE' });
  assert.equal(started, 0); assert.equal(closed, 1); assert.equal(recovery, 0);
});

test('canonical cookie parser separates stale guest restart from malformed/MFA/database failures', async t => {
  const cookies = new IdentityCookies({ mode: 'local', allowedOrigins: ['http://127.0.0.1:6500'], fixtureOnly: true });
  const secret = randomBytes(32).toString('base64url'), issued = new WeakSet(); let failure = 'auth_session_expired', mutations = 0;
  const identity = { cookies, withRequestPeer: async (_peer, work) => work(), unsafe: async () => {},
    async resolveActor(header) {
      if (!cookies.read(header).session) return null;
      if (failure) throw Object.assign(new Error('private database details'), { code: failure });
      const actor = { userId: 'owned', authMode: 'session', isMockActor: false, accountStatus: 'active', securityVersion: 1 };
      issued.add(actor); return actor;
    }, actorProof(actor) { assert.ok(issued.has(actor)); },
    config: async header => ({ body: { session: cookies.read(header).session ?? null } }),
    loginPassword: async request => { assert.equal(cookies.read(request.cookieHeader).session, undefined); mutations++; return { body: { nextAction: 'fixture_login' } }; },
  };
  const app = express(); app.use(createRealActorContextMiddleware({ identityApplicationService: identity }));
  app.use('/api/auth', express.json({ limit: '32kb' })); app.use('/api/auth', express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 16 }));
  app.use('/api/auth', (error, req, res, next) => error ? res.status(error.type === 'entity.too.large' ? 413 : 400).json({ code: 'auth_forbidden' }) : next());
  registerAuthRoutes(app, { identityApplicationService: identity }); app.use(createIdentityAccessMiddleware({ identityApplicationService: identity }));
  app.use(express.json({ limit: '20mb' }));
  app.get('/api/community/posts', (req, res) => res.json({ actor: req.actorContext }));
  app.get('/api/private-fixture', (req, res) => res.json({ owner: req.actorContext.userId }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  const cookie = `${cookies.names.session}=${secret}`;
  const call = (path, extra = {}) => new Promise((resolve, reject) => {
    const request = http.request(url+path, { headers: { cookie }, ...extra }, response => {
      let body = ''; response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, json: async () => JSON.parse(body) }));
    }); request.on('error', reject); request.end(extra.body);
  });
  try {
    await t.test('stale valid cookie permits exact public/null and fresh Login but no private authority', async () => {
      assert.deepEqual(await (await call('/api/community/posts')).json(), { actor: null });
      assert.deepEqual(await (await call('/api/auth/config')).json(), { session: null });
      assert.equal((await call('/api/private-fixture')).status, 401);
      assert.equal((await call('/api/auth/future-endpoint')).status, 401);
      assert.equal((await call('/api/auth/login', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: '{}' })).status, 200);
      assert.equal(mutations, 1);
    });
    await t.test('malformed or duplicate cookie never reaches public/config handlers', async () => {
      for (const value of [`${cookies.names.session}=bad`, `${cookie}; ${cookie}`])
        for (const path of ['/api/community/posts', '/api/auth/config'])
          assert.equal((await call(path, { headers: { cookie: value } })).status, 403);
    });
    await t.test('MFA/account policy and database failures deny even public fresh config', async () => {
      for (const [code, status] of [['auth_mfa_required',403], ['auth_forbidden',403], ['DATABASE_OPERATION_FAILED',503]]) {
        failure = code;
        const response = await call('/api/auth/config'); assert.equal(response.status, status);
        assert.equal(JSON.stringify(await response.json()).includes('private database'), false);
      }
    });
    await t.test('facade-issued actor admits private reads; mock headers confer no authority', async () => {
      failure = null; assert.deepEqual(await (await call('/api/private-fixture')).json(), { owner: 'owned' });
      assert.equal((await call('/api/private-fixture', { headers: { 'x-mpf-user-id': 'usr_demo' } })).status, 401);
    });
    await t.test('Auth JSON and form payloads stop at32KiB before generic20MiB parser', async () => {
      failure = 'auth_session_expired';
      for (const [type, body] of [['application/json', JSON.stringify({ password: 'x'.repeat(33000) })],
        ['application/x-www-form-urlencoded', 'password='+ 'x'.repeat(33000)]]) {
        const response = await call('/api/auth/login', { method: 'POST', headers: { cookie, 'content-type': type }, body });
        assert.equal(response.status, 413); assert.equal(mutations, 1);
      }
    });
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('production mount contract places real Auth and admission before protected handlers/owned outputs', async () => {
  const source = await readFile(new URL('../../server/app/createApp.js', import.meta.url), 'utf8');
  const positions = ['app.use(createRealActorContextMiddleware', "express.json({ limit: '32kb' })", 'registerAuthRoutes(app',
    'app.use(createIdentityAccessMiddleware', "express.json({ limit: process.env.JSON_BODY_LIMIT", 'registerAssetRoutes(app', 'registerCreditRoutes(app'].map(value => source.indexOf(value));
  assert.ok(positions.every(p => p >= 0)); assert.deepEqual([...positions].sort((a,b) => a-b), positions);
  assert.match(source, /isIdentityRuntimeDeploymentReady\(identityRuntime\)/);
  assert.match(source, /app\.locals\.authRuntimeReady && billableRecoveryReady === true/);
  assert.doesNotMatch(source, /express\.static\(OUTPUTS_DIR\)/);
});
