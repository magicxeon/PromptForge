import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ProviderControlRepository } from '../server/repositories/admin-configuration/ProviderControlRepository.js';

test('provider control repository persists versioned commands and replays command IDs', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-provider-control-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const repository = new ProviderControlRepository({ stateFile: path.join(root, 'controls.json') });
  const command = {
    commandId: 'provider-command-0001',
    targetType: 'provider',
    providerId: 'openai',
    modelId: null,
    workflow: null,
    enabled: false,
    expectedVersion: 0,
    reason: 'Provider maintenance',
    actorUserId: 'usr_admin',
    createdAt: '2026-09-05T00:00:00.000Z'
  };

  const first = await repository.applyCommand(command);
  assert.equal(first.replayed, false);
  assert.equal(first.state.version, 1);
  assert.equal(first.state.providers.openai.enabled, false);

  const replay = await repository.applyCommand(command);
  assert.equal(replay.replayed, true);
  assert.equal(replay.state.version, 1);
  assert.equal(replay.state.history.length, 1);
  assert.equal(repository.getStateSync().version, 1);
});

test('provider control repository rejects stale versions without changing state', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-provider-conflict-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const repository = new ProviderControlRepository({ stateFile: path.join(root, 'controls.json') });
  await repository.applyCommand({
    commandId: 'provider-command-0002', targetType: 'model', providerId: 'modelark',
    modelId: 'seedream', workflow: null, enabled: false, expectedVersion: 0,
    reason: 'Model maintenance', actorUserId: 'usr_admin', createdAt: new Date().toISOString()
  });

  await assert.rejects(() => repository.applyCommand({
    commandId: 'provider-command-0003', targetType: 'model', providerId: 'modelark',
    modelId: 'seedream', workflow: null, enabled: true, expectedVersion: 0,
    reason: 'Stale restore', actorUserId: 'usr_admin', createdAt: new Date().toISOString()
  }), error => error.code === 'provider_control_version_conflict');
  assert.equal((await repository.getState()).models['modelark/seedream'].enabled, false);
});
