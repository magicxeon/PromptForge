import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import express from 'express';
import { qualifyAuthRuntime, developmentFixtureId, developmentAdminFixtureId } from '../../server/config/authPolicy.js';
import { setupDevelopmentFixture, setupDevelopmentAdminFixture } from '../../scripts/authentication/setup-development.mjs';
import { MockUserRepository } from '../../server/repositories/identity/MockUserRepository.js';
import { IdentityDevelopmentService } from '../../server/domain/identity/IdentityDevelopmentService.js';
import { AdminFeaturePolicyService } from '../../server/domain/admin/AdminFeaturePolicyService.js';
import { AdminPolicyService } from '../../server/domain/admin/AdminPolicyService.js';
import { registerIdentityRoutes } from '../../server/app/routes/identityRoutes.js';

const env = { AUTH_DEV_BYPASS_ENABLED: 'true', NODE_ENV: 'development', AUTH_DEV_BYPASS_ROLE: 'admin' };
async function fixture(t) {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-local-admin-'));
  t.after(() => fs.rm(project, { recursive: true, force: true }));
  await setupDevelopmentAdminFixture(project);
  const usersFile = path.join(project, '.local-auth-fixture/data/identity/mockUsers.json');
  return { project, usersFile, repo: new MockUserRepository({ usersFile }) };
}

test('live generation is explicit local Admin only and reauthorizes fresh fixture identity', async t => {
  const f = await fixture(t);
  assert.equal(qualifyAuthRuntime(env, f.project).liveGeneration, false);
  const liveEnv = { ...env, AUTH_DEV_BYPASS_GENERATION_ENABLED: 'true' };
  const runtime = qualifyAuthRuntime(liveEnv, f.project);
  assert.equal(runtime.liveGeneration, true);
  for (const change of [{ NODE_ENV: 'production' }, { AUTH_DEV_BYPASS_ROLE: 'user' },
    { AUTH_DEV_BYPASS_GENERATION_ENABLED: 'TRUE' }])
    assert.throws(() => qualifyAuthRuntime({ ...liveEnv, ...change }, f.project));
  assert.equal(qualifyAuthRuntime({ ...liveEnv, AUTH_DEV_BYPASS_ENABLED: 'false' }, f.project).enabled, false);
  const req = { path: '/api/credits/account', method: 'GET', socket: { remoteAddress: '127.0.0.1' },
    headers: { host: 'localhost:6500', origin: 'http://localhost:6500' } };
  const res = { setHeader() {}, status() { return this; }, json() { throw new Error('Unexpected denial.'); } };
  await new IdentityDevelopmentService({ runtime, userRepository: f.repo }).middleware()(req, res, () => {});
  assert.equal((await req.reauthorizeIdentity()).userId, developmentAdminFixtureId);
  const users = await f.repo.readAll();
  await fs.writeFile(f.usersFile, JSON.stringify(users.map(user => user.id === developmentAdminFixtureId
    ? { ...user, status: 'disabled' } : user)));
  await assert.rejects(req.reauthorizeIdentity);
  await fs.writeFile(f.usersFile, JSON.stringify(users));
  req.headers.origin = 'https://attacker.invalid';
  await assert.rejects(req.reauthorizeIdentity);
});

test('local admin role options qualify only explicit isolated development and preserve defaults', async t => {
  const f = await fixture(t);
  assert.equal(qualifyAuthRuntime(env, f.project).actorId, developmentAdminFixtureId);
  assert.equal(qualifyAuthRuntime({ AUTH_DEV_BYPASS_ENABLED: 'true', NODE_ENV: 'development', UTH_DEV_BYPASS_ROLE: 'admin' }, f.project).role, 'admin');
  assert.equal(qualifyAuthRuntime({ AUTH_DEV_BYPASS_ENABLED: 'true', NODE_ENV: 'development' }, f.project).actorId, developmentFixtureId);
  assert.equal(qualifyAuthRuntime({ ...env, AUTH_DEV_BYPASS_ENABLED: 'false' }, f.project).enabled, false);
  for (const change of [{ NODE_ENV: 'production' }, { NODE_ENV: 'test' }, { NODE_ENV: 'staging' },
    { NODE_ENV: undefined }, { HOST: '0.0.0.0' }, { AUTH_DEV_BYPASS_ROLE: 'support' },
    { AUTH_DEV_BYPASS_ROLE: 'ADMIN' }, { AUTH_DEV_BYPASS_ROLE: '' }, { UTH_DEV_BYPASS_ROLE: 'user' }])
    assert.throws(() => qualifyAuthRuntime({ ...env, ...change }, f.project));
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-admin-missing-'));
  t.after(() => fs.rm(base, { recursive: true, force: true }));
  await setupDevelopmentFixture(base);
  assert.throws(() => qualifyAuthRuntime(env, base));
});

test('explicit admin setup is additive and preserves user/admin preferences and rejects arbitrary privilege', async t => {
  const f = await fixture(t);
  await f.repo.updatePreferences(developmentFixtureId, { confirmCreditUsage: false });
  await f.repo.updatePreferences(developmentAdminFixtureId, { confirmCreditUsage: false });
  await setupDevelopmentAdminFixture(f.project);
  const users = await f.repo.readAll();
  assert.equal(users.length, 2); assert.ok(users.every(user => user.preferences.confirmCreditUsage === false));
  users[0].role = 'admin'; await fs.writeFile(f.usersFile, JSON.stringify(users));
  assert.throws(() => qualifyAuthRuntime(env, f.project));
  await assert.rejects(setupDevelopmentAdminFixture(f.project));
});

test('local admin HTTP uses fixed role, valid CSRF for isolated commands, bounded capabilities and downgrade denial', async t => {
  const f = await fixture(t), app = express(), server = http.createServer(app);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;
  let runtime = qualifyAuthRuntime({ ...env, PORT: String(port) }, f.project);
  let middleware = new IdentityDevelopmentService({ runtime, userRepository: f.repo }).middleware();
  app.use((req, res, next) => middleware(req, res, next)); app.use(express.json());
  registerIdentityRoutes(app, { mockUserRepo: f.repo });
  const policy = new AdminPolicyService(); let commands = 0;
  app.get('/api/admin/overview', (req, res) => { policy.assertCanAccessBackoffice(req.actorContext); res.json({ role: req.actorContext.role }); });
  app.post('/api/admin/provider-controls/commands', (req, res) => { policy.assertCanManageProviderControls(req.actorContext); commands++; res.json({ ok: true }); });
  app.use((_req, res) => res.json({ reached: true }));
  const origin = `http://localhost:${port}`;
  const request = (url, method = 'GET', headers = {}) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: url, method,
      headers: { host: `localhost:${port}`, origin, ...headers } }, res => {
      let body = ''; res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) }));
    }); req.on('error', reject); req.end();
  });
  const actor = await request('/api/me?mpfUserId=real-admin', 'GET', { 'x-mpf-user-id': 'real-admin' });
  assert.equal(actor.body.userId, developmentAdminFixtureId); assert.equal(actor.body.role, 'admin');
  assert.equal((await request('/api/admin/overview')).body.role, 'admin');
  const config = await request('/api/auth/config'), cookie = config.headers['set-cookie'][0].split(';')[0];
  const headers = { cookie, 'x-csrf-token': config.body.csrfToken };
  assert.equal((await request('/api/admin/provider-controls/commands', 'POST')).status, 403);
  assert.equal((await request('/api/admin/provider-controls/commands', 'POST', headers)).status, 200);
  assert.equal(commands, 1);
  assert.equal((await request('/api/admin/provider-controls/commands', 'POST', { ...headers, origin: 'https://attacker.invalid' })).status, 403);
  for (const url of ['/api/generate', '/api/auth/password/login', '/api/admin/credits/real/adjustments',
    '/api/admin/configuration/revisions/live/publications', '/api/admin/unknown-command'])
    assert.equal((await request(url, 'POST', headers)).status, 403);
  assert.equal((await request('/outputs/live.png')).status, 403);
  assert.equal((await request('/api/admin/unknown-read')).status, 403);
  const roster = await f.repo.readAll();
  await fs.writeFile(f.usersFile, JSON.stringify([...roster, { id: 'real-admin', role: 'admin' }]));
  assert.equal((await request('/api/admin/overview')).status, 503);
  await fs.writeFile(f.usersFile, JSON.stringify(roster.map(user => user.id === developmentFixtureId
    ? { ...user, role: 'admin' } : user)));
  assert.equal((await request('/api/admin/overview')).status, 503);
  await fs.writeFile(f.usersFile, JSON.stringify(roster));
  const capabilities = new AdminFeaturePolicyService({ environment: { ADMIN_FINANCIAL_COMMANDS_ENABLED: 'true', ADMIN_RUNTIME_CONFIGURATION_PUBLISH_ENABLED: 'true' } }).getExposure(actor.body);
  assert.equal(capabilities.capabilities.financialCommands.enabled, false);
  assert.equal(capabilities.capabilities.runtimeConfigurationPublish.enabled, false);
  assert.equal(capabilities.capabilities.providerRuntimeControl.enabled, true);
  assert.equal((await request('/api/generation/video/capabilities')).status, 403);
  runtime = qualifyAuthRuntime({ ...env, PORT: String(port), AUTH_DEV_BYPASS_GENERATION_ENABLED: 'true' }, f.project);
  middleware = new IdentityDevelopmentService({ runtime, userRepository: f.repo }).middleware();
  const liveConfig = await request('/api/auth/config');
  const liveHeaders = { cookie: liveConfig.headers['set-cookie'][0].split(';')[0], 'x-csrf-token': liveConfig.body.csrfToken };
  for (const url of ['/api/generation/video/capabilities', '/api/generation/video/trusted-sources',
    '/api/generation/video/tasks', '/api/generation/video/tasks/fixture', '/api/character-profiles',
    '/api/character-profiles/fixture/looks', '/api/character-profiles/fixture/media/thumbnail',
    '/api/character-profiles/fixture/looks/look/versions/version/media/sheet'])
    assert.equal((await request(url)).status, 200, url);
  for (const url of ['/api/generation/video/quote', '/api/generation/video/tasks']) {
    assert.equal((await request(url, 'POST')).status, 403);
    assert.equal((await request(url, 'POST', liveHeaders)).status, 200);
    assert.equal((await request(url, 'POST', { ...liveHeaders, origin: 'https://attacker.invalid' })).status, 403);
  }
  for (const url of ['/api/generation/video/unknown', '/api/cinematic/projects/fixture/generate',
    '/api/admin/credits/fixture/adjustments', '/api/character-profiles'])
    assert.equal((await request(url, 'POST', liveHeaders)).status, 403);
  runtime = qualifyAuthRuntime({ ...env, PORT: String(port), AUTH_DEV_BYPASS_ROLE: 'user' }, f.project);
  middleware = new IdentityDevelopmentService({ runtime, userRepository: f.repo }).middleware();
  assert.equal((await request('/api/me', 'GET', headers)).body.userId, developmentFixtureId);
  assert.equal((await request('/api/admin/overview', 'GET', headers)).status, 403);
  assert.equal((await request('/api/generation/video/capabilities')).status, 403);
  assert.equal((await request('/api/generation/video/tasks', 'POST', liveHeaders)).status, 403);
  assert.equal((await request('/api/me/preferences', 'PATCH', headers)).status, 403);
  middleware = new IdentityDevelopmentService({ runtime: qualifyAuthRuntime({ AUTH_DEV_BYPASS_ENABLED: 'false' }, f.project) }).middleware();
  assert.equal((await request('/api/admin/overview', 'GET', headers)).status, 503);
  assert.equal(commands, 1);
});
