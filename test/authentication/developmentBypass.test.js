import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import { qualifyAuthRuntime, developmentFixtureId } from '../../server/config/authPolicy.js';
import { setupDevelopmentFixture } from '../../scripts/authentication/setup-development.mjs';
import { IdentityDevelopmentService } from '../../server/domain/identity/IdentityDevelopmentService.js';
import { MockUserRepository } from '../../server/repositories/identity/MockUserRepository.js';
import { registerIdentityRoutes } from '../../server/app/routes/identityRoutes.js';
import { createAuthenticationUnavailableApp } from '../../server/app/createAuthenticationUnavailableApp.js';

async function fixture(t) {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-development-auth-'));
  t.after(() => fs.rm(project, { recursive: true, force: true }));
  await setupDevelopmentFixture(project);
  const env = { AUTH_DEV_BYPASS_ENABLED: 'true', NODE_ENV: 'development', HOST: '127.0.0.1', PORT: '6500' };
  const usersFile = path.join(project, '.local-auth-fixture/data/identity/mockUsers.json');
  return { project, env, usersFile, repository: new MockUserRepository({ usersFile }) };
}
test('bootstrap policy rejects invalid toggles, unsafe deployment, missing or privileged designated fixture', async (t) => {
  const f = await fixture(t);
  for (const AUTH_DEV_BYPASS_ENABLED of ['1', 'TRUE', 'yes', ''])
    assert.throws(() => qualifyAuthRuntime({ ...f.env, AUTH_DEV_BYPASS_ENABLED }, f.project));
  for (const NODE_ENV of ['production', 'test', 'staging', undefined])
    assert.throws(() => qualifyAuthRuntime({ ...f.env, NODE_ENV }, f.project));
  assert.throws(() => qualifyAuthRuntime({ ...f.env, HOST: '0.0.0.0' }, f.project));
  assert.equal(qualifyAuthRuntime({ ...f.env, AUTH_DEV_BYPASS_ENABLED: 'false' }, f.project).enabled, false);
  const runtime = qualifyAuthRuntime(f.env, f.project);
  assert.ok(runtime.dataRoot.startsWith(f.project));
  assert.equal(runtime.host, '127.0.0.1');
  const users = JSON.parse(await fs.readFile(f.usersFile, 'utf8'));
  users[0].role = 'admin';
  await fs.writeFile(f.usersFile, JSON.stringify(users));
  assert.throws(() => qualifyAuthRuntime(f.env, f.project));
  await assert.rejects(setupDevelopmentFixture(f.project), { code: 'EEXIST' });
});
test('actual loopback HTTP uses fixed actor, same-origin CSRF, scoped preferences and denied live/security/media paths', async (t) => {
  const f = await fixture(t),
    app = express(),
    server = http.createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const port = server.address().port,
    runtime = qualifyAuthRuntime({ ...f.env, PORT: String(port) }, f.project);
  app.use(new IdentityDevelopmentService({ runtime, userRepository: f.repository }).middleware());
  app.use(express.json());
  registerIdentityRoutes(app, { mockUserRepo: f.repository });
  app.use((req, res) => res.json({ reached: true }));
  const request = (url, { method = 'GET', headers = {}, body } = {}) =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port,
          path: url,
          method,
          headers: { ...headers, ...(body ? { 'content-type': 'application/json' } : {}) },
        },
        (res) => {
          let text = '';
          res.on('data', (d) => (text += d));
          res.on('end', () =>
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(text) })
          );
        }
      );
      req.on('error', reject);
      req.end(body ? JSON.stringify(body) : undefined);
    });
  const origin = `http://127.0.0.1:${port}`;
  const actor = await request('/api/me?mpfUserId=admin', {
    headers: { 'x-mpf-user-id': 'admin', cookie: 'mpf_local_session=foreign' },
  });
  assert.equal(actor.body.userId, developmentFixtureId);
  assert.equal(actor.body.authMode, 'development_bypass');
  assert.equal(actor.body.role, 'user');
  assert.equal((await request('/api/me', { headers: { host: 'attacker.invalid' } })).status, 403);
  assert.equal((await request('/api/me', { headers: { origin: 'http://127.0.0.1:5173' } })).status, 200);
  for (const hostileOrigin of ['http://localhost:5173', 'http://127.0.0.1:5174', 'https://127.0.0.1:5173'])
    assert.equal((await request('/api/me', { headers: { origin: hostileOrigin } })).status, 403);
  assert.equal(
    (
      await request('/api/me', {
        headers: { origin: 'https://attacker.invalid', 'x-forwarded-for': '127.0.0.1' },
      })
    ).status,
    403
  );
  const config = await request('/api/auth/config'),
    cookie = config.headers['set-cookie'][0].split(';')[0];
  assert.equal(config.body.methods.password, false);
  assert.equal(
    (
      await request('/api/me/preferences', {
        method: 'PATCH',
        headers: { origin, cookie },
        body: { confirmCreditUsage: false },
      })
    ).status,
    403
  );
  assert.equal(
    (
      await request('/api/me/preferences', {
        method: 'PATCH',
        headers: { origin, cookie, 'x-csrf-token': config.body.csrfToken },
        body: { confirmCreditUsage: false },
      })
    ).body.confirmCreditUsage,
    false
  );
  for (const url of [
    '/api/auth/login',
    '/api/auth/google/callback',
    '/api/generate',
    '/API/generate',
    '/api/credits/recharge',
    '/outputs/foreign.png',
    '/OUTPUTS/foreign.png',
    '/api/history/foreign',
  ])
    assert.equal((await request(url)).status, 403);
  assert.equal(
    (
      await request('/api/me/preferences', {
        method: 'PATCH',
        headers: { origin, cookie: `${cookie}; ${cookie}`, 'x-csrf-token': config.body.csrfToken },
        body: { confirmCreditUsage: true },
      })
    ).status,
    403
  );
  const users = await f.repository.readAll();
  users[0].status = 'disabled';
  await fs.writeFile(f.usersFile, JSON.stringify(users));
  assert.equal((await request('/api/me')).status, 503);
});
test('request peer and restart-specific CSRF key cannot be replaced by forwarded headers or old mode state', () => {
  const runtime = {
    enabled: true,
    allowedHosts: ['127.0.0.1:6500'],
    allowedOrigins: ['http://127.0.0.1:6500'],
  };
  const first = new IdentityDevelopmentService({ runtime }),
    second = new IdentityDevelopmentService({ runtime });
  const cookie = `${'a'.repeat(43)}.${Date.now() + 3599000}`,
    req = {
      socket: { remoteAddress: '203.0.113.8' },
      headers: {
        host: '127.0.0.1:6500',
        'x-forwarded-for': '127.0.0.1',
        cookie: `mpf_local_development=${cookie}`,
        'x-csrf-token': first.token(cookie),
      },
    };
  assert.equal(first.local(req), false);
  assert.equal(first.validCsrf(req), true);
  assert.equal(second.validCsrf(req), false);
});
test('disabled restart cannot restore mock actor or authorize private traffic', async () => {
  const service = new IdentityDevelopmentService({
    runtime: qualifyAuthRuntime({ AUTH_DEV_BYPASS_ENABLED: 'false' }, '.'),
  });
  const invoke = async (path, method = 'GET') => {
    const req = {
      path,
      method,
      headers: { 'x-mpf-user-id': developmentFixtureId, cookie: 'mpf_local_development=old' },
      query: { mpfUserId: developmentFixtureId },
    };
    const res = {
      setHeader() {},
      status(n) {
        this.code = n;
        return this;
      },
      json(body) {
        this.body = body;
      },
    };
    let next = false;
    await service.middleware()(req, res, () => {
      next = true;
    });
    return { req, res, next };
  };
  assert.equal((await invoke('/api/me')).req.actorContext, null);
  assert.equal((await invoke('/api/history')).res.code, 503);
  const config = await invoke('/api/auth/config');
  assert.equal(config.res.body.authMode, 'session');
  assert.equal(config.res.body.csrfToken, null);
});
test('bootstrap qualifies before application import and fresh-process paths isolate every mutable root', async (t) => {
  const f = await fixture(t);
  const bootstrap = await fs.readFile(new URL('../../server/server.js', import.meta.url), 'utf8');
  assert.ok(
    bootstrap.indexOf('authRuntime = initialize(env, root)') <
      bootstrap.indexOf('await loadProtected()')
  );
  assert.match(bootstrap, /app\.listen\(authRuntime\.port, authRuntime\.host/);
  const program = `import {initializeAuthRuntime} from './server/config/authPolicy.js';initializeAuthRuntime(JSON.parse(process.argv[1]),process.argv[2]);const p=await import('./server/config/paths.js');console.log(JSON.stringify({data:p.DATA_ROOT,outputs:p.OUTPUTS_DIR,users:p.DATA_FILES.mockUsers}));`;
  const child = spawnSync(
    process.execPath,
    [
      '--import',
      './scripts/authentication/network-preload.mjs',
      '--input-type=module',
      '-e',
      program,
      JSON.stringify(f.env),
      f.project,
    ],
    { encoding: 'utf8', env: { ...process.env, MPF_AUTH_FIXTURE_NETWORK: 'offline' } }
  );
  assert.equal(child.status, 0, child.stderr);
  const roots = JSON.parse(child.stdout);
  assert.equal(roots.users, f.usersFile);
  assert.equal(roots.data, path.join(f.project, '.local-auth-fixture/data'));
  assert.equal(roots.outputs, path.join(f.project, '.local-auth-fixture/outputs'));
});

test('actual disabled bootstrap imports no protected singleton and performs no filesystem writes', () => {
  const program = `
    import { registerHooks, syncBuiltinESMExports } from 'node:module';
    import fs from 'node:fs';
    import http from 'node:http';
    const imports=[];
    registerHooks({resolve(specifier,context,next){
      if(specifier==='dotenv')return {url:'data:text/javascript,export default {config(){}}',shortCircuit:true};
      const result=next(specifier,context);imports.push(result.url);
      if(/\\/server\\/(repositories|providers)\\//.test(result.url)||/\\/server\\/domain\\//.test(result.url)&&!['/identity/IdentityPublicPolicyService.js','/identity/identityEmail.js'].some(suffix=>result.url.endsWith(suffix))||result.url.endsWith('/config/paths.js')||result.url.endsWith('/app/createApp.js'))throw new Error('Protected import attempted');
      return result;
    }});
    for(const name of ['mkdir','writeFile','appendFile','rm','unlink','rename']){
      fs[name]=()=>{throw new Error('Filesystem mutation attempted')};
      fs[name+'Sync']=()=>{throw new Error('Filesystem mutation attempted')};
      fs.promises[name]=async()=>{throw new Error('Filesystem mutation attempted')};
    }
    syncBuiltinESMExports();
    http.Server.prototype.listen=function(){throw new Error('Unexpected HTTP startup')};
    const {prepareServerComposition}=await import('./server/server.js');
    const composition=await prepareServerComposition({env:process.env});
    if(composition.identityRuntime||composition.app.locals.authRuntimeReady||composition.app.locals.billableRecoveryReady)throw new Error('Unexpected protected readiness');
    if(!imports.some(url=>url.endsWith('/app/createAuthenticationUnavailableApp.js')))throw new Error('Missing guest composition');
    console.log(JSON.stringify({port:composition.authRuntime.port,host:composition.authRuntime.host}));
  `;
  for (const value of [undefined, 'false']) {
    const env = { ...process.env };
    delete env.AUTH_DEV_BYPASS_ENABLED;
    if (value !== undefined) env.AUTH_DEV_BYPASS_ENABLED = value;
    const child = spawnSync(
      process.execPath,
      ['--import', './scripts/authentication/network-preload.mjs', '--input-type=module', '-e', program],
      { encoding: 'utf8', env: { ...env, MPF_AUTH_FIXTURE_NETWORK: 'offline' } }
    );
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), { port: 6500, host: '127.0.0.1' });
  }
});

test('lightweight unavailable HTTP serves only readonly presentation and null guest config', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-auth-unavailable-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'index.html'), '<main>Fixture guest shell</main>');
  const app = createAuthenticationUnavailableApp({ webDistRoot: root, i18nRoot: root, brandRoot: root }),
    server = http.createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = (url, method = 'GET') =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port: server.address().port,
          path: url,
          method,
          headers: { 'x-mpf-user-id': 'usr_demo', cookie: 'mpf_local_session=old' },
        },
        (res) => {
          let text = '';
          res.on('data', (chunk) => (text += chunk));
          res.on('end', () => resolve({ status: res.statusCode, text }));
        }
      );
      req.on('error', reject);
      req.end();
    });
  assert.equal((await request('/api/me')).text, 'null');
  const config = JSON.parse((await request('/api/auth/config')).text);
  assert.equal(config.csrfToken, null);
  assert.equal(config.authMode, 'session');
  assert.ok(Object.values(config.methods).every((value) => value === false));
  assert.match((await request('/login')).text, /Fixture guest shell/);
  for (const route of [
    '/api/history',
    '/api/credits',
    '/OUTPUTS/private.png',
    '/api/auth/login',
    '/sub-app-game-character/private',
  ])
    assert.equal((await request(route)).status, 503);
  assert.equal((await request('/api/me', 'PATCH')).status, 503);
  assert.deepEqual(await fs.readdir(root), ['index.html']);
});
