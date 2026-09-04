import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ProviderAssetRegistrationRepository } from '../server/repositories/assets/ProviderAssetRegistrationRepository.js';

const alice = { userId: 'usr_asset_alice', username: 'alice' };
const bob = { userId: 'usr_asset_bob', username: 'bob' };
const key = {
  sourceAssetId: 'ast_storyboard_1',
  sourceContentHash: 'a'.repeat(64),
  providerId: 'modelark',
  credentialScope: 'modelark:account:test',
  providerProject: 'default'
};

test('provider Asset registration is owner-scoped and idempotent for one approved hash', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'provider-asset-registration-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const repository = new ProviderAssetRegistrationRepository({
    registrationsFile: path.join(directory, 'registrations.json')
  });

  const first = await repository.begin(key, alice);
  const replay = await repository.begin(key, alice);
  assert.equal(replay.id, first.id);
  assert.equal(await repository.findReusable(key, bob), null);

  const active = await repository.updateForOwner(first.id, alice, draft => {
    draft.status = 'active';
    draft.providerAssetId = 'Asset-20260905-approved01';
    draft.signedUrl = 'https://must-not-persist.example/private';
    draft.bytes = 'must-not-persist';
  });
  assert.equal(active.providerAssetId, 'Asset-20260905-approved01');
  assert.equal('signedUrl' in active, false);
  assert.equal('bytes' in active, false);

  const changed = await repository.begin({ ...key, sourceContentHash: 'b'.repeat(64) }, alice);
  assert.notEqual(changed.id, first.id);
});
