import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CinematicVideoAssetService } from '../server/domain/assets/CinematicVideoAssetService.js';
import { AssetRepository } from '../server/repositories/assets/AssetRepository.js';

test('CinematicVideoAssetService copies a bounded provider file into immutable private Asset storage idempotently', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-video-asset-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'provider.mp4');
  const outputs = path.join(directory, 'outputs');
  await fs.writeFile(source, Buffer.from('deterministic-video-fixture'));
  const assetRepository = new AssetRepository({
    assetsFile: path.join(directory, 'assets.json'),
    userRepository: { getById: async id => ({ id, username: 'user_alice' }) }
  });
  const posterService = {
    async generatePoster({ posterPath }) {
      await fs.writeFile(posterPath, Buffer.from('deterministic-poster-fixture'));
      return { sizeBytes: 28, mimeType: 'image/webp', frameTimestamp: '0.600' };
    }
  };
  const service = new CinematicVideoAssetService({ assetRepository, posterService, outputsDirectory: outputs, maxBytes: 1024 });
  const task = {
    id: 'videotask_1', ownerUserId: 'usr_alice', ownerUsername: 'user_alice', providerTaskId: 'provider_1',
    providerOperationId: 'operation_1', projectId: 'project_1', sceneId: 'scene_1', shotId: 'shot_1', attemptId: 'attempt_1'
  };
  const first = await service.persistVideoOutput({ task, output: { filePath: source, mimeType: 'video/mp4', durationSeconds: 4, fps: 24 } });
  const replay = await service.persistVideoOutput({ task, output: { filePath: source, mimeType: 'video/mp4' } });
  assert.equal(replay.assetId, first.assetId);
  assert.equal(first.mimeType, 'video/mp4');
  assert.equal(first.posterUrl, '/outputs/cinematic-video/usr_alice/videotask_1.poster.webp');
  assert.equal((await fs.readFile(path.join(outputs, 'cinematic-video', 'usr_alice', 'videotask_1.mp4'))).toString(), 'deterministic-video-fixture');
  assert.equal((await fs.readFile(path.join(outputs, 'cinematic-video', 'usr_alice', 'videotask_1.poster.webp'))).toString(), 'deterministic-poster-fixture');
});

test('CinematicVideoAssetService rejects an oversized provider file before Asset creation', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-video-limit-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'provider.mp4');
  await fs.writeFile(source, Buffer.alloc(32));
  const service = new CinematicVideoAssetService({
    assetRepository: { findBySourceJobIdForOwner: async () => null, create: async () => assert.fail('must not create') },
    posterService: { generatePoster: async () => assert.fail('must not generate') },
    outputsDirectory: path.join(directory, 'outputs'), maxBytes: 16
  });
  await assert.rejects(
    service.persistVideoOutput({ task: { id: 'task', ownerUserId: 'owner', ownerUsername: 'owner' }, output: { filePath: source, mimeType: 'video/mp4' } }),
    error => error.code === 'video_media_size_invalid'
  );
});

test('CinematicVideoAssetService repairs poster metadata from an existing deterministic derivative', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-video-poster-repair-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const outputs = path.join(directory, 'outputs');
  const videoPath = path.join(outputs, 'cinematic-video', 'usr_alice', 'videotask_repair.mp4');
  const posterPath = path.join(outputs, 'cinematic-video', 'usr_alice', 'videotask_repair.poster.webp');
  await fs.mkdir(path.dirname(videoPath), { recursive: true });
  await fs.writeFile(videoPath, 'video');
  await fs.writeFile(posterPath, 'poster');
  const assetRepository = new AssetRepository({
    assetsFile: path.join(directory, 'assets.json'),
    userRepository: { getById: async id => ({ id, username: 'user_alice' }) }
  });
  await assetRepository.create({
    assetType: 'cinematic_video_output',
    storageKey: 'cinematic-video/usr_alice/videotask_repair.mp4',
    publicUrl: '/outputs/cinematic-video/usr_alice/videotask_repair.mp4',
    mimeType: 'video/mp4',
    sourceJobId: 'videotask_repair',
    metadata: { durationSeconds: 4 }
  }, { userId: 'usr_alice', username: 'user_alice', role: 'user' });
  const service = new CinematicVideoAssetService({
    assetRepository,
    posterService: { generatePoster: async () => assert.fail('existing poster must be reused') },
    outputsDirectory: outputs
  });
  const result = await service.persistVideoOutput({
    task: { id: 'videotask_repair', ownerUserId: 'usr_alice', ownerUsername: 'user_alice' },
    output: { mimeType: 'video/mp4' }
  });
  assert.equal(result.posterUrl, '/outputs/cinematic-video/usr_alice/videotask_repair.poster.webp');
});
