import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { PassThrough } from 'node:stream';
import { once } from 'node:events';
import JSZip from 'jszip';
import { VideoClipBundleService } from '../server/domain/assets/VideoClipBundleService.js';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';

test('clip ZIP cancellation closes without completing or retaining an archive', async () => {
  const service = new VideoClipBundleService();
  const stream = new PassThrough();
  let finished = false;
  stream.once('finish', () => { finished = true; });
  const closed = once(stream, 'close');
  stream.once('data', () => stream.destroy());
  service.stream({ files: [] }, { clips: [] }, stream);
  await closed;
  assert.equal(stream.destroyed, true);
  assert.equal(finished, false);
});

test('clip ZIP aborts if a prepared clip disappears instead of delivering a partial archive', async () => {
  const service = new VideoClipBundleService();
  const stream = new PassThrough();
  const failure = new Promise(resolve => stream.once('error', resolve));
  stream.resume();
  service.stream({ files: [{ filePath: path.join(os.tmpdir(), `missing-${crypto.randomUUID()}.mp4`), name: 'clip.mp4' }] }, { clips: [] }, stream);
  const error = await failure;
  assert.equal(error.message, 'A selected clip became unavailable.');
  assert.equal(stream.destroyed, true);
});

test('clip ZIP checks ownership, bounds and immutable bytes; streams safe names and manifest', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-clip-bundle-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const bytes = Buffer.from('synthetic-local-video');
  await fs.writeFile(path.join(root, 'clip.mp4'), bytes);
  const asset = { id: 'asset', status: 'active', assetType: 'cinematic_video_output', storageKey: 'clip.mp4',
    mimeType: 'video/mp4', sizeBytes: bytes.length, metadata: { contentHash: crypto.createHash('sha256').update(bytes).digest('hex'), technicalProbe: { status: 'passed' } } };
  const service = new VideoClipBundleService({ outputsDirectory: root, assetRepository: { findByIdForOwner: async (id, owner) => id === asset.id && owner === 'alice' ? asset : null } });
  const items = [{ assetId: 'asset', sceneNumber: 1, shotNumber: 2, takeNumber: 3, shotId: 'shot', attemptId: 'take' }];
  const plan = await service.prepare(items, { userId: 'alice' });
  assert.equal(plan.files[0].name, 'Scene-01_Shot-02_Take-03.mp4');
  const stream = new PassThrough();
  service.stream(plan, { clips: [{ name: plan.files[0].name }] }, stream);
  const chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const zip = await JSZip.loadAsync(Buffer.concat(chunks));
  assert.deepEqual(await zip.file(plan.files[0].name).async('nodebuffer'), bytes);
  assert.doesNotMatch(await zip.file('manifest.json').async('string'), /storageKey|filePath|http|prompt/);
  await assert.rejects(service.prepare(items, { userId: 'bob' }), { code: 'cinematic_clip_bundle_unavailable' });
  service.maxBytes = 1;
  await assert.rejects(service.prepare(items, { userId: 'alice' }), { code: 'cinematic_clip_bundle_too_large' });
  service.maxBytes = 128 * 1024 * 1024;
  asset.storageKey = '../outside.mp4';
  await assert.rejects(service.prepare(items, { userId: 'alice' }), { code: 'cinematic_clip_bundle_unavailable' });
  asset.storageKey = 'clip.mp4'; asset.status = 'hidden';
  await assert.rejects(service.prepare(items, { userId: 'alice' }), { code: 'cinematic_clip_bundle_unavailable' });
  asset.status = 'active'; asset.metadata.contentHash = 'changed';
  await assert.rejects(service.prepare(items, { userId: 'alice' }), { code: 'cinematic_clip_bundle_unavailable' });
});

test('bundle chooses pinned Take, reports gaps, checks project version and requires explicit partial consent', async () => {
  let selected;
  const service = new CinematicApplicationService({ clipBundleService: {
    prepare: async items => { selected = items; return { sizeBytes: 5, files: items.map(item => ({ ...item, filePath: 'private', name: 'clip.mp4' })) }; },
    stream: () => { throw new Error('Must not stream without consent'); }
  } });
  service.getProject = async (_id, actor) => {
    assert.equal(actor.userId, 'alice');
    return { id: 'project', version: 3, scenes: [{ id: 'scene', shots: [{ id: 'a', approvedVideoAttemptId: 'take1' }, { id: 'b' }], shotOrder: ['a', 'b'] }],
      generationAttempts: [{ id: 'take1', shotId: 'a', operation: 'cinematic_draft_clip', status: 'approved', outputAsset: { id: 'asset1' } },
        { id: 'take2', shotId: 'a', operation: 'cinematic_draft_clip', status: 'completed', outputAsset: { id: 'asset2' } }] };
  };
  const actor = { userId: 'alice' };
  const { manifest } = await service.prepareClipBundle('project', {}, actor);
  assert.equal(selected[0].assetId, 'asset1'); assert.equal(manifest.missing.length, 1);
  assert.equal(JSON.stringify(manifest).includes('private'), false);
  await assert.rejects(service.downloadClipBundle('project', { expectedVersion: 2 }, actor, {}), { code: 'cinematic_version_conflict' });
  await assert.rejects(service.downloadClipBundle('project', { expectedVersion: 3 }, actor, {}), { code: 'cinematic_clip_bundle_incomplete' });
  let streamed = false;
  service.clipBundleService.stream = () => { streamed = true; };
  await service.downloadClipBundle('project', { expectedVersion: 3, allowPartial: true }, actor, {});
  assert.equal(streamed, true);
});
