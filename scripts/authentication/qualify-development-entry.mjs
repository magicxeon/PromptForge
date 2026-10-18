import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setupDevelopmentFixture, setupDevelopmentAdminFixture } from './setup-development.mjs';
import { developmentApiEnvironment, developmentApiReady } from './development-startup.mjs';

// Explicit isolated qualification; never starts the workspace bootstrap or reads dotenv.
if (process.argv.includes('--isolated-child')) {
  const http = await import('node:http');
  const { once } = await import('node:events');
  const { createRequire, syncBuiltinESMExports } = await import('node:module');
  const syncFs = (await import('node:fs')).default;
  const { pathToFileURL } = await import('node:url');
  const { installNetworkGuard } = await import('./network-guard.mjs');
  installNetworkGuard({ loopbackHttp: true });
  const liveComparison = process.env.MPF_TEST_AUTH_LIVE_COMPARISON === 'true';
  const image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jk9sAAAAASUVORK5CYII=';
  let providerCalls = 0, failNext = false;
  if (liveComparison) {
    process.env.GEMINI_API_KEY = 'isolated-local-comparison-fake-key';
    process.env.MODEL_ARK_API = 'isolated-local-video-fake-key';
    process.env.CINEMATIC_VIDEO_POC_ENABLE_UNVERIFIED_SEEDANCE = 'true';
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers['x-goog-api-key'], process.env.GEMINI_API_KEY);
      const payload = JSON.parse(options.body);
      assert.equal(payload.model, 'gemini-nano-banana-2.1');
      assert.equal(payload.store, false);
      providerCalls++;
      if (failNext) { failNext = false; return new Response('{}', { status: 503 }); }
      return Response.json({ steps: [{ type: 'model_output', content: [{ type: 'image', mime_type: 'image/png', data: image }] }] });
    };
  }
  const project = path.resolve(process.argv.at(-1));
  const fixtureRoot = path.join(project, '.local-auth-fixture');
  const sourceRoot = fileURLToPath(new URL('../../', import.meta.url));
  const inside = (target, root) => target === root || target.startsWith(root + path.sep);
  const writable = target => {
    const resolved = path.resolve(String(target));
    assert.ok(inside(resolved, fixtureRoot), 'Fixture write escaped its designated runtime root.');
  };
  // Existing capability constructors must remain confined even when imported eagerly.
  for (const method of ['mkdir', 'writeFile', 'appendFile', 'rm', 'unlink', 'rename', 'copyFile', 'truncate']) {
    for (const [owner, name] of [[syncFs, method], [syncFs, method + 'Sync'], [syncFs.promises, method]]) {
      const original = owner[name];
      if (typeof original !== 'function') continue;
      owner[name] = function (...args) {
        writable(args[0]);
        if (['rename', 'copyFile'].includes(method)) writable(args[1]);
        return Reflect.apply(original, this, args);
      };
    }
  }
  for (const [owner, name] of [[syncFs, 'readFile'], [syncFs, 'readFileSync'], [syncFs.promises, 'readFile']]) {
    const original = owner[name];
    owner[name] = function (...args) {
      if (typeof args[0] === 'string' || args[0] instanceof URL) {
        const resolved = path.resolve(args[0] instanceof URL ? fileURLToPath(args[0]) : args[0]);
        for (const forbidden of ['server/data', 'client/outputs', '.env', '.env.local'])
          assert.ok(!inside(resolved, path.join(sourceRoot, forbidden)), 'Actual runtime or environment read denied.');
      }
      return Reflect.apply(original, this, args);
    };
  }
  syncBuiltinESMExports();
  const originalInterval = globalThis.setInterval;
  globalThis.setInterval = () => { throw new Error('Background worker/polling is forbidden in this fixture.'); };
  const server = http.createServer();
  let vite;
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const port = server.address().port;
    const { initializeAuthRuntime, qualifyAuthRuntime } = await import('../../server/config/authPolicy.js');
    const baselineEnvironment = developmentApiEnvironment({ AUTH_DEV_BYPASS_ENABLED: 'true', HOST: '127.0.0.1', PORT: String(port) });
    const initializedRuntime = initializeAuthRuntime(liveComparison ? { ...baselineEnvironment,
      AUTH_DEV_BYPASS_ROLE: 'admin', AUTH_DEV_BYPASS_GENERATION_ENABLED: 'true' } : baselineEnvironment, project);
    const runtime = liveComparison ? qualifyAuthRuntime(baselineEnvironment, project) : initializedRuntime;
    const { createApp } = await import('../../server/app/createApp.js');
    let app = createApp({ authRuntime: runtime });
    assert.equal(app.locals.authRuntimeReady, false, 'Fixture may not activate worker recovery.');
    server.on('request', (req, res) => app(req, res));
    const request = (targetPort, pathname, { method = 'GET', headers = {}, body } = {}) => new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port: targetPort, path: pathname, method,
        headers: { ...headers, ...(body ? { 'content-type': 'application/json' } : {}) } }, res => {
        const chunks = []; let size = 0;
        res.on('data', chunk => { size += chunk.length; assert.ok(size < 262144); chunks.push(chunk); });
        res.on('end', () => { const bytes = Buffer.concat(chunks); resolve({ status: res.statusCode, headers: res.headers, text: bytes.toString(), bytes }); });
      });
      req.setTimeout(10000, () => req.destroy(new Error('Fixture request timed out.')));
      req.on('error', reject); req.end(body ? JSON.stringify(body) : undefined);
    });
    const requireWeb = createRequire(new URL('../../web/package.json', import.meta.url));
    const config = (await import('../../web/vite.config.ts')).default;
    assert.equal(config.server.host, '127.0.0.1'); assert.equal(config.server.port, 5173); assert.equal(config.server.strictPort, true);
    for (const options of Object.values(config.server.proxy)) {
      assert.equal(options.target, 'http://127.0.0.1:6500'); assert.equal(options.changeOrigin, true);
    }
    const { createServer } = await import(pathToFileURL(requireWeb.resolve('vite')).href);
    // Only the ephemeral fixture target/port differ; use the real Vite proxy options.
    globalThis.setInterval = originalInterval;
    vite = await createServer({ configFile: false, root: path.join(sourceRoot, 'web'), plugins: [],
      cacheDir: path.join(fixtureRoot, 'vite-cache'), optimizeDeps: { noDiscovery: true, include: [] },
      server: { ...config.server, port: 0, hmr: false, watch: null,
        proxy: Object.fromEntries(Object.entries(config.server.proxy).map(([prefix, options]) => [prefix, { ...options, target: `http://127.0.0.1:${port}` }])) } });
    await vite.httpServer.listen(0, '127.0.0.1');
    await once(vite.httpServer, 'listening');
    const proxyPort = vite.httpServer.address().port;
    const origin = 'http://127.0.0.1:5173';
    const probeHealth = async (url, options) => {
      assert.equal(url, 'http://127.0.0.1:6500/api/health');
      assert.equal(options.redirect, 'error');
      // Route the fixed launcher probe to the owned ephemeral fixture only.
      const response = await request(proxyPort, '/api/health', { headers: { origin } });
      return new Response(response.text, { status: response.status });
    };
    assert.equal(await developmentApiReady(probeHealth), true);
    const actor = await request(proxyPort, '/api/me', { headers: { origin, 'x-mpf-user-id': 'admin' } });
    assert.equal(actor.status, 200); assert.equal(JSON.parse(actor.text).userId, 'usr_auth_local');
    assert.equal(JSON.parse(actor.text).authMode, 'development_bypass');
    assert.equal((await request(proxyPort, '/api/me', { headers: { origin: 'http://localhost:5173' } })).status, 200);
    const localhost = { host: `localhost:${port}`, origin: `http://localhost:${port}` };
    assert.equal(JSON.parse((await request(port, '/api/me', { headers: localhost })).text).userId, 'usr_auth_local');
    const localhostConfig = await request(port, '/api/auth/config', { headers: localhost });
    assert.equal(localhostConfig.status, 200);
    assert.equal((await request(port, '/api/me/preferences', { method: 'PATCH',
      headers: { ...localhost, cookie: localhostConfig.headers['set-cookie'][0].split(';')[0],
        'x-csrf-token': JSON.parse(localhostConfig.text).csrfToken }, body: { confirmCreditUsage: true } })).status, 200);
    const publicConfig = await request(proxyPort, '/api/auth/config', { headers: { origin } });
    assert.equal(publicConfig.status, 200);
    const projection = JSON.parse(publicConfig.text), cookie = publicConfig.headers['set-cookie'][0].split(';')[0];
    assert.ok(Object.values(projection.methods).every(value => value === false));
    assert.equal((await request(proxyPort, '/api/me/preferences', { method: 'PATCH', headers: { origin, cookie, 'x-csrf-token': projection.csrfToken }, body: { confirmCreditUsage: false } })).status, 200);
    assert.equal((await request(proxyPort, '/api/me/preferences', { method: 'PATCH', headers: { origin, cookie }, body: { confirmCreditUsage: true } })).status, 403);
    for (const hostile of ['https://attacker.invalid', 'http://localhost:5174', 'http://localhost.attacker.invalid:5173', 'http://127.0.0.1:5174'])
      assert.equal((await request(proxyPort, '/api/me', { headers: { origin: hostile, 'x-forwarded-for': '127.0.0.1' } })).status, 403);
    assert.equal((await request(port, '/api/me', { headers: { host: 'attacker.invalid', origin } })).status, 403);
    assert.equal((await request(port, '/api/me', { headers: { host: `localhost.attacker.invalid:${port}`, origin } })).status, 403);
    assert.equal((await request(proxyPort, '/api/history', { headers: { origin } })).status, 200);
    // Progress and Blob requests cannot turn the development actor into paid/media authority.
    assert.equal((await request(proxyPort, '/api/generate', { headers: { origin, accept: 'text/event-stream' } })).status, 403);
    assert.equal((await request(proxyPort, '/outputs/foreign.png', { headers: { origin, accept: 'image/png' } })).status, 403);
    assert.equal((await request(proxyPort, '/api/admin/overview', { headers: { origin } })).status, 403);
    const adminRuntime = qualifyAuthRuntime({ AUTH_DEV_BYPASS_ENABLED: 'true', UTH_DEV_BYPASS_ROLE: 'admin',
      NODE_ENV: 'development', PORT: String(port) }, project);
    app = createApp({ authRuntime: adminRuntime });
    const adminActor = JSON.parse((await request(proxyPort, '/api/me', { headers: { origin, 'x-mpf-user-id': 'real-admin' } })).text);
    assert.equal(adminActor.userId, 'usr_auth_local_admin'); assert.equal(adminActor.role, 'admin');
    for (const pathname of ['/api/admin/overview', '/api/admin/users', '/api/admin/capabilities', '/api/community/features'])
      assert.equal((await request(proxyPort, pathname, { headers: { origin } })).status, 200, pathname);
    const adminCapabilities = JSON.parse((await request(proxyPort, '/api/admin/capabilities', { headers: { origin } })).text);
    assert.equal(adminCapabilities.capabilities.financialCommands.enabled, false);
    const adminConfig = await request(proxyPort, '/api/auth/config', { headers: { origin } });
    const adminHeaders = { origin, cookie: adminConfig.headers['set-cookie'][0].split(';')[0],
      'x-csrf-token': JSON.parse(adminConfig.text).csrfToken };
    assert.equal((await request(proxyPort, '/api/admin/support/cases', { method: 'POST', headers: { origin },
      body: { title: 'Isolated admin test' } })).status, 403);
    const created = await request(proxyPort, '/api/admin/support/cases', { method: 'POST', headers: adminHeaders,
      body: { title: 'Isolated admin test', idempotencyKey: 'owned-admin-case' } });
    assert.equal(created.status, 201);
    assert.equal(JSON.parse(created.text).createdByUserId, 'usr_auth_local_admin');
    assert.equal((await request(proxyPort, '/api/admin/support/cases', { headers: { origin } })).status, 200);
    for (const pathname of ['/api/generate', '/api/admin/credits/real/adjustments',
      '/api/admin/configuration/revisions/live/publications'])
      assert.equal((await request(proxyPort, pathname, { method: 'POST', headers: adminHeaders, body: {} })).status, 403);
    if (liveComparison) {
      const liveRuntime = qualifyAuthRuntime({ AUTH_DEV_BYPASS_ENABLED: 'true', AUTH_DEV_BYPASS_ROLE: 'admin',
        AUTH_DEV_BYPASS_GENERATION_ENABLED: 'true', NODE_ENV: 'development', PORT: String(port) }, project);
      app = createApp({ authRuntime: liveRuntime });
      const liveConfig = await request(proxyPort, '/api/auth/config', { headers: { origin } });
      const liveHeaders = { origin, cookie: liveConfig.headers['set-cookie'][0].split(';')[0],
        'x-csrf-token': JSON.parse(liveConfig.text).csrfToken };
      assert.equal(JSON.parse(liveConfig.text).development.liveGeneration, true);
      const call = (pathname, body, headers = liveHeaders) => request(proxyPort, pathname, { method: 'POST', headers, body });
      const localVideoQuote = await call('/api/generation/video/quote', { providerId: 'gemini',
        modelId: 'veo-3.1-lite-generate-preview', operation: 'text_to_video', prompt: 'Local configured-price test.',
        aspectRatio: '9:16', resolution: '720p', durationSeconds: 4, audioMode: 'generated' });
      assert.equal(localVideoQuote.status, 200, localVideoQuote.text);
      const configuredQuote = JSON.parse(localVideoQuote.text).estimate;
      assert.equal(configuredQuote.chargeMode, 'development_poc_credit');
      assert.equal(configuredQuote.breakdown.localAdminConfiguredRate, true);
      assert.equal(configuredQuote.estimatedCredits, 1);
      const pocRequest = { providerId: 'modelark', modelId: 'dreamina-seedance-2-0-mini-260615',
        operation: 'text_to_video', prompt: 'Local fixed-price POC parity.', aspectRatio: '9:16',
        resolution: '720p', durationSeconds: 6, audioMode: 'generated' };
      const pocResponse = await call('/api/generation/video/quote', pocRequest);
      assert.equal(pocResponse.status, 200, pocResponse.text);
      const pocQuote = JSON.parse(pocResponse.text).estimate;
      assert.equal(pocQuote.chargeMode, 'development_poc_credit'); assert.equal(pocQuote.estimatedCredits, 1);
      assert.equal(pocQuote.pricingInputs.developmentPocCredits, 1);
      const { creditApplicationService: fixtureCredits } = await import('../../server/domain/credits/CreditApplicationService.js');
      const videoCatalogResponse = await request(proxyPort, '/api/generation/video/capabilities', { headers: { origin } });
      assert.equal(videoCatalogResponse.status, 200, videoCatalogResponse.text);
      const videoCatalog = JSON.parse(videoCatalogResponse.text);
      assert.ok(videoCatalog.models.length > 0);
      assert.ok(videoCatalog.models.some(model => model.testingRoutingEnabled === true));
      assert.equal((await request(proxyPort, '/api/generation/video/tasks', { headers: { origin } })).status, 200);
      assert.equal((await request(proxyPort, '/api/generation/video/trusted-sources', { headers: { origin } })).status, 200);
      const sharp = (await import('sharp')).default;
      const referencePng = await sharp({ create: { width: 320, height: 320, channels: 3, background: '#445566' } }).png().toBuffer();
      const upload = await call('/api/references', { dataUrl: `data:image/png;base64,${referencePng.toString('base64')}`,
        role: 'pose_reference', sourceMode: 'upload' });
      assert.equal(upload.status, 201, upload.text);
      const reference = JSON.parse(upload.text);
      const videoRequest = { providerId: 'modelark', modelId: 'dreamina-seedance-2-5-260628',
        operation: 'image_to_video', inputMode: 'multimodal_reference', referencePlanVersion: 'playground-reference-v1',
        references: [{ role: 'reference_image', purpose: 'image_reference', referenceImageUrl: reference.imageUrl }],
        prompt: 'A quiet isolated landscape.', aspectRatio: '9:16',
        resolution: '720p', durationSeconds: 6, audioMode: 'generated' };
      assert.equal((await call('/api/generation/video/quote', videoRequest, { origin })).status, 403);
      const videoQuote = await call('/api/generation/video/quote', videoRequest);
      assert.equal(videoQuote.status, 200, videoQuote.text);
      assert.ok(JSON.parse(videoQuote.text).estimate.estimateId);
      assert.equal(JSON.parse(videoQuote.text).estimate.estimatedCredits, 1);
      assert.equal((await call('/api/generation/video/tasks', videoRequest, { origin })).status, 403);
      assert.equal((await call('/api/generation/video/tasks', { ...videoRequest, estimateId: 'unaccepted-quote',
        idempotencyKey: 'isolated-video-denied' })).status, 404);
      assert.equal(providerCalls, 0, 'Catalog/quote/invalid admission must never dispatch a provider.');
      const account = async () => JSON.parse((await request(proxyPort, '/api/credits/account', { headers: { origin } })).text).account;
      assert.equal((await account()).availableCredits, 0);
      assert.equal((await call('/api/credits/mock-grants', { amountCredits: 100, idempotencyKey: 'missing-csrf-grant' }, { origin })).status, 403);
      for (const amountCredits of [0, -1, 1.5, 1001, 'bad'])
        assert.equal((await call('/api/credits/mock-grants', { amountCredits, idempotencyKey: 'invalid-grant-key' })).status, 400);
      assert.equal((await call('/api/credits/mock-grants', { amountCredits: 60 })).status, 400);
      const grant = { amountCredits: 60, idempotencyKey: 'initial-local-grant' };
      assert.equal((await call('/api/credits/mock-grants', grant)).status, 200);
      assert.equal((await call('/api/credits/mock-grants', grant)).status, 200);
      assert.equal((await call('/api/credits/mock-grants', { ...grant, amountCredits: 61 })).status, 409);
      assert.equal((await account()).availableCredits, 60);
      const payload = { generationMode: 'playground', generationSurface: 'playground', aspectRatio: '1:1', imageResolution: '1K',
        sceneBuilder: { authoringMode: 'manual', manualPromptText: 'An isolated landscape test image.' },
        stream: false, slots: [{ id: 'left', provider: 'gemini', model: 'gemini-nano-banana-2.1' },
          { id: 'right', provider: 'gemini', model: 'gemini-nano-banana-2.1' }] };
      const quoteResponse = await call('/api/comparisons/estimate', payload);
      assert.equal(quoteResponse.status, 200, quoteResponse.text);
      const quote = JSON.parse(quoteResponse.text);
      assert.equal(quote.estimatedTotalCredit, 100);
      const submission = key => ({ ...payload, idempotencyKey: key, estimateToken: quote.estimateToken,
        estimateExpiresAt: quote.expiresAt, creditEstimates: quote.slots.map(slot => ({ slotId: slot.id,
          estimateId: slot.estimateId, estimatedCredit: slot.estimatedCredit, estimateExpiresAt: slot.estimateExpiresAt })) });
      const insufficient = await call('/api/comparisons', submission('local-insufficient'));
      assert.ok([400, 402, 409].includes(insufficient.status), insufficient.text);
      assert.equal(providerCalls, 0); assert.equal((await account()).availableCredits, 60);
      const tampered = submission('local-tampered'); tampered.creditEstimates[1].estimateId = 'foreign-estimate';
      assert.equal((await call('/api/comparisons', tampered)).status, 409); assert.equal(providerCalls, 0);
      assert.equal((await call('/api/credits/mock-grants', { amountCredits: 240, idempotencyKey: 'second-local-grant' })).status, 200);
      const createdResponse = await call('/api/comparisons', submission('local-success'));
      assert.equal(createdResponse.status, 201, createdResponse.text);
      const created = JSON.parse(createdResponse.text);
      const waitForSet = async setId => {
        for (let attempt = 0; attempt < 100; attempt++) {
          const response = await request(proxyPort, `/api/comparisons/${setId}`, { headers: { origin } });
          assert.equal(response.status, 200, response.text);
          const set = JSON.parse(response.text), run = set.runs.at(-1);
          if (['completed', 'partially_completed', 'failed'].includes(run.status)) return { set, run };
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        throw new Error('Owned comparison did not become terminal.');
      };
      const completed = await waitForSet(created.setId);
      assert.equal(completed.run.status, 'completed', JSON.stringify(completed.run));
      assert.equal(providerCalls, 2); assert.equal((await account()).availableCredits, 200);
      assert.equal((await account()).reservedCredits, 0);
      assert.equal((await call('/api/comparisons', submission('local-success'))).status, 200);
      assert.equal(providerCalls, 2);
      for (const slot of completed.run.slots) {
        const output = await request(proxyPort, slot.result.imageUrl, { headers: { origin } });
        assert.equal(output.status, 200); assert.deepEqual(output.bytes, Buffer.from(image, 'base64'));
        assert.equal((await request(proxyPort, `/api/jobs/${slot.jobId}`, { headers: { origin } })).status, 200);
      }
      assert.equal((await request(proxyPort, '/outputs/foreign.png', { headers: { origin } })).status, 404);
      failNext = true;
      const partialResponse = await call('/api/comparisons', submission('local-partial'));
      assert.equal(partialResponse.status, 201, partialResponse.text);
      const partial = await waitForSet(JSON.parse(partialResponse.text).setId);
      assert.equal(partial.run.status, 'partially_completed', JSON.stringify(partial.run));
      assert.equal(providerCalls, 4); assert.equal((await account()).availableCredits, 150);
      assert.equal((await account()).reservedCredits, 0);
      const ledger = JSON.parse((await request(proxyPort, '/api/credits/ledger', { headers: { origin } })).text);
      assert.ok(JSON.stringify(ledger).includes('refund'));
      await fixtureCredits.grantMockCredits({ userId: 'usr_auth_local_admin', amountCredits: 1000,
        idempotencyKey: 'local-poc-parity-fund', actorContext: { userId: 'usr_auth_local_admin', role: 'admin', isMockActor: true } });
      const reservedPoc = await fixtureCredits.validateAndReserveForRequest({ userId: 'usr_auth_local_admin', estimateId: pocQuote.estimateId,
        generationRequest: { ...pocQuote.pricingInputs, ...pocQuote.routing, requestId: 'local-poc-parity',
          referenceCount: 0, developmentPocUnverified: true, developmentPocCredits: 1 }, metadata: { jobId: 'local-poc-parity-job' } });
      assert.equal(reservedPoc.reservation.amountCredits, pocQuote.estimatedCredits);
      await fixtureCredits.refundForJob({ userId: 'usr_auth_local_admin', reservationId: reservedPoc.reservation.reservationId,
        jobId: 'local-poc-parity-job', reasonCode: 'isolated_fixture_only' });
      const usersFile = path.join(fixtureRoot, 'data/identity/mockUsers.json');
      const users = JSON.parse(await fs.readFile(usersFile, 'utf8'));
      await fs.writeFile(usersFile, JSON.stringify(users.map(user => user.id === 'usr_auth_local_admin'
        ? { ...user, status: 'disabled' } : user)));
      assert.equal((await request(proxyPort, completed.run.slots[0].result.imageUrl, { headers: { origin } })).status, 503);
      await fs.writeFile(usersFile, JSON.stringify(users));
      app = createApp({ authRuntime: adminRuntime });
      assert.equal((await request(proxyPort, completed.run.slots[0].result.imageUrl, { headers: { origin } })).status, 403);
      assert.equal((await request(proxyPort, '/api/generation/video/capabilities', { headers: { origin } })).status, 403);
      assert.equal(providerCalls, 4);
      console.log('PASS native local Admin Compare: atomic admission, strict mock Gemini, capture/refund, replay, owned images and revocation.');
    }
    app = createApp({ authRuntime: runtime });
    assert.equal((await request(proxyPort, '/api/admin/overview', { headers: adminHeaders })).status, 403);
    const { createAuthenticationUnavailableApp } = await import('../../server/app/createAuthenticationUnavailableApp.js');
    app = createAuthenticationUnavailableApp();
    assert.equal(await developmentApiReady(probeHealth), true);
    assert.equal((await request(proxyPort, '/api/me', { headers: { origin, cookie, 'x-mpf-user-id': 'usr_auth_local' } })).text, 'null');
    assert.equal((await request(port, '/api/history', { headers: localhost })).status, 503);
    for (const [pathname, accept] of [['/api/history', 'application/json'], ['/api/generate', 'text/event-stream'], ['/outputs/foreign.png', 'image/png']])
      assert.equal((await request(proxyPort, pathname, { headers: { origin, cookie, accept } })).status, 503);
    console.log('PASS full isolated createApp, actual Vite proxy, hostile Origin/Host/CSRF and off-mode transport denial.');
  } finally {
    globalThis.setInterval = originalInterval;
    await vite?.close();
    await new Promise(resolve => server.close(resolve));
  }
} else {
  test('full isolated development entry and real Vite proxy', async t => {
    assert.equal(process.env.MPF_TEST_AUTH_DEV_FIXTURE, 'true', 'Explicit MPF_TEST_AUTH_DEV_FIXTURE=true required.');
    const project = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-auth-dev-entry-'));
    const resolved = path.resolve(project);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep + 'mpf-auth-dev-entry-'));
    t.after(() => fs.rm(resolved, { recursive: true, force: true }));
    await setupDevelopmentFixture(project);
    await setupDevelopmentAdminFixture(project);
    const env = Object.fromEntries(['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'PATH'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--isolated-child', project], {
      encoding: 'utf8', timeout: 45000, env: { ...env, NODE_ENV: 'development',
        MPF_TEST_AUTH_LIVE_COMPARISON: process.env.MPF_TEST_AUTH_LIVE_COMPARISON || 'false' }, maxBuffer: 1048576,
    });
    assert.equal(child.error, undefined, child.error?.message);
    assert.equal(child.status, 0, child.stderr + child.stdout);
    assert.match(child.stdout, /PASS full isolated createApp/);
  });
}
