import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import http from 'node:http';
import { once } from 'node:events';
import express from 'express';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { withDisposableAuthDatabase, createFakeClock } from './fixtures.mjs';
import { readIdentityRuntimeConfig } from '../../server/config/identityRuntime.js';
import { createIdentityRuntime } from '../../server/domain/identity/createIdentityRuntime.js';
import { runMigrations } from '../../server/repositories/postgres/migrations.js';
import { migrations } from '../../server/repositories/postgres/migrationRegistry.js';
import { registerAuthRoutes } from '../../server/app/routes/authRoutes.js';
import { registerIdentityRoutes } from '../../server/app/routes/identityRoutes.js';
import { createRealActorContextMiddleware } from '../../server/middleware/actorContextMiddleware.js';

test('canonical qualified Login factory: owned HTTP, disposable SQL, private fake native transports', async t => {
  await withDisposableAuthDatabase(process.env, async ({ database, schema }) => {
    const s = `"${schema}"`, clock = createFakeClock(Date.now()), app = express(), server = http.createServer(app);
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const origin = `http://127.0.0.1:${server.address().port}`, master = randomBytes(32).toString('base64url');
    const env = { NODE_ENV: 'development', AUTH_LOGIN_ENABLED: 'true', AUTH_METHODS: 'password,emailOtp,google,facebook',
      AUTH_LOCAL_HTTP_APPROVED: 'true', AUTH_ORIGINS_JSON: JSON.stringify([origin]),
      AUTH_LEGAL_JSON: JSON.stringify({ termsVersion: 'fixture-terms-v1', privacyVersion: 'fixture-privacy-v1', termsUrl: `${origin}/terms`, privacyUrl: `${origin}/privacy` }),
      AUTH_APPROVALS_JSON: JSON.stringify(Object.fromEntries(['deployment', 'legal', 'retention', 'email', 'google', 'facebook', 'screening', 'localHttp'].map(k => [k, `isolated-fixture-${k}`]))),
      AUTH_KEYRING_JSON: JSON.stringify({ current: 1, keys: { 1: master } }), AUTH_PASSWORD_SCREENING: 'hibp',
      AUTH_SMTP_HOST: 'mail.example.com', AUTH_SMTP_PORT: '587', AUTH_SMTP_USERNAME: 'fixture', AUTH_SMTP_PASSWORD: 'fixture-not-live', AUTH_SMTP_FROM: 'sender@example.com',
      AUTH_GOOGLE_CLIENT_ID: 'fixture-google', AUTH_GOOGLE_CLIENT_SECRET: 'fixture-secret', AUTH_GOOGLE_REDIRECT_URI: `${origin}/api/auth/social/google/callback`,
      AUTH_FACEBOOK_CLIENT_ID: '123456', AUTH_FACEBOOK_CLIENT_SECRET: 'fixture-secret', AUTH_FACEBOOK_REDIRECT_URI: `${origin}/api/auth/social/facebook/callback`,
      DATABASE_URL: process.env.MPF_TEST_DATABASE_URL };
    const runtime = readIdentityRuntimeConfig(env), messages = [], codes = new Map(), tokens = new Map();
    const pair = await generateKeyPair('RS256'), jwk = { ...await exportJWK(pair.publicKey), kid: 'fixture-google', alg: 'RS256' };
    let providerCalls = 0, closed = false, created;
    const transports = { smtpTransportFactory: options => {
      assert.equal(options.requireTLS, true); assert.equal(options.disableFileAccess, true);
      return { name: 'private-fixture', version: '1', send(mail, done) {
        messages.push({ to: mail.data.envelope.to[0], text: mail.data.text });
        done(null, { messageId: mail.data.messageId, accepted: mail.data.envelope.to });
      }, close() { closed = true; } };
    }, fetch: async (url, request) => {
      const uri = new URL(url); assert.equal(request.redirect, 'error');
      if (uri.origin === 'https://api.pwnedpasswords.com') {
        assert.match(uri.pathname, /^\/range\/[A-F0-9]{5}$/); assert.equal(request.headers['Add-Padding'], 'true');
        return new Response(`${'0'.repeat(35)}:0\r\n`);
      }
      if (uri.origin === 'https://www.googleapis.com' && uri.pathname.endsWith('/certs')) return new Response(JSON.stringify({ keys: [jwk] }));
      providerCalls++;
      if (uri.origin === 'https://oauth2.googleapis.com') {
        const params = new URLSearchParams(request.body), claim = codes.get(params.get('code')); assert.ok(claim);
        assert.equal(createHash('sha256').update(params.get('code_verifier')).digest('base64url'), claim.challenge);
        const token = await new SignJWT({ nonce: claim.nonce, email: claim.email, email_verified: true, hd: 'example.com' })
          .setProtectedHeader({ alg: 'RS256', kid: 'fixture-google' }).setIssuer('https://accounts.google.com').setAudience('fixture-google')
          .setSubject(claim.subject).setIssuedAt(Math.floor(clock.now()/1000)).setExpirationTime(Math.floor(clock.now()/1000)+300).sign(pair.privateKey);
        return new Response(JSON.stringify({ id_token: token }));
      }
      assert.equal(uri.origin, 'https://graph.facebook.com');
      if (uri.pathname.endsWith('/oauth/access_token')) { const claim = codes.get(uri.searchParams.get('code')); assert.ok(claim);
        const token = randomUUID(); tokens.set(token, claim); return new Response(JSON.stringify({ access_token: token, expires_in: 300 })); }
      if (uri.pathname.endsWith('/debug_token')) { const claim = tokens.get(uri.searchParams.get('input_token')); assert.ok(claim);
        return new Response(JSON.stringify({ data: { app_id: '123456', type: 'USER', is_valid: true, user_id: claim.subject,
          expires_at: Math.floor(clock.now()/1000)+300, data_access_expires_at: Math.floor(clock.now()/1000)+300 } })); }
      assert.equal(uri.pathname, '/v26.0/me'); return new Response(JSON.stringify({ id: tokens.get(request.headers.authorization.slice(7)).subject }));
    } };
    try {
      await t.test('missing migrations fail before transport; factory never applies them', async () => {
        await assert.rejects(createIdentityRuntime({ runtime, database, schema, fixtureTransports: transports, clock }), { code: 'auth_service_unavailable' });
        assert.equal((await database.query('SELECT to_regclass($1) AS relation', [`${s}.mpf_schema_migrations`])).rows[0].relation, null);
        assert.equal(messages.length, 0); assert.equal(providerCalls, 0);
      });
      await runMigrations(database, migrations.map(m => ({ ...m, sql: m.sql.replaceAll('"public"', s) })), { mode: 'apply', schema });
      created = await createIdentityRuntime({ runtime, database, schema, fixtureTransports: transports, clock });
      const facade = created.identityApplicationService;
      assert.equal(created.deploymentReady, false);
      assert.deepEqual(created.publicPolicy.project().methods, { password: false, emailOtp: false, google: false, facebook: false });
      // Explicit private fixture presentation only: injected transports NEVER
      // change real qualification. Source uses genuine brand, fixtureOnly=false.
      facade.publicPolicy = { project: () => ({ ...created.publicPolicy.project(), methods: { ...runtime.methods } }) };
      app.use(express.json({ limit: '32kb' })); app.use(express.urlencoded({ extended: false, limit: '32kb' }));
      app.use(createRealActorContextMiddleware({ identityApplicationService: facade }));
      registerAuthRoutes(app, { identityApplicationService: facade }); registerIdentityRoutes(app, { identityApplicationService: facade });
      const client = () => {
        const jar = new Map(); let csrf;
        return { jar, request: (path, body, key = randomUUID()) => new Promise((resolve, reject) => {
          const req = http.request({ host: '127.0.0.1', port: server.address().port, path, method: body === undefined ? 'GET' : 'POST',
            headers: { origin, cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '), ...(csrf ? { 'x-csrf-token': csrf } : {}),
              ...(body ? { 'content-type': 'application/json', 'idempotency-key': key } : {}) } }, res => {
            let raw = ''; res.on('data', d => { raw += d; }); res.on('end', () => {
              for (const cookie of res.headers['set-cookie'] ?? []) { const [k, v] = cookie.split(';')[0].split('='); if (v) jar.set(k, v); else jar.delete(k); }
              const result = raw.startsWith('{') ? JSON.parse(raw) : null; if (result?.csrfToken) csrf = result.csrfToken;
              resolve({ status: res.statusCode, body: result, headers: res.headers });
            });
          }); req.on('error', reject); req.end(body === undefined ? undefined : JSON.stringify(body));
        }) };
      };
      const consent = { displayName: 'Qualified Source Customer', termsAccepted: true, termsVersion: runtime.legal.termsVersion, privacyVersion: runtime.legal.privacyVersion };
      const issue = async (c, email, purpose = 'registration') => {
        await c.request('/api/auth/config');
        const issued = await c.request('/api/auth/challenges', { purpose, email }); assert.equal(issued.status, 202, JSON.stringify(issued.body));
        const a = created.dispatch(), b = created.dispatch(); assert.equal(a, b, 'one dispatch promise'); await a;
        const message = messages.filter(m => m.to === email).at(-1); assert.ok(message);
        const code = message.text.match(/\b[0-9]{6}\b/)[0];
        const verified = await c.request(`/api/auth/challenges/${issued.body.challengeId}/verify`, { code }); assert.equal(verified.status, 200, JSON.stringify(verified.body));
        return verified;
      };
      const email = `${randomUUID()}@example.com`, password = `Qualified source ${randomUUID()}`;
      let first;
      await t.test('real-domain OTP enrollment and native password Login share canonical actor', async () => {
        first = client(); assert.equal((await issue(first, email)).body.nextAction, 'complete_registration');
        const enrolled = await first.request('/api/auth/register', { ...consent, password, passwordConfirmation: password });
        assert.equal(enrolled.status, 200, JSON.stringify(enrolled.body)); assert.equal(enrolled.body.nextAction, 'authenticated');
        const actor = (await first.request('/api/me')).body.userId ?? (await first.request('/api/me')).body.id;
        const login = client(); await login.request('/api/auth/config');
        assert.equal((await login.request('/api/auth/login', { email, password })).body.nextAction, 'authenticated');
        assert.equal((await database.query(`SELECT count(*)::int n FROM ${s}.identity_accounts`)).rows[0].n, 1); assert.ok(actor);
      });
      await t.test('email Login OTP preserves credential and persistent-key restart resolves session', async () => {
        clock.advance(61000); const c = client(); assert.equal((await issue(c, email, 'login')).body.nextAction, 'authenticated');
        const restarted = await createIdentityRuntime({ runtime: readIdentityRuntimeConfig(env), database, schema, fixtureTransports: transports, clock });
        try { const header = [...c.jar].map(([k, v]) => `${k}=${v}`).join('; ');
          const actor = await restarted.identityApplicationService.resolveActor(header, 'fixture-restart'); assert.ok(actor.userId);
          assert.equal(actor.isMockActor, false); }
        finally { await restarted.close(); }
      });
      await t.test('factory Reset commits exact prepared password, revokes old sessions and requires ordinary Login', async () => {
        clock.advance(61000); const c = client();
        assert.equal((await issue(c, email, 'password_reset')).body.nextAction, 'reset_password');
        const replacement = `Replacement source ${randomUUID()}`, key = randomUUID(), payload = { password: replacement, passwordConfirmation: replacement };
        const prepared = await c.request('/api/auth/operations/prepare', { action: 'password_reset', payload }, key);
        assert.equal(prepared.status, 200, JSON.stringify(prepared.body));
        const committed = await c.request('/api/auth/password/reset', { operationId: prepared.body.operationId, ...payload }, key);
        assert.equal(committed.status, 200, JSON.stringify(committed.body)); assert.equal(committed.body.nextAction, 'sign_in');
        assert.equal((await c.request('/api/me')).body, null);
        const revoked = await first.request('/api/me'); assert.equal(revoked.status, 200); assert.equal(revoked.body, null);
        await c.request('/api/auth/config');
        assert.equal((await c.request('/api/auth/login', { email, password: replacement })).body.nextAction, 'authenticated');
      });
      const social = async (provider, claim) => {
        const c = client(); await c.request('/api/auth/config');
        const started = await c.request(`/api/auth/social/${provider}/start`, { intent: 'login', rememberDevice: true, returnPath: '/settings' });
        assert.equal(started.status, 200, JSON.stringify(started.body)); const url = new URL(started.body.authorizationUrl), code = randomUUID();
        codes.set(code, { ...claim, nonce: url.searchParams.get('nonce'), challenge: url.searchParams.get('code_challenge') });
        const callback = await c.request(`/api/auth/social/${provider}/callback?code=${code}&state=${url.searchParams.get('state')}`);
        assert.equal(callback.status, 303, JSON.stringify(callback.body));
        const result = await c.request(`/api/auth/social/${provider}/result`); assert.equal(result.status, 200, JSON.stringify(result.body));
        return { c, result };
      };
      await t.test('Google verified signup and subsequent known subject consume factory Social proof exactly once', async () => {
        const claim = { subject: randomUUID(), email: `${randomUUID()}@example.com` }, { c, result } = await social('google', claim);
        assert.equal(result.body.nextAction, 'complete_registration'); assert.equal((await c.request('/api/auth/register', consent)).body.nextAction, 'authenticated');
        const again = await social('google', claim); assert.equal(again.result.body.nextAction, 'authenticated');
      });
      await t.test('Google session cap keeps new Login, revokes oldest session and sends canonical security notice', async () => {
        const claim = { subject: randomUUID(), email: `${randomUUID()}@example.com` }, first = await social('google', claim);
        assert.equal((await first.c.request('/api/auth/register', consent)).body.nextAction, 'authenticated');
        let newest;
        for (let index = 0; index < 11; index++) {
          clock.advance(1); // Distinct creation order; tie policy sorts stable IDs.
          newest = await social('google', claim); assert.equal(newest.result.body.nextAction, 'authenticated');
        }
        const owner = (await newest.c.request('/api/me')).body;
        assert.ok(owner.userId);
        assert.equal((await database.query(`SELECT count(*)::int n FROM ${s}.identity_sessions WHERE account_id=$1 AND revoked_at IS NULL`, [owner.userId])).rows[0].n, 10);
        const revoked = await first.c.request('/api/me'); assert.equal(revoked.status, 200); assert.equal(revoked.body, null);
        const pending = (await database.query(`SELECT count(*)::int n FROM ${s}.identity_notification_outbox WHERE purpose='security_notification' AND template_purpose='sessions_revoked'`, [])).rows[0].n;
        assert.ok(pending >= 2);
        await created.dispatch();
        assert.ok(messages.some(message => message.to === claim.email && !/\b[0-9]{6}\b/.test(message.text)), 'native SMTP compiled security notice');
      });
      await t.test('Facebook signup requires independent email OTP; shared source owner then authenticates', async () => {
        const claim = { subject: randomBytes(8).readBigUInt64BE().toString() }, { c, result } = await social('facebook', claim);
        assert.equal(result.body.nextAction, 'verify_email'); const email = `${randomUUID()}@example.com`;
        const issued = await c.request('/api/auth/social/facebook/email', { email }); assert.equal(issued.status, 202, JSON.stringify(issued.body));
        await created.dispatch(); const code = messages.filter(m => m.to === email).at(-1).text.match(/\b[0-9]{6}\b/)[0];
        assert.equal((await c.request(`/api/auth/challenges/${issued.body.challengeId}/verify`, { code })).body.nextAction, 'complete_registration');
        assert.equal((await c.request('/api/auth/register', consent)).body.nextAction, 'authenticated');
        assert.equal((await social('facebook', claim)).result.body.nextAction, 'authenticated');
      });
      await t.test('dispatcher lifecycle is explicit, duplicate start safe and closed runtime cannot dispatch', async () => {
        created.start(); created.start(); await created.stop(); await created.close(); assert.equal(closed, true);
        assert.deepEqual(await created.dispatch(), { processed: 0 });
      });
    } finally { await created?.close(); await new Promise(resolve => server.close(resolve)); }
  });
});
