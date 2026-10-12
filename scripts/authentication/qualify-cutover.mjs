import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import http from 'node:http';
import express from 'express';
import { withDisposableAuthDatabase } from './fixtures.mjs';
import { readIdentityRuntimeConfig } from '../../server/config/identityRuntime.js';
import { createIdentityRuntime, isIdentityRuntimeComposition, isIdentityRuntimeDeploymentReady } from '../../server/domain/identity/createIdentityRuntime.js';
import { runMigrations } from '../../server/repositories/postgres/migrations.js';
import { migrations } from '../../server/repositories/postgres/migrationRegistry.js';
import { createRealActorContextMiddleware } from '../../server/middleware/actorContextMiddleware.js';
import { createIdentityAccessMiddleware } from '../../server/middleware/identityAccessMiddleware.js';
import { registerAuthRoutes } from '../../server/app/routes/authRoutes.js';
import { prepareServerComposition } from '../../server/server.js';
import { qualifyAuthRuntime } from '../../server/config/authPolicy.js';

test('cutover canonical disposable session: owner admission, stale guest restart and fixture recovery exclusion', async t => {
  await withDisposableAuthDatabase(process.env, async ({ database, schema }) => {
    const app = express(), server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    const origin = `http://127.0.0.1:${server.address().port}`, messages = [], jar = new Map(); let csrf, composition;
    const env = { PORT: '6500', NODE_ENV: 'development', AUTH_LOGIN_ENABLED: 'true', AUTH_METHODS: 'emailOtp',
      AUTH_LOCAL_HTTP_APPROVED: 'true', AUTH_ORIGINS_JSON: JSON.stringify([origin]),
      AUTH_LEGAL_JSON: JSON.stringify({ termsVersion: 'fixture-v1', privacyVersion: 'fixture-v1', termsUrl: origin+'/terms', privacyUrl: origin+'/privacy' }),
      AUTH_APPROVALS_JSON: JSON.stringify(Object.fromEntries(['deployment','legal','retention','email','localHttp'].map(k => [k, 'isolated-fixture-'+k]))),
      AUTH_KEYRING_JSON: JSON.stringify({ current: 1, keys: { 1: randomBytes(32).toString('base64url') } }),
      AUTH_SMTP_HOST: 'mail.example.com', AUTH_SMTP_PORT: '587', AUTH_SMTP_USERNAME: 'fixture', AUTH_SMTP_PASSWORD: 'not-live', AUTH_SMTP_FROM: 'sender@example.com', DATABASE_URL: process.env.MPF_TEST_DATABASE_URL };
    try {
      await runMigrations(database, migrations.map(m => ({ ...m, sql: m.sql.replaceAll('"public"', `"${schema}"`) })), { mode: 'apply', schema });
      composition = await createIdentityRuntime({ runtime: readIdentityRuntimeConfig(env), database, schema,
        fixtureTransports: { fetch: async () => { throw new Error('external network forbidden'); }, smtpTransportFactory: () => ({
          name: 'isolated-cutover', version: '1', send(mail, done) { messages.push({ to: mail.data.envelope.to[0], text: mail.data.text });
            done(null, { accepted: mail.data.envelope.to, messageId: mail.data.messageId }); }, close() {} }) } });
      const identity = composition.identityApplicationService;
      identity.publicPolicy = { project: () => ({ ...composition.publicPolicy.project(), methods: { emailOtp: true, password: false, google: false, facebook: false } }) };
      app.use(createRealActorContextMiddleware({ identityApplicationService: identity })); app.use('/api/auth', express.json({ limit: '32kb' }));
      registerAuthRoutes(app, { identityApplicationService: identity }); app.use(createIdentityAccessMiddleware({ identityApplicationService: identity }));
      app.get('/api/private-fixture', (req, res) => res.json({ owner: req.actorContext.userId }));
      app.get('/api/community/posts', (req, res) => res.json({ viewer: req.actorContext?.userId ?? null }));
      const call = (path, body) => new Promise((resolve, reject) => {
        const request = http.request(origin+path, { method: body === undefined ? 'GET' : 'POST', headers: {
          origin, cookie: [...jar].map(([k,v]) => `${k}=${v}`).join('; '), ...(csrf ? { 'x-csrf-token': csrf } : {}),
          ...(body === undefined ? {} : { 'content-type': 'application/json', 'idempotency-key': randomUUID() }) } }, response => {
          let raw = ''; response.on('data', chunk => { raw += chunk; }); response.on('end', () => {
            for (const cookie of response.headers['set-cookie'] ?? []) { const [k,v] = cookie.split(';')[0].split('='); if (v) jar.set(k,v); else jar.delete(k); }
            const result = JSON.parse(raw); if (result.csrfToken) csrf = result.csrfToken; resolve({ status: response.statusCode, body: result });
          });
        }); request.on('error', reject); request.end(body === undefined ? undefined : JSON.stringify(body));
      });
      const email = `${randomUUID()}@example.com`;
      await t.test('canonical OTP activation admits durable stable owner without mock claims', async () => {
        assert.equal((await call('/api/auth/config')).status, 200);
        const issued = await call('/api/auth/challenges', { purpose: 'registration', email }); assert.equal(issued.status, 202);
        await composition.dispatch(); const code = messages.at(-1).text.match(/\b[0-9]{6}\b/)[0];
        assert.equal((await call(`/api/auth/challenges/${issued.body.challengeId}/verify`, { code })).body.nextAction, 'complete_registration');
        const enrolled = await call('/api/auth/register', { displayName: 'Cutover fixture', termsAccepted: true, termsVersion: 'fixture-v1', privacyVersion: 'fixture-v1' });
        assert.equal(enrolled.body.nextAction, 'authenticated');
        const read = await call('/api/private-fixture'); assert.equal(read.status, 200); assert.ok(read.body.owner); assert.notEqual(read.body.owner, 'usr_demo');
      });
      await t.test('actual SQL revocation preserves public-null and fresh config while private reads deny', async () => {
        await database.query(`UPDATE "${schema}".identity_sessions SET revoked_at=now()`);
        assert.equal((await call('/api/private-fixture')).status, 401);
        assert.deepEqual(await call('/api/community/posts'), { status: 200, body: { viewer: null } });
        assert.equal((await call('/api/auth/config')).status, 200);
        const newFlow = await call('/api/auth/challenges', { purpose: 'login', email: `${randomUUID()}@example.com` });
        assert.equal(newFlow.status, 202, JSON.stringify(newFlow.body));
      });
      await t.test('genuine injected composition is branded but cannot activate production or recovery', async () => {
        assert.equal(isIdentityRuntimeComposition(composition), true); assert.equal(isIdentityRuntimeDeploymentReady(composition), false);
        assert.equal(isIdentityRuntimeComposition({ ...composition, deploymentReady: true }), false);
        let protectedImports = 0;
        const prepared = await prepareServerComposition({ env: { ...env, AUTH_BILLABLE_RECOVERY_ENABLED: 'true' }, initialize: qualifyAuthRuntime,
          loadIdentity: async () => ({ createIdentityRuntime: async () => composition }),
          loadProtected: async () => { protectedImports++; throw new Error('must not import'); } });
        assert.equal(protectedImports, 0); assert.equal(prepared.app.locals.billableRecoveryReady, false);
        assert.equal(prepared.identityRuntime, undefined);
      });
    } finally { await composition?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  });
});
