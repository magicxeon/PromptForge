import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { createPostProcessingServer } from '../post-processing-service/api/server.mjs';
import { loadPostProcessingConfig, validatePolicy } from '../post-processing-service/config/serviceConfig.mjs';
import { createFacelessPrevis } from '../post-processing-service/domain/facelessPrevis.mjs';
import { ensureFaceModel } from '../post-processing-service/setupModel.mjs';
import { FacelessPrevisAssetService } from '../server/domain/assets/FacelessPrevisAssetService.js';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';

const token = 'test-internal-token-with-at-least-thirty-two-bytes';
const alice = { userId: 'usr_alice', username: 'alice', role: 'user' };
const bob = { userId: 'usr_bob', username: 'bob', role: 'user' };

function face(cx = 0.5, cy = 0.5) {
  return Array.from({ length: 120 }, (_, i) => ({
    x: cx + 0.14 * Math.cos(i * 2 * Math.PI / 120),
    y: cy + 0.2 * Math.sin(i * 2 * Math.PI / 120),
    z: 0
  }));
}

function fakeDetector(faces = [face()]) {
  return {
    unavailableReason: null,
    initialize: async () => true,
    detect: async () => faces,
    close: async () => undefined
  };
}

async function testImage() {
  return sharp({ create: { width: 200, height: 200, channels: 3,
    background: { r: 40, g: 80, b: 120 } } }).png().toBuffer();
}

test('[config] environment overrides local file and invalid runtime values fail closed', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'faceless-config-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const envFilePath = path.join(directory, '.env');
  await fs.writeFile(envFilePath, 'POST_PROCESSING_PORT=6507\nPOST_PROCESSING_PILOT_ENABLED=false\n');
  const config = loadPostProcessingConfig({ envFilePath, env: {
    POST_PROCESSING_PORT: '6508', POST_PROCESSING_PILOT_ENABLED: 'true'
  } });
  assert.equal(config.runtime.port, 6508);
  assert.equal(config.runtime.pilotEnabled, true);
  assert.equal(config.policy.maxFaces, config.policy.detector.numFaces);
  assert.throws(() => loadPostProcessingConfig({ envFilePath, env: {
    POST_PROCESSING_PILOT_ENABLED: 'yes'
  } }), /must be true or false/);
  assert.throws(() => loadPostProcessingConfig({ envFilePath, env: {
    POST_PROCESSING_HOST: '0.0.0.0'
  } }), /remain 127.0.0.1/);
  assert.throws(() => loadPostProcessingConfig({ envFilePath, env: {
    POST_PROCESSING_PORT: 'invalid'
  } }), /POST_PROCESSING_PORT/);
  const disabled = loadPostProcessingConfig({ envFilePath: path.join(directory, 'missing'), env: {} });
  assert.equal(disabled.runtime.pilotEnabled, false);
  await assert.rejects(createPostProcessingServer({ config: disabled }), /INTERNAL_TOKEN/);
});

test('[config] policy rejects conflicting detector count, hash and threshold', () => {
  const source = loadPostProcessingConfig({ env: {} }).policy;
  const changed = structuredClone(source);
  changed.detector.numFaces = 1;
  assert.throws(() => validatePolicy({ schemaVersion: 1, facelessPrevis: changed }), /must match/);
  changed.detector.numFaces = changed.maxFaces;
  changed.model.sha256 = 'invalid';
  assert.throws(() => validatePolicy({ schemaVersion: 1, facelessPrevis: changed }), /artifact/);
  changed.model.sha256 = source.model.sha256;
  changed.detector.minFaceDetectionConfidence = 2;
  assert.throws(() => validatePolicy({ schemaVersion: 1, facelessPrevis: changed }), /Confidence/);
  changed.detector.minFaceDetectionConfidence = source.detector.minFaceDetectionConfidence;
  changed.maxPixels = '16000000';
  assert.throws(() => validatePolicy({ schemaVersion: 1, facelessPrevis: changed }), /maxPixels/);
});

test('[config] advertised input limit is the same limit enforced by API', async t => {
  const config = loadPostProcessingConfig({ env: {} });
  config.policy.maxInputBytes = 100;
  const server = await createPostProcessingServer({ config, token,
    detector: fakeDetector(), pilotEnabled: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const headers = { 'x-post-processing-token': token };
  const capability = (await (await fetch(base + '/v1/capabilities', { headers })).json())
    .operations.faceless_previs;
  assert.equal(capability.maxBytes, 100);
  const response = await fetch(base + '/v1/faceless-previs', {
    method: 'POST', headers, body: await testImage()
  });
  assert.equal(response.status, 413);
});

test('[config] model setup uses configured path and verifies pinned checksum', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'faceless-model-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const bytes = Buffer.from('test-model-bundle');
  const config = loadPostProcessingConfig({ env: {} });
  config.runtime.modelPath = path.join(directory, 'model.task');
  config.policy.model.sha256 = createHash('sha256').update(bytes).digest('hex');
  const fetchImpl = async () => ({ ok: true,
    headers: { get: () => String(bytes.length) },
    arrayBuffer: async () => bytes });
  assert.equal(await ensureFaceModel({ config, fetchImpl }), true);
  assert.deepEqual(await fs.readFile(config.runtime.modelPath), bytes);
  await fs.writeFile(config.runtime.modelPath, 'altered');
  await assert.rejects(ensureFaceModel({ config, fetchImpl }), /checksum changed/);
});

test('[mask] masks only the face area and preserves source pixels elsewhere', async () => {
  const input = await testImage();
  const result = await createFacelessPrevis(input, { detector: fakeDetector(), expectedFaces: 1 });
  assert.equal(result.faceCount, 1);
  const source = await sharp(input).raw().toBuffer();
  const output = await sharp(result.bytes).raw().toBuffer();
  const at = (x, y) => (y * 200 + x) * 3;
  assert.deepEqual([...output.subarray(at(0, 0), at(0, 0) + 3)],
    [...source.subarray(at(0, 0), at(0, 0) + 3)]);
  assert.notDeepEqual([...output.subarray(at(100, 100), at(100, 100) + 3)],
    [...source.subarray(at(100, 100), at(100, 100) + 3)]);
});

test('[mask] missing second face fails without output', async () => {
  await assert.rejects(createFacelessPrevis(await testImage(), {
    detector: fakeDetector(), expectedFaces: 2
  }), { code: 'faceless_face_count_mismatch' });
});

test('[api] health, capability and binary output have stable contracts', async t => {
  const server = await createPostProcessingServer({ token, detector: fakeDetector(), pilotEnabled: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  assert.equal((await (await fetch(base + '/health')).json()).status, 'running');
  assert.equal((await (await fetch(base + '/v1/health')).json()).status, 'running');
  const capabilities = await (await fetch(base + '/v1/capabilities', {
    headers: { 'x-post-processing-token': token }
  })).json();
  assert.equal(capabilities.operations.faceless_previs.available, true);
  const input = await testImage();
  const response = await fetch(base + '/v1/faceless-previs', {
    method: 'POST',
    headers: {
      'x-post-processing-token': token,
      'x-input-sha256': createHash('sha256').update(input).digest('hex'),
      'x-expected-faces': '1'
    },
    body: input
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  const output = Buffer.from(result.bytesBase64, 'base64');
  assert.equal(result.outputHash, createHash('sha256').update(output).digest('hex'));
  assert.equal(result.faceCount, 1);
});

test('[security] service rejects missing token and altered input hash', async t => {
  const server = await createPostProcessingServer({ token, detector: fakeDetector(), pilotEnabled: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const input = await testImage();
  assert.equal((await fetch(base + '/v1/capabilities')).status, 401);
  const response = await fetch(base + '/v1/faceless-previs', {
    method: 'POST',
    headers: {
      'x-post-processing-token': token,
      'x-input-sha256': 'wrong',
      'x-expected-faces': '1'
    },
    body: input
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'input_hash_mismatch');
});

test('[security] production default leaves Faceless capability disabled', async t => {
  const server = await createPostProcessingServer({ token, detector: fakeDetector(), pilotEnabled: false });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const response = await fetch(base + '/v1/capabilities', {
    headers: { 'x-post-processing-token': token }
  });
  const capability = (await response.json()).operations.faceless_previs;
  assert.equal(capability.available, false);
  assert.equal(capability.reason, 'pilot_disabled');
});

test('[api] timed out detector is closed and capability is disabled', async t => {
  let closed = 0;
  const detector = {
    unavailableReason: null,
    initialize: async () => true,
    detect: async () => new Promise(() => {}),
    close: async () => { closed += 1; }
  };
  const server = await createPostProcessingServer({
    token, detector, pilotEnabled: true, processingTimeoutMs: 10
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const input = await testImage();
  const response = await fetch(base + '/v1/faceless-previs', {
    method: 'POST',
    headers: {
      'x-post-processing-token': token,
      'x-input-sha256': createHash('sha256').update(input).digest('hex'),
      'x-expected-faces': '1'
    },
    body: input
  });
  assert.equal(response.status, 504);
  assert.equal((await response.json()).error.code, 'processing_timeout');
  assert.equal(closed, 1);
  const capability = await (await fetch(base + '/v1/capabilities', {
    headers: { 'x-post-processing-token': token }
  })).json();
  assert.equal(capability.operations.faceless_previs.available, false);
});

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
        const result = await createFacelessPrevis(bytes, { detector: fakeDetector(), expectedFaces: 1 });
        return { bytes: result.bytes, outputHash: result.outputHash,
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

test('[api] face landmarks returns landmark json and valid metadata', async t => {
  const server = await createPostProcessingServer({ token, detector: fakeDetector(), pilotEnabled: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const input = await testImage();
  const response = await fetch(base + '/v1/face-landmarks', {
    method: 'POST',
    headers: {
      'x-post-processing-token': token,
      'x-input-sha256': createHash('sha256').update(input).digest('hex'),
      'x-expected-faces': '1'
    },
    body: input
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.faceCount, 1);
  assert.equal(Array.isArray(result.faces), true);
  assert.equal(result.faces[0].length, 120);
});

test('[api] metrics reports operational uptime, memory and request counters', async t => {
  const server = await createPostProcessingServer({ token, detector: fakeDetector(), pilotEnabled: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const metrics = await (await fetch(base + '/v1/metrics', {
    headers: { 'x-post-processing-token': token }
  })).json();
  assert.equal(metrics.service, 'post-processing');
  assert.equal(typeof metrics.uptimeSeconds, 'number');
  assert.equal(typeof metrics.memoryUsage.heapUsedBytes, 'number');
  assert.equal(metrics.capabilities.faceless_previs, true);
  assert.equal(metrics.capabilities.face_landmarks, true);
});

