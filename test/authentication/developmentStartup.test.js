import test from 'node:test';
import assert from 'node:assert/strict';
import { developmentApiEnvironment, developmentApiReady } from '../../scripts/authentication/development-startup.mjs';
import { qualifyAuthRuntime } from '../../server/config/authPolicy.js';
import { setupDevelopmentFixture } from '../../scripts/authentication/setup-development.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('development launcher defaults only an absent environment and preserves explicit configuration', () => {
  assert.equal(developmentApiEnvironment({}).NODE_ENV, 'development');
  assert.equal(developmentApiEnvironment({}, { NODE_ENV: 'production' }).NODE_ENV, 'production');
  assert.equal(developmentApiEnvironment({ NODE_ENV: 'test' }, { NODE_ENV: 'development' }).NODE_ENV, 'test');
  assert.equal(developmentApiEnvironment({ NODE_ENV: '' }).NODE_ENV, '');
  assert.equal(developmentApiEnvironment({}).AUTH_DEV_BYPASS_ENABLED, undefined);
});

test('explicit bypass uses isolated setup and still rejects unsafe or missing fixtures', async t => {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-dev-start-'));
  t.after(() => fs.rm(project, { recursive: true, force: true }));
  const env = developmentApiEnvironment({ AUTH_DEV_BYPASS_ENABLED: 'true' });
  assert.throws(() => qualifyAuthRuntime(env, project));
  await setupDevelopmentFixture(project);
  assert.equal(qualifyAuthRuntime(env, project).enabled, true);
  for (const NODE_ENV of ['production', 'test', ''])
    assert.throws(() => qualifyAuthRuntime(developmentApiEnvironment({ ...env, NODE_ENV }), project));
  await assert.rejects(setupDevelopmentFixture(project), { code: 'EEXIST' });
  assert.equal(qualifyAuthRuntime({ ...env, AUTH_DEV_BYPASS_ENABLED: 'false' }, project).enabled, false);
});

test('readiness uses exact IPv4 public health and accepts qualified or read-only guest listening', async () => {
  for (const health of [{ status: 'ok' }, { status: 'ok', authentication: 'unavailable' }]) {
    assert.equal(await developmentApiReady(async (url, options) => {
      assert.equal(url, 'http://127.0.0.1:6500/api/health');
      assert.equal(options.redirect, 'error'); assert.ok(options.signal);
      return new Response(JSON.stringify(health));
    }), true);
  }
  for (const response of [new Response('{}', { status: 404 }), new Response('{}', { status: 503 }),
    new Response('{"status":"starting"}'), new Response('not json')])
    assert.equal(await developmentApiReady(async () => response), false);
  assert.equal(await developmentApiReady(async () => { throw new Error('Unavailable'); }), false);
});
