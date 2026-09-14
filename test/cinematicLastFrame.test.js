import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { CinematicLastFrameService } from '../server/domain/assets/CinematicLastFrameService.js';

const alice = { userId: 'usr_alice', username: 'alice', role: 'user' };
const execFileAsync = promisify(execFile);

test('FFmpeg extracts a decodable final frame from a local completed clip', async t => {
  try { await execFileAsync('ffmpeg', ['-version'], { timeout: 3000, windowsHide: true }); }
  catch { t.skip('FFmpeg unavailable'); return; }
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cine-last-frame-real-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const videoKey = 'cinematic-video/usr_alice/test.mp4';
  const videoPath = path.join(root, videoKey);
  await fs.mkdir(path.dirname(videoPath), { recursive: true });
  await execFileAsync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi',
    '-i', 'color=c=red:s=64x36:r=10:d=1', '-c:v', 'mpeg4', '-y', videoPath],
  { timeout: 10000, windowsHide: true });
  const contentHash = crypto.createHash('sha256').update(await fs.readFile(videoPath)).digest('hex');
  const video = { id: 'video_1', status: 'active', assetType: 'cinematic_video_output', storageKey: videoKey,
    metadata: { projectId: 'project_1', sceneId: 'scene_1', shotId: 'shot_1', attemptId: 'take_1',
      contentHash, technicalProbe: { status: 'passed', durationSeconds: 1, fps: 10 } } };
  const records = [];
  const service = new CinematicLastFrameService({ outputsDirectory: root, assetRepository: {
    findByIdForOwner: async (id, owner) => owner === alice.userId
      ? [video, ...records].find(item => item.id === id) || null : null,
    findBySourceJobIdForOwner: async id => records.find(item => item.sourceJobId === id) || null,
    create: async input => { const row = { ...input, id: 'frame_1', status: 'active', createdAt: '2026-09-13T00:00:00.000Z' };
      records.push(row); return row; }
  } });
  const result = await service.prepare({ videoAssetId: 'video_1', attempt: { id: 'take_1' },
    projectId: 'project_1', sceneId: 'scene_1', shotId: 'shot_1', actorContext: alice });
  assert.equal(result.timestampMs, 900);
  const metadata = await sharp(path.join(root, records[0].storageKey)).metadata();
  assert.equal(metadata.width, 64);
  assert.equal(metadata.height, 36);
});

test('last usable frame is an owned immutable derivative, pinned before trim out and reused', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cine-last-frame-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const videoKey = 'cinematic-video/usr_alice/source.mp4';
  await fs.mkdir(path.dirname(path.join(root, videoKey)), { recursive: true });
  await fs.writeFile(path.join(root, videoKey), Buffer.from('fixture-video'));
  const records = [];
  let extractedAt = null;
  const video = { id: 'video_1', status: 'active', assetType: 'cinematic_video_output', storageKey: videoKey,
    metadata: { projectId: 'project_1', sceneId: 'scene_1', shotId: 'shot_1', attemptId: 'take_1',
      contentHash: crypto.createHash('sha256').update('fixture-video').digest('hex'),
      technicalProbe: { status: 'passed', durationSeconds: 4, fps: 25 } } };
  const assetRepository = {
    findByIdForOwner: async (id, owner) => owner === alice.userId
      ? [video, ...records].find(item => item.id === id) || null : null,
    findBySourceJobIdForOwner: async (id, owner) => owner === alice.userId
      ? records.find(item => item.sourceJobId === id) || null : null,
    create: async (input, actor) => {
      assert.equal(actor.userId, alice.userId);
      const row = { ...input, id: `frame_${records.length + 1}`, status: 'active', createdAt: '2026-09-13T00:00:00.000Z' };
      records.unshift(row);
      return row;
    }
  };
  const service = new CinematicLastFrameService({ assetRepository, outputsDirectory: root,
    runProcess: async (_binary, args) => {
      extractedAt = Number(args[args.indexOf('-ss') + 1]);
      await sharp({ create: { width: 16, height: 9, channels: 3, background: '#8799aa' } })
        .png().toFile(args.at(-1));
    } });
  const input = { videoAssetId: video.id,
    attempt: { id: 'take_1', usableRange: { trimOutMs: 3000 }, videoSourceFingerprint: 'take-fingerprint' },
    projectId: 'project_1', sceneId: 'scene_1', shotId: 'shot_1', actorContext: alice };
  const first = await service.prepare(input);
  const again = await service.prepare(input);
  assert.deepEqual(again, first);
  assert.equal(records.length, 1);
  assert.equal(extractedAt, 2.96);
  assert.equal(first.timestampMs, 2960);
  assert.equal(first.sourceKind, 'previous_video_last_frame');
  assert.equal(first.sourceAttemptId, 'take_1');
  assert.equal((await service.resolve(first.assetId, alice)).sourceFingerprint, first.sourceFingerprint);
  await assert.rejects(service.resolve(first.assetId, { ...alice, userId: 'usr_bob' }),
    { code: 'cinematic_previous_frame_unavailable' });
  await fs.writeFile(path.join(root, records[0].storageKey), Buffer.from('changed'));
  await assert.rejects(service.resolve(first.assetId, alice), { code: 'cinematic_previous_frame_changed' });
  const repaired = await service.prepare(input);
  assert.notEqual(repaired.assetId, first.assetId);
  assert.notEqual(records[0].storageKey, records[1].storageKey);
  assert.equal((await service.resolve(repaired.assetId, alice)).sourceFingerprint, repaired.sourceFingerprint);
  assert.equal((await fs.readFile(path.join(root, records[1].storageKey))).toString(), 'changed');
});

test('missing or unprobed previous media never starts frame extraction', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cine-last-frame-blocked-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let called = false;
  const service = new CinematicLastFrameService({ outputsDirectory: root,
    assetRepository: { findByIdForOwner: async () => ({ id: 'video_1', assetType: 'cinematic_video_output',
      metadata: { technicalProbe: { status: 'failed' } } }) },
    runProcess: async () => { called = true; } });
  await assert.rejects(service.prepare({ videoAssetId: 'video_1', attempt: { id: 'take_1' },
    projectId: 'project_1', sceneId: 'scene_1', shotId: 'shot_1', actorContext: alice }),
  { code: 'cinematic_previous_video_unavailable' });
  assert.equal(called, false);
});

test('an all-black terminal frame is rejected before it can become Storyboard authority', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cine-last-frame-black-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const videoKey = 'cinematic-video/usr_alice/black.mp4';
  await fs.mkdir(path.dirname(path.join(root, videoKey)), { recursive: true });
  await fs.writeFile(path.join(root, videoKey), Buffer.from('fixture-video'));
  let created = false;
  const service = new CinematicLastFrameService({ outputsDirectory: root, assetRepository: {
    findByIdForOwner: async () => ({ id: 'video_1', assetType: 'cinematic_video_output', storageKey: videoKey,
      metadata: { projectId: 'project_1', sceneId: 'scene_1', shotId: 'shot_1', attemptId: 'take_1',
        contentHash: crypto.createHash('sha256').update('fixture-video').digest('hex'),
        technicalProbe: { status: 'passed', durationSeconds: 1, fps: 10 } } }),
    findBySourceJobIdForOwner: async () => null,
    create: async () => { created = true; }
  }, runProcess: async (_binary, args) => sharp({ create: { width: 16, height: 9,
    channels: 3, background: '#000000' } }).png().toFile(args.at(-1)) });
  await assert.rejects(service.prepare({ videoAssetId: 'video_1', attempt: { id: 'take_1' },
    projectId: 'project_1', sceneId: 'scene_1', shotId: 'shot_1', actorContext: alice }),
  { code: 'cinematic_previous_frame_blank' });
  assert.equal(created, false);
});
