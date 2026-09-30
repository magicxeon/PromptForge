import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import express from 'express';
import { UserPreferenceService, userPreferenceService } from '../server/domain/identity/UserPreferenceService.js';
import { MockUserRepository, mockUserRepo } from '../server/repositories/identity/MockUserRepository.js';
import { writeJsonFileAtomic } from '../server/repositories/json/jsonFileStore.js';
import { registerIdentityRoutes } from '../server/app/routes/identityRoutes.js';

const users = [
  { id: 'alice', username: 'alice-name', role: 'user', status: 'active', displayName: 'Alice', preferences: { theme: 'dark' }, custom: { retained: true } },
  { id: 'bob', username: 'bob-name', role: 'admin', status: 'active', preferences: { confirmCreditUsage: false } }
];

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mpf-user-preferences-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const usersFile = path.join(directory, 'users.json');
  await writeJsonFileAtomic(usersFile, users);
  const userRepository = new MockUserRepository({ usersFile });
  return { usersFile, userRepository, service: new UserPreferenceService({ userRepository }) };
}

async function httpFixture(t, dependencies) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (req.headers['x-test-actor']) req.actorContext = { userId: req.headers['x-test-actor'], username: 'bob-name' };
    next();
  });
  registerIdentityRoutes(app, {
    communityFeaturePolicyService: { getPublicFlags: async () => ({ development: { mockActorSwitcherEnabled: true } }) },
    ...dependencies
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  return async (method, body, actor = 'alice', suffix = '/preferences') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/me${suffix}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(actor ? { 'x-test-actor': actor } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    return { status: response.status, body: await response.json() };
  };
}

test('canonical service defaults to the existing repository without accessing live data', () => {
  assert.equal(userPreferenceService.userRepository, mockUserRepo);
  assert.equal(new UserPreferenceService().userRepository, mockUserRepo);
});

test('preferences default safely without backfill and persist both boolean values', async t => {
  const { service, userRepository, usersFile } = await fixture(t);
  const before = await readFile(usersFile, 'utf8');
  assert.deepEqual(await service.getPreferences({ userId: 'alice' }), { confirmCreditUsage: true });
  assert.equal(await readFile(usersFile, 'utf8'), before);
  for (const confirmCreditUsage of [false, true]) {
    assert.deepEqual(await service.updatePreferences({ confirmCreditUsage }, { userId: 'alice', username: 'bob-name' }), { confirmCreditUsage });
    const reloaded = new UserPreferenceService({ userRepository: new MockUserRepository({ usersFile }) });
    assert.deepEqual(await reloaded.getPreferences({ userId: 'alice' }), { confirmCreditUsage });
    assert.deepEqual(await userRepository.findById('alice'), { ...users[0], preferences: { theme: 'dark', confirmCreditUsage } });
    assert.deepEqual(await userRepository.findById('bob'), users[1]);
  }
});

test('legacy missing or nonboolean values require confirmation', async () => {
  for (const preferences of [undefined, null, {}, { confirmCreditUsage: 'false' }, { confirmCreditUsage: 0 }]) {
    const service = new UserPreferenceService({ userRepository: { findById: async () => ({ preferences }) } });
    assert.deepEqual(await service.getPreferences({ userId: 'alice' }), { confirmCreditUsage: true });
  }
});

test('strict patches reject unknown keys, identity injection, and nonbooleans without writes', async t => {
  const { service, usersFile } = await fixture(t);
  const before = await readFile(usersFile, 'utf8');
  const invalid = [undefined, null, [], true, 'false', {}, { confirmCreditUsage: null },
    { confirmCreditUsage: 'false' }, { confirmCreditUsage: 0 },
    ...['userId', 'username', 'role', 'preferences', 'unexpected', 'constructor', '__proto__'].map(key => ({ confirmCreditUsage: false, [key]: 'bob' }))];
  for (const input of invalid) {
    await assert.rejects(service.updatePreferences(input, { userId: 'alice' }), { code: 'user_preferences_invalid', statusCode: 400 });
  }
  assert.equal(await readFile(usersFile, 'utf8'), before);
});

test('missing actors and unknown IDs cannot fall back to username or create users', async t => {
  const { service, usersFile } = await fixture(t);
  const before = await readFile(usersFile, 'utf8');
  for (const actor of [undefined, {}, { username: 'alice-name' }, { userId: '' }, { userId: 123 }]) {
    await assert.rejects(service.getPreferences(actor), { statusCode: 401 });
    await assert.rejects(service.updatePreferences({ confirmCreditUsage: false }, actor), { statusCode: 401 });
  }
  await assert.rejects(service.getPreferences({ userId: 'missing', username: 'alice-name' }), { statusCode: 404 });
  await assert.rejects(service.updatePreferences({ confirmCreditUsage: false }, { userId: 'missing' }), { statusCode: 404 });
  assert.equal(await readFile(usersFile, 'utf8'), before);
});

test('atomic preferences preserve concurrent status changes and other actors', async t => {
  const { service, userRepository } = await fixture(t);
  await Promise.all([
    service.updatePreferences({ confirmCreditUsage: false }, { userId: 'alice' }),
    userRepository.updateStatus('alice', { status: 'suspended', expectedStatus: 'active', idempotencyKey: 'status-test' }),
    service.updatePreferences({ confirmCreditUsage: true }, { userId: 'bob' })
  ]);
  const alice = await userRepository.findById('alice');
  assert.equal(alice.status, 'suspended');
  assert.equal(alice.lastAdminStatusCommand.idempotencyKey, 'status-test');
  assert.deepEqual(alice.preferences, { theme: 'dark', confirmCreditUsage: false });
  assert.deepEqual(alice.custom, users[0].custom);
  assert.deepEqual(await service.getPreferences({ userId: 'bob' }), { confirmCreditUsage: true });
});

test('HTTP routes use the injected repository, self actor only, and minimal projections', async t => {
  const { userRepository } = await fixture(t);
  const request = await httpFixture(t, { mockUserRepo: userRepository });
  assert.deepEqual(await request('GET'), { status: 200, body: { confirmCreditUsage: true } });
  assert.deepEqual(await request('PATCH', { confirmCreditUsage: false }, 'alice', '/preferences?userId=bob&username=bob-name'), { status: 200, body: { confirmCreditUsage: false } });
  assert.deepEqual(await request('PATCH', { confirmCreditUsage: true }, 'bob'), { status: 200, body: { confirmCreditUsage: true } });
  assert.deepEqual(await request('GET'), { status: 200, body: { confirmCreditUsage: false } });
  assert.equal((await request('PATCH', { confirmCreditUsage: true, role: 'admin' })).status, 400);
  assert.equal((await request('GET', undefined, null)).status, 401);
  assert.equal((await request('PATCH', { confirmCreditUsage: false }, null)).status, 401);
  assert.equal((await request('GET', undefined, 'unknown')).status, 404);
  assert.equal((await request('PATCH', { confirmCreditUsage: false }, 'unknown')).status, 404);
  assert.deepEqual((await request('GET', undefined, 'alice', '')).body, { userId: 'alice', username: 'bob-name' });
});

test('HTTP errors sanitize repository failures even with forged status and code', async t => {
  const fail = async () => { throw Object.assign(new Error('secret private path and payload'), { statusCode: 400, code: 'private_code' }); };
  const service = new UserPreferenceService({ userRepository: { findById: fail, updatePreferences: fail } });
  const request = await httpFixture(t, { userPreferenceService: service });
  for (const method of ['GET', 'PATCH']) {
    assert.deepEqual(await request(method, method === 'PATCH' ? { confirmCreditUsage: false } : undefined), {
      status: 500, body: { error: 'Unable to access user preferences.', code: 'user_preferences_unavailable' }
    });
  }
});
