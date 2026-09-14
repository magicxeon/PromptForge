import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { FacelessPrevisAssetService } from '../server/domain/assets/FacelessPrevisAssetService.js';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { postProcessingServiceClient } from '../server/providers/PostProcessingServiceClient.js';

const alice = { userId: 'usr_alice', username: 'alice', role: 'user' };
const bob = { userId: 'usr_bob', username: 'bob', role: 'user' };

async function testImage() {
  return sharp({ create: { width: 200, height: 200, channels: 3,
    background: { r: 40, g: 80, b: 120 } } }).png().toBuffer();
}

test('[security] Asset facade rejects another actor and leaves original intact', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'faceless-assets-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const input = await testImage();
  const relative = 'source.png';
  await fs.writeFile(path.join(directory, relative), input);
  const original = { id: 'ast_source', ownerUserId: alice.userId,
    assetType: 'cinematic_storyboard_source', status: 'active',
    storageKey: relative, sourceJobId: 'job_1', publicUrl: '/outputs/source.png',
    sizeBytes: input.length, metadata: { immutable: true,
      contentHash: createHash('sha256').update(input).digest('hex') } };
  const records = [original];
  let processCount = 0;
  const service = new FacelessPrevisAssetService({
    outputsDirectory: directory,
    assetRepository: {
      findByIdForOwner: async (id, owner) => records.find(item => item.id === id && item.ownerUserId === owner) || null,
      findBySourceJobIdForOwner: async (id, owner) => records.find(item => item.sourceJobId === id && item.ownerUserId === owner) || null,
      create: async (record, actor) => {
        const asset = { ...record, id: 'ast_masked', ownerUserId: actor.userId, status: 'active',
          createdAt: new Date().toISOString() };
        records.push(asset);
        return asset;
      }
    },
    processingClient: {
      capabilities: async () => ({ available: true, modelHash: 'model_1', policyVersion: 'white-previs-v1' }),
      createFacelessPrevis: async bytes => {
        processCount += 1;
        const fakeOutput = await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toBuffer();
        const hash = createHash('sha256').update(fakeOutput).digest('hex');
        return { bytes: fakeOutput, outputHash: hash,
          faceCount: 1, modelHash: 'model_1', policyVersion: 'white-previs-v1' };
      }
    }
  });
  const args = { sourceAssetId: original.id, projectId: 'project_1', sceneId: 'scene_1',
    shotId: 'shot_1', expectedFaces: 1 };
  await assert.rejects(service.prepare({ ...args, actorContext: bob }),
    { code: 'faceless_source_unavailable' });
  const masked = await service.prepare({ ...args, actorContext: alice });
  assert.equal(masked.sourceKind, 'faceless_previs');
  assert.equal((await fs.readFile(path.join(directory, relative))).equals(input), true);
  const repeated = await service.prepare({ ...args, actorContext: alice });
  assert.equal(repeated.assetId, masked.assetId);
  assert.equal(processCount, 1);
  const recordCount = records.length;
  service.processingClient.createFacelessPrevis = async () => {
    throw Object.assign(new Error('Detection unavailable'), { code: 'faceless_detection_failed' });
  };
  await assert.rejects(service.prepare({ ...args, expectedFaces: 2, actorContext: alice }),
    { code: 'faceless_detection_failed' });
  assert.equal(records.length, recordCount);
  assert.equal((await fs.readFile(path.join(directory, relative))).equals(input), true);
});

test('[cinematic] preparation checks Project and Shot versions before processing', async () => {
  let calls = 0;
  const app = new CinematicApplicationService({
    facelessAssetService: { prepare: async () => { calls += 1; return {}; } },
    storyboardAssetService: { approveGenerationResult: async () => ({ assetId: 'ast_source' }) }
  });
  app.getProject = async () => ({ version: 3, status: 'planned',
    scenes: [{ id: 'scene_1', shots: [{ id: 'shot_1', version: 2 }] }],
    generationAttempts: [{ operation: 'cinematic_storyboard_still', shotId: 'shot_1', generationJobId: 'job_1' }] });
  await assert.rejects(app.prepareFacelessPrevis('project_1', 'scene_1', 'shot_1',
    { expectedVersion: 2, expectedShotVersion: 2, expectedFaces: 1,
      sourceType: 'generation_job', jobId: 'job_1' }, alice), { code: 'cinematic_version_conflict' });
  assert.equal(calls, 0);
  await assert.rejects(app.prepareFacelessPrevis('project_1', 'scene_1', 'shot_1',
    { expectedVersion: 3, expectedShotVersion: 1, expectedFaces: 1,
      sourceType: 'generation_job', jobId: 'job_1' }, alice), { code: 'cinematic_shot_version_conflict' });
  assert.equal(calls, 0);
  await app.prepareFacelessPrevis('project_1', 'scene_1', 'shot_1',
    { expectedVersion: 3, expectedShotVersion: 2, expectedFaces: 1,
      sourceType: 'generation_job', jobId: 'job_1' }, alice);
  assert.equal(calls, 1);
});
