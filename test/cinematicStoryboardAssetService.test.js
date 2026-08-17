import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CinematicStoryboardAssetService } from '../server/domain/assets/CinematicStoryboardAssetService.js';

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
