import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ModelArkAigcAssetRegistrationService } from '../server/domain/assets/ModelArkAigcAssetRegistrationService.js';
import { ProviderAssetRegistrationRepository } from '../server/repositories/assets/ProviderAssetRegistrationRepository.js';

const actor = { userId: 'usr_asset_owner', username: 'asset_owner' };
const contentHash = 'a'.repeat(64);
const authority = { assetId: 'ast_storyboard_1', contentHash };
const sourceAsset = { id: authority.assetId, mimeType: 'image/png' };

test('registration publishes exact approved bytes once, waits for Active and reuses asset://', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'modelark-aigc-registration-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const repository = new ProviderAssetRegistrationRepository({
    registrationsFile: path.join(directory, 'registrations.json')
  });
  const calls = [];
  let statusIndex = 0;
  const storage = {
    assertConfigured() { calls.push('storage-preflight'); },
    async publish(input) {
      calls.push(['publish', Buffer.from(input.bytes)]);
      return {
        objectKey: 'modelark-aigc-handoff/owner/asset/hash.png',
        sourceUrl: 'https://storage.example/signed-frame',
        expiresAt: '2026-09-05T01:00:00.000Z'
      };
    },
    async cleanup(objectKey) { calls.push(['cleanup', objectKey]); return true; }
  };
  const assetLibraryClient = {
    projectName: 'default',
    assertConfigured() { calls.push('asset-preflight'); },
    async resolveAigcGroup() { calls.push('group'); return 'group-20260905-aigc01'; },
    async createImageAsset(input) {
      calls.push(['create', input]);
      return { id: 'Asset-20260905-approved01', requestId: 'request-asset-1' };
    },
    async getAsset() {
      const status = ['processing', 'active'][Math.min(statusIndex++, 1)];
      calls.push(['get', status]);
      return { id: 'Asset-20260905-approved01', groupId: 'group-20260905-aigc01', status };
    }
  };
  const service = new ModelArkAigcAssetRegistrationService({
    repository, storage, assetLibraryClient,
    sourceLoader: async () => ({ bytes: Buffer.from('exact-approved-bytes'), contentHash }),
    environment: { MODEL_ARK_ASSET_POLL_INTERVAL_MS: '250', MODEL_ARK_ASSET_INGEST_TIMEOUT_MS: '5000' },
    wait: async () => {}
  });

  const registrationInput = {
    sourceAsset, sourceAuthority: authority, actorContext: actor,
    credentialScope: 'modelark:account:test'
  };
  const [first, concurrent] = await Promise.all([
    service.resolveFirstFrame(registrationInput),
    service.resolveFirstFrame(registrationInput)
  ]);
  const replay = await service.resolveFirstFrame({
    sourceAsset, sourceAuthority: authority, actorContext: actor,
    credentialScope: 'modelark:account:test'
  });

  assert.equal(first.assetUri, 'asset://Asset-20260905-approved01');
  assert.equal(concurrent.assetUri, first.assetUri);
  assert.equal(replay.assetUri, first.assetUri);
  assert.deepEqual(calls.find(call => Array.isArray(call) && call[0] === 'publish')[1], Buffer.from('exact-approved-bytes'));
  assert.equal(calls.filter(call => Array.isArray(call) && call[0] === 'publish').length, 1);
  assert.equal(calls.filter(call => Array.isArray(call) && call[0] === 'create').length, 1);
  assert.equal(JSON.stringify(await repository.findReusable({
    sourceAssetId: authority.assetId, sourceContentHash: contentHash, providerId: 'modelark',
    credentialScope: 'modelark:account:test', providerProject: 'default'
  }, actor)).includes('signed-frame'), false);
});

test('ambiguous CreateAsset transport fails closed instead of registering a duplicate', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'modelark-aigc-reconcile-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const repository = new ProviderAssetRegistrationRepository({
    registrationsFile: path.join(directory, 'registrations.json')
  });
  let creates = 0;
  const service = new ModelArkAigcAssetRegistrationService({
    repository,
    storage: {
      assertConfigured() {},
      async publish() { return { objectKey: 'modelark-aigc-handoff/a/b/c.png', sourceUrl: 'https://storage.example/signed' }; }
    },
    assetLibraryClient: {
      projectName: 'default', assertConfigured() {},
      async resolveAigcGroup() { return 'group-20260905-aigc01'; },
      async createImageAsset() {
        creates += 1;
        throw Object.assign(new Error('timeout'), {
          code: 'video_provider_asset_library_unreachable', deliveryState: 'unknown'
        });
      }
    },
    sourceLoader: async () => ({ bytes: Buffer.from('approved'), contentHash })
  });
  const input = {
    sourceAsset, sourceAuthority: authority, actorContext: actor,
    credentialScope: 'modelark:account:test'
  };

  await assert.rejects(service.resolveFirstFrame(input), error => error.code === 'video_provider_asset_library_unreachable');
  await assert.rejects(service.resolveFirstFrame(input), error => error.code === 'video_provider_asset_registration_reconciliation_required');
  assert.equal(creates, 1);
});
