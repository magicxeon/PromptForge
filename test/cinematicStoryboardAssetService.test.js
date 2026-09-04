import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  CinematicStoryboardAssetService,
  loadVerifiedStoryboardAssetContent,
  verifyStoryboardAssetContent
} from '../server/domain/assets/CinematicStoryboardAssetService.js';

const alice = { userId: 'usr_alice', username: 'user_alice', role: 'user' };

test('CinematicStoryboardAssetService adopts an owned durable Generation result idempotently', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-storyboard-asset-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, 'storyboard.jpg'), Buffer.from('storyboard-image'));
  const records = [];
  const assetRepository = {
    findBySourceJobIdForOwner: async (jobId, ownerUserId, assetType) => records.find(item => (
      item.sourceJobId === jobId && item.ownerUserId === ownerUserId && item.assetType === assetType
    )) || null,
    create: async (input, actor) => {
      const record = { id: 'ast_storyboard', ...input, ownerUserId: actor.userId, createdAt: '2026-08-17T00:00:00.000Z' };
      records.push(record);
      return record;
    }
  };
  const generationHistory = {
    getById: async jobId => ({
      id: jobId,
      username: 'user_alice',
      imageUrl: '/outputs/storyboard.jpg',
      thumbnailUrl: '/outputs/storyboard-thumb.jpg',
      mimeType: 'image/jpeg'
    })
  };
  const service = new CinematicStoryboardAssetService({ assetRepository, generationHistory, outputsDirectory: directory });
  const first = await service.approveGenerationResult({ jobId: 'job_storyboard' }, alice);
  const replay = await service.approveGenerationResult({ jobId: 'job_storyboard' }, alice);
  assert.equal(first.assetVersionId, 'ast_storyboard');
  assert.equal(first.sourceJobId, 'job_storyboard');
  assert.match(first.contentHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(replay, first);
  assert.equal(records.length, 1);
});

test('CinematicStoryboardAssetService rejects another actor and non-durable output paths', async () => {
  const assetRepository = { findBySourceJobIdForOwner: async () => null };
  const wrongOwner = new CinematicStoryboardAssetService({
    assetRepository,
    generationHistory: { getById: async () => ({ username: 'user_bob', imageUrl: '/outputs/a.jpg' }) }
  });
  await assert.rejects(
    wrongOwner.approveGenerationResult({ jobId: 'job_a' }, alice),
    error => error.code === 'cinematic_storyboard_source_unavailable' && error.statusCode === 404
  );
  const unsafe = new CinematicStoryboardAssetService({
    assetRepository,
    generationHistory: { getById: async () => ({ username: 'user_alice', imageUrl: '/private/a.jpg' }) }
  });
  await assert.rejects(
    unsafe.approveGenerationResult({ jobId: 'job_a' }, alice),
    error => error.code === 'cinematic_storyboard_source_unavailable'
  );
});

test('CinematicStoryboardAssetService preserves compatible Seedream provenance on approval', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-seedream-asset-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, 'seedream.png'), Buffer.from('exact-seedream-output'));
  const records = [];
  const assetRepository = {
    findBySourceJobIdForOwner: async () => null,
    create: async (input, actor) => {
      const record = {
        id: 'ast_seedream', ...input, ownerUserId: actor.userId,
        createdAt: '2026-09-04T00:00:00.000Z'
      };
      records.push(record);
      return record;
    }
  };
  const generatedAt = '2026-09-03T00:00:00.000Z';
  const service = new CinematicStoryboardAssetService({
    assetRepository,
    outputsDirectory: directory,
    clock: () => new Date('2026-09-04T00:00:00.000Z'),
    providerRegistry: {
      getProvider: providerId => providerId === 'modelark' ? {
        models: [{
          id: 'seedream-5-0-lite-260128',
          capabilities: {
            downstreamVideoCompatibility: {
              'modelark-seedance-2': {
                status: 'internal_testing', maximumAgeDays: 30,
                requiresSameCredentialScope: true, requiresOriginalBytes: true
              }
            }
          }
        }]
      } : null
    },
    generationHistory: {
      getById: async () => ({
        username: 'user_alice', imageUrl: '/outputs/seedream.png', mimeType: 'image/png',
        providerOutputProvenance: {
          kind: 'provider_generated_image', providerId: 'modelark',
          requestedModelId: 'seedream-5-0-lite-260128',
          resolvedModelId: 'seedream-5-0-lite-260128', providerRequestId: 'req_seedream',
          credentialScope: 'modelark:test:shared', generatedAt,
          responseFormat: 'b64_json', originalBytesPreserved: true
        }
      })
    }
  });

  const approved = await service.approveGenerationResult({ jobId: 'job_seedream' }, alice);

  assert.equal(approved.providerOutputProvenance.resolvedModelId, 'seedream-5-0-lite-260128');
  assert.equal(approved.videoCompatibility.status, 'eligible_internal_testing');
  assert.equal(approved.videoCompatibility.validUntil, '2026-10-03T00:00:00.000Z');
  assert.equal(records[0].metadata.providerOutputProvenance.providerRequestId, 'req_seedream');
  assert.equal(records[0].metadata.contentHash, approved.contentHash);
});

test('Storyboard Asset content verification detects byte replacement before Video dispatch', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-storyboard-integrity-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const original = Buffer.from('approved-seedream-bytes');
  const filePath = path.join(directory, 'approved.png');
  await fs.writeFile(filePath, original);
  const asset = {
    storageKey: 'approved.png',
    sizeBytes: original.length,
    metadata: {
      contentHash: crypto.createHash('sha256').update(original).digest('hex')
    }
  };

  const verified = await verifyStoryboardAssetContent(asset, { outputsDirectory: directory });
  assert.equal(verified.sizeBytes, original.length);
  const loaded = await loadVerifiedStoryboardAssetContent(asset, { outputsDirectory: directory });
  assert.deepEqual(loaded.bytes, original);

  await fs.writeFile(filePath, Buffer.from('replaced-image-bytes'));
  await assert.rejects(
    verifyStoryboardAssetContent(asset, { outputsDirectory: directory }),
    error => error.code === 'cinematic_storyboard_source_content_changed'
  );
});
