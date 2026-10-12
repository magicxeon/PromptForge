import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setupDevelopmentFixture } from './setup-development.mjs';

// Explicit isolated qualification; never starts the workspace bootstrap or reads dotenv.
if (process.argv.includes('--isolated-child')) {
  const http = await import('node:http');
  const { once } = await import('node:events');
  const { createRequire, syncBuiltinESMExports } = await import('node:module');
  const syncFs = (await import('node:fs')).default;
  const { pathToFileURL } = await import('node:url');
  const { installNetworkGuard } = await import('./network-guard.mjs');
  installNetworkGuard({ loopbackHttp: true });
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
    const { initializeAuthRuntime } = await import('../../server/config/authPolicy.js');
    const runtime = initializeAuthRuntime({ AUTH_DEV_BYPASS_ENABLED: 'true', NODE_ENV: 'development', HOST: '127.0.0.1', PORT: String(port) }, project);
    const { createApp } = await import('../../server/app/createApp.js');
    let app = createApp({ authRuntime: runtime });
    assert.equal(app.locals.authRuntimeReady, false, 'Fixture may not activate worker recovery.');
    server.on('request', (req, res) => app(req, res));
    const request = (targetPort, pathname, { method = 'GET', headers = {}, body } = {}) => new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port: targetPort, path: pathname, method,
        headers: { ...headers, ...(body ? { 'content-type': 'application/json' } : {}) } }, res => {
        let text = ''; res.on('data', chunk => { text += chunk; assert.ok(text.length < 262144); });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
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
    const actor = await request(proxyPort, '/api/me', { headers: { origin, 'x-mpf-user-id': 'admin' } });
    assert.equal(actor.status, 200); assert.equal(JSON.parse(actor.text).userId, 'usr_auth_local');
    assert.equal(JSON.parse(actor.text).authMode, 'development_bypass');
    const publicConfig = await request(proxyPort, '/api/auth/config', { headers: { origin } });
    assert.equal(publicConfig.status, 200);
    const projection = JSON.parse(publicConfig.text), cookie = publicConfig.headers['set-cookie'][0].split(';')[0];
    assert.ok(Object.values(projection.methods).every(value => value === false));
    assert.equal((await request(proxyPort, '/api/me/preferences', { method: 'PATCH', headers: { origin, cookie, 'x-csrf-token': projection.csrfToken }, body: { confirmCreditUsage: false } })).status, 200);
    assert.equal((await request(proxyPort, '/api/me/preferences', { method: 'PATCH', headers: { origin, cookie }, body: { confirmCreditUsage: true } })).status, 403);
    for (const hostile of ['https://attacker.invalid', 'http://localhost:5173', 'http://127.0.0.1:5174'])
      assert.equal((await request(proxyPort, '/api/me', { headers: { origin: hostile, 'x-forwarded-for': '127.0.0.1' } })).status, 403);
    assert.equal((await request(port, '/api/me', { headers: { host: 'attacker.invalid', origin } })).status, 403);
    assert.equal((await request(proxyPort, '/api/history', { headers: { origin } })).status, 200);
    // Progress and Blob requests cannot turn the development actor into paid/media authority.
    assert.equal((await request(proxyPort, '/api/generate', { headers: { origin, accept: 'text/event-stream' } })).status, 403);
    assert.equal((await request(proxyPort, '/outputs/foreign.png', { headers: { origin, accept: 'image/png' } })).status, 403);
    const { createAuthenticationUnavailableApp } = await import('../../server/app/createAuthenticationUnavailableApp.js');
    app = createAuthenticationUnavailableApp();
    assert.equal((await request(proxyPort, '/api/me', { headers: { origin, cookie, 'x-mpf-user-id': 'usr_auth_local' } })).text, 'null');
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
    const env = Object.fromEntries(['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'PATH'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--isolated-child', project], {
      encoding: 'utf8', timeout: 45000, env: { ...env, NODE_ENV: 'development' }, maxBuffer: 1048576,
    });
    assert.equal(child.error, undefined, child.error?.message);
    assert.equal(child.status, 0, child.stderr + child.stdout);
    assert.match(child.stdout, /PASS full isolated createApp/);
  });
}
