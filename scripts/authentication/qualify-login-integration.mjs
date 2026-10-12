import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { setupDevelopmentFixture } from './setup-development.mjs';
import { initializeAuthRuntime } from '../../server/config/authPolicy.js';
import { withDisposableAuthDatabase, createFakeClock } from './fixtures.mjs';

test('full createApp Login/source qualification in a permission-confined disposable fixture', { timeout: 75000 }, async t => {
  const root = process.env.MPF_LOGIN_APP_FIXTURE_ROOT;
  assert.ok(root && path.isAbsolute(root), 'Only the owned wrapper supplies a fixture root.');
  assert.equal(process.permission?.has('fs.write', root), true);
  assert.equal(process.permission.has('fs.write', fileURLToPath(new URL('../../server/data', import.meta.url))), false);
  assert.equal(process.permission.has('child'), false);
  await setupDevelopmentFixture(root);
  const isolated = initializeAuthRuntime({ NODE_ENV: 'development', AUTH_DEV_BYPASS_ENABLED: 'true', PORT: '6500' }, root);
  // No private singleton or canonical paths module is loaded before this point.
  const { DATA_ROOT, DATA_FILES, OUTPUTS_DIR } = await import('../../server/config/paths.js');
  assert.equal(DATA_ROOT, isolated.dataRoot); assert.equal(OUTPUTS_DIR, isolated.outputsRoot);
  const { readIdentityRuntimeConfig } = await import('../../server/config/identityRuntime.js');
  const { createIdentityRuntime } = await import('../../server/domain/identity/createIdentityRuntime.js');
  const { runMigrations } = await import('../../server/repositories/postgres/migrations.js');
  const { migrations } = await import('../../server/repositories/postgres/migrationRegistry.js');
  await withDisposableAuthDatabase(process.env, async ({ database, schema }) => {
    let handler, composition;
    const server = http.createServer((req, res) => handler(req, res));
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const origin = `http://127.0.0.1:${server.address().port}`, messages = [], clock = createFakeClock(Date.now());
    const env = { NODE_ENV: 'development', AUTH_LOGIN_ENABLED: 'true', AUTH_METHODS: 'emailOtp',
      AUTH_LOCAL_HTTP_APPROVED: 'true', AUTH_ORIGINS_JSON: JSON.stringify([origin]),
      AUTH_LEGAL_JSON: JSON.stringify({ termsVersion: 'fixture-v1', privacyVersion: 'fixture-v1', termsUrl: origin+'/terms', privacyUrl: origin+'/privacy' }),
      AUTH_APPROVALS_JSON: JSON.stringify(Object.fromEntries(['deployment','legal','retention','email','localHttp'].map(k => [k, 'isolated-fixture-'+k]))),
      AUTH_KEYRING_JSON: JSON.stringify({ current: 1, keys: { 1: randomBytes(32).toString('base64url') } }),
      AUTH_SMTP_HOST: 'mail.example.com', AUTH_SMTP_PORT: '587', AUTH_SMTP_USERNAME: 'fixture', AUTH_SMTP_PASSWORD: 'not-live',
      AUTH_SMTP_FROM: 'sender@example.com', DATABASE_URL: process.env.MPF_TEST_DATABASE_URL };
    const client = () => {
      const jar = new Map(); let csrf;
      return { cookie: () => [...jar].map(([k,v]) => `${k}=${v}`).join('; '),
        request: (uri, { body, method = body === undefined ? 'GET' : 'POST', headers = {} } = {}) => new Promise((resolve, reject) => {
          const req = http.request(origin+uri, { method, headers: { origin,
            cookie: [...jar].map(([k,v]) => `${k}=${v}`).join('; '), ...(csrf ? { 'x-csrf-token': csrf } : {}),
            ...(body === undefined ? {} : { 'content-type': 'application/json', 'content-length': Buffer.byteLength(JSON.stringify(body)), 'idempotency-key': randomUUID() }), ...headers } }, res => {
            const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('error', reject);
            res.on('end', () => {
              for (const cookie of res.headers['set-cookie'] ?? []) { const [k,v] = cookie.split(';')[0].split('='); if (v) jar.set(k,v); else jar.delete(k); }
              const bytes = Buffer.concat(chunks), raw = bytes.toString();
              let parsed; try { parsed = JSON.parse(raw); } catch { parsed = null; }
              if (parsed?.csrfToken) csrf = parsed.csrfToken;
              resolve({ status: res.statusCode, body: parsed, bytes, headers: res.headers });
            });
          }); req.setTimeout(10000, () => req.destroy(new Error('Fixture HTTP deadline.')));
          req.on('error', reject); req.end(body === undefined ? undefined : JSON.stringify(body));
        }) };
    };
    let queueManager;
    try {
      await runMigrations(database, migrations.map(m => ({ ...m, sql: m.sql.replaceAll('"public"', `"${schema}"`) })), { mode: 'apply', schema });
      composition = await createIdentityRuntime({ runtime: readIdentityRuntimeConfig(env), database, schema, clock,
        fixtureTransports: { fetch: async () => { throw new Error('External requests forbidden.'); }, smtpTransportFactory: () => ({
          name: 'private-login-app', version: '1', send(mail, done) { messages.push({ to: mail.data.envelope.to[0], text: mail.data.text });
            done(null, { accepted: mail.data.envelope.to, messageId: mail.data.messageId }); }, close() {} }) } });
      // Private presentation only. Injected adapters retain deploymentReady=false.
      composition.identityApplicationService.publicPolicy = { project: () => ({ ...composition.publicPolicy.project(),
        methods: { emailOtp: true, password: false, google: false, facebook: false } }) };
      const { createApp } = await import('../../server/app/createApp.js');
      handler = createApp({ authRuntime: { ...isolated, enabled: false, authMode: 'session' }, identityRuntime: composition, billableRecoveryReady: false });
      assert.equal(handler.locals.authRuntimeReady, false); assert.equal(handler.locals.billableRecoveryReady, false);
      ({ queueManager } = await import('../../server/domain/generation/QueueManager.js'));
      await queueManager.initHistory();
      const owner = client(), guest = client(), email = `${randomUUID()}@example.com`; let actor;
      await t.test('guest/private spoof denial and public null/catalog reads use actual mounted routes', async () => {
        assert.deepEqual((await guest.request('/api/me')).body, null);
        for (const uri of ['/api/history', '/api/me/preferences', '/outputs/unmapped.png', '/api/auth/not-registered'])
          assert.equal((await guest.request(uri, { headers: { 'x-mpf-user': 'user_demo', 'x-mpf-role': 'admin' } })).status, 401, uri);
        assert.equal((await guest.request('/api/health')).status, 200);
        assert.equal((await guest.request('/api/community/posts')).status, 200);
      });
      await t.test('canonical OTP registration opens actual stable actor and preserves private preferences', async () => {
        assert.equal((await owner.request('/api/auth/config')).status, 200);
        const issued = await owner.request('/api/auth/challenges', { body: { purpose: 'registration', email } });
        assert.equal(issued.status, 202, JSON.stringify(issued.body)); await composition.dispatch();
        const code = messages.find(m => m.to === email).text.match(/\b[0-9]{6}\b/)[0];
        assert.equal((await owner.request(`/api/auth/challenges/${issued.body.challengeId}/verify`, { body: { code } })).body.nextAction, 'complete_registration');
        const registered = await owner.request('/api/auth/register', { body: { displayName: 'Isolated Login owner', termsAccepted: true, termsVersion: 'fixture-v1', privacyVersion: 'fixture-v1' } });
        assert.equal(registered.body.nextAction, 'authenticated', JSON.stringify(registered.body));
        actor = (await owner.request('/api/me')).body; assert.ok(actor.userId); assert.equal(actor.isMockActor, false);
        assert.equal((await owner.request('/api/auth/config')).status, 200);
        assert.equal((await owner.request('/api/me/preferences')).status, 200);
        assert.equal((await owner.request('/api/admin/investigation')).status, 403);
      });
      await t.test('private unsafe admission denies missing CSRF and foreign Origin before preference writes', async () => {
        const before = (await owner.request('/api/me/preferences')).body;
        for (const headers of [{ origin: 'https://foreign.example.com' }, { 'x-csrf-token': '' }])
          assert.equal((await owner.request('/api/me/preferences', { method: 'PATCH', body: { confirmCreditUsage: false }, headers })).status, 403);
        assert.deepEqual((await owner.request('/api/me/preferences')).body, before);
      });
      await t.test('actual source repositories admit owned output, history and variants; deny foreign and unmapped', async () => {
        const save = async (target, value) => { await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, JSON.stringify(value)); };
        const content = Buffer.from('isolated-private-image-bytes'), ownedUrl = '/outputs/owned.png';
        for (const name of ['owned.png','foreign.png','unmapped.png','thumb.png','poster.png','video.mp4','history.png'])
          await fs.writeFile(path.join(OUTPUTS_DIR, name), content);
        await save(DATA_FILES.assets, [
          { id: 'ast_owned', ownerUserId: actor.userId, status: 'active', storageProvider: 'local', publicUrl: ownedUrl,
            thumbnailUrl: '/outputs/thumb.png', metadata: { posterUrl: '/outputs/poster.png' }, storageKey: 'video.mp4' },
          { id: 'ast_foreign', ownerUserId: randomUUID(), status: 'active', storageProvider: 'local', publicUrl: '/outputs/foreign.png' } ]);
        await save(DATA_FILES.history, [
          { id: 'job_owned', ownerUserId: actor.userId, username: actor.username, status: 'completed', imageUrl: '/outputs/history.png', timestamp: Date.now() },
          { id: 'job_foreign', ownerUserId: randomUUID(), username: 'foreign', status: 'completed', imageUrl: '/outputs/foreign.png', timestamp: Date.now() },
          { id: 'job_spoofed', ownerUserId: randomUUID(), username: actor.username, status: 'completed', imageUrl: '/outputs/foreign.png', timestamp: Date.now() },
          { id: 'job_unmapped', username: actor.username, status: 'completed', imageUrl: '/outputs/unmapped.png', timestamp: Date.now() } ]);
        await save(DATA_FILES.communityPosts, ['public','private','members_only','unlisted'].map(visibility => ({
          id: `post_fixture_${visibility}`, ownerUserId: randomUUID(), ownerUsername: 'fixture_publisher',
          visibility, status: 'published', postType: 'image', title: 'Published fixture',
          imageUrl: '/outputs/foreign.png', promptVisibility: 'hidden', sharedPromptSnapshot: { publicPromptText: 'private-source-prompt' },
          createdAt: new Date().toISOString() })));
        for (const uri of [ownedUrl,'/outputs/thumb.png','/outputs/poster.png','/outputs/video.mp4','/outputs/history.png']) {
          const result = await owner.request(uri); assert.equal(result.status, 200, uri); assert.deepEqual(result.bytes, content);
          assert.match(result.headers['cache-control'], /private/);
        }
        assert.equal((await owner.request('/api/history/job_owned')).status, 200);
        assert.equal((await owner.request('/api/jobs/job_owned')).status, 200);
        assert.equal((await owner.request('/api/history/job_foreign')).status, 404);
        assert.equal((await owner.request('/api/history/job_unmapped')).status, 404);
        assert.deepEqual((await owner.request('/api/history')).body.items.map(item => item.id), ['job_owned']);
        for (const id of ['job_foreign','job_spoofed','job_unmapped']) {
          assert.equal((await owner.request(`/api/history/${id}`)).status, 404, id);
          assert.equal((await owner.request(`/api/history/${id}`, { method: 'DELETE', body: {} })).status, 404, id);
          assert.equal((await owner.request(`/api/jobs/${id}`)).status, 404, id);
        }
        const center = await owner.request('/api/generation/job-center');
        assert.equal(center.status, 200, JSON.stringify(center.body));
        assert.deepEqual(center.body.items.map(item => item.id), ['job_owned']);
        const publication = (await guest.request('/api/community/posts')).body;
        assert.deepEqual(publication.items.map(item => item.id), ['post_fixture_public']);
        assert.ok(!JSON.stringify(publication).includes('/outputs/'));
        assert.ok(!JSON.stringify(publication).includes('private-source-prompt'));
        for (const uri of ['/outputs/foreign.png', '/outputs/unmapped.png', '/outputs/%2e%2e/owned.png'])
          assert.ok([400,404].includes((await owner.request(uri)).status), uri);
        const head = await owner.request(ownedUrl, { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(head.bytes.length, 0);
        const partial = await owner.request(ownedUrl, { headers: { range: 'bytes=0-7' } }); assert.equal(partial.status, 206); assert.deepEqual(partial.bytes, content.subarray(0,8));
        const cached = await owner.request(ownedUrl, { headers: { 'if-none-match': head.headers.etag } }); assert.equal(cached.status, 304);
      });
      await t.test('real private SSE detaches on SQL revocation without submitting or cancelling a job', async () => {
        const jobId = 'job_fixture_transport', job = { id: jobId, created: Date.now(), status: 'processing', options: { username: actor.username, ownerUserId: actor.userId }, listeners: [] };
        assert.equal(queueManager.queue.length, 0); assert.equal(queueManager.activeCount, 0); queueManager.jobs.set(jobId, job);
        const deniedJobs = [
          { id: 'job_fixture_unmapped', status: 'processing', options: { username: actor.username }, listeners: [] },
          { id: 'job_fixture_foreign', status: 'processing', options: { username: actor.username, ownerUserId: randomUUID() }, listeners: [] },
          { id: 'job_fixture_no_username', status: 'processing', options: { ownerUserId: actor.userId }, listeners: [] },
        ];
        for (const denied of deniedJobs) queueManager.jobs.set(denied.id, denied);
        for (const denied of deniedJobs) {
          assert.equal((await owner.request(`/api/jobs/${denied.id}`)).status, 404, denied.id);
          assert.equal((await owner.request(`/api/jobs/${denied.id}/stream`)).status, 404, denied.id);
          assert.equal(denied.listeners.length, 0);
        }
        const centerResponse = await owner.request('/api/generation/job-center');
        assert.equal(centerResponse.status, 200, JSON.stringify(centerResponse.body));
        const center = centerResponse.body;
        assert.equal(center.activeCount, 1);
        assert.deepEqual(center.items.map(item => item.id), [jobId, 'job_owned']);
        let received = '', socket;
        const closed = new Promise((resolve, reject) => {
          socket = http.request(origin+`/api/jobs/${jobId}/stream`, { headers: { origin, cookie: owner.cookie() } }, res => {
            assert.equal(res.statusCode, 200); res.on('data', c => { received += c; });
            res.once('close', resolve); res.once('error', error => { if (error.code !== 'ECONNRESET') reject(error); });
          }); socket.on('error', reject); socket.end();
        });
        const waitFor = async predicate => { const deadline = Date.now()+5000; while (!predicate()) {
          assert.ok(Date.now()<deadline, 'Bounded transport wait.'); await new Promise(resolve => setTimeout(resolve, 10)); } };
        try {
          await waitFor(() => job.listeners.length === 1);
          queueManager.emitToListeners(jobId, 'fixture.progress', { visible: 'authorized-first-frame' });
          await waitFor(() => received.includes('authorized-first-frame'));
          await database.query(`UPDATE "${schema}".identity_sessions SET revoked_at=now()`);
          queueManager.emitToListeners(jobId, 'fixture.result', { private: 'must-never-be-delivered' });
          await Promise.race([closed, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Revoked SSE did not close.')), 5000); timer.unref(); })]);
          assert.equal(received.includes('must-never-be-delivered'), false); assert.equal(job.listeners.length, 0);
          assert.equal(job.status, 'processing'); assert.equal(queueManager.queue.length, 0); assert.equal(queueManager.activeCount, 0);
        } finally { socket.destroy(); for (const item of job.listeners) clearInterval(item.keepAliveTimer); queueManager.jobs.delete(jobId);
          for (const denied of deniedJobs) queueManager.jobs.delete(denied.id); }
      });
      await t.test('revoked cookie cannot expose conditional/range bytes; public reads and fresh entry remain available', async () => {
        assert.equal((await owner.request('/outputs/owned.png', { headers: { range: 'bytes=0-7', 'if-none-match': '*' } })).status, 401);
        assert.equal((await owner.request('/api/history')).status, 401);
        const publicRead = await owner.request('/api/community/posts'); assert.equal(publicRead.status, 200);
        assert.deepEqual(publicRead.body.items.map(item => item.id), ['post_fixture_public']);
        assert.equal((await owner.request('/api/me')).body, null);
        assert.equal((await owner.request('/api/auth/config')).status, 200);
        assert.equal((await owner.request('/api/auth/logout', { body: {} })).status, 401);
        assert.equal((await owner.request('/api/auth/challenges', { body: { purpose: 'login', email } })).status, 429);
        clock.advance(61000); // Preserve the canonical email resend interval.
        const issued = await owner.request('/api/auth/challenges', { body: { purpose: 'login', email } });
        assert.equal(issued.status, 202, JSON.stringify(issued.body)); await composition.dispatch();
        const code = messages.filter(m => m.to === email).at(-1).text.match(/\b[0-9]{6}\b/)[0];
        assert.equal((await owner.request(`/api/auth/challenges/${issued.body.challengeId}/verify`, { body: { code } })).body.nextAction, 'authenticated');
        assert.equal((await owner.request('/api/auth/config')).status, 200);
        assert.equal((await owner.request('/outputs/owned.png')).status, 200);
        assert.equal((await owner.request('/api/auth/logout', { body: {} })).status, 204);
        assert.equal((await owner.request('/outputs/owned.png')).status, 401);
      });
    } finally {
      server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await composition?.close();
    }
  });
});
