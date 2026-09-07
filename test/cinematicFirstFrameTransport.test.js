import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadVideoReferenceAssetContent } from '../server/domain/assets/VideoReferenceAssetContent.js';
import { CinematicFirstFrameTransportService } from '../server/domain/assets/CinematicFirstFrameTransportService.js';

const bytes = Buffer.from('original-approved-keyframe');
const contentHash = crypto.createHash('sha256').update(bytes).digest('hex');
const sourceAsset = { id: 'asset_1', ownerUserId: 'usr_1', mimeType: 'image/png' };
const input = { sourceAsset, ownerUserId: 'usr_1', expectedContentHash: contentHash };
const sourceLoader = async () => ({ bytes, contentHash });

test('uploaded image uses verified original bytes for both URL and Base64 transports', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-video-upload-'));
  const original = await fs.readFile(new URL('../client/assets/scene-builder/shot-recipes/cafe-seated-lifestyle.jpg', import.meta.url));
  const hash = crypto.createHash('sha256').update(original).digest('hex');
  try {
    await fs.writeFile(path.join(directory, 'upload.jpg'), original);
    for (const fallback of [false, true]) {
      let published;
      const service = new CinematicFirstFrameTransportService({ environment: {},
        sourceLoader: async () => { throw new Error('Storyboard loader must not process uploads'); },
        referenceSourceLoader: asset => loadVideoReferenceAssetContent(asset, { outputsDirectory: directory }),
        storage: { async publish(value) { published = value; if (fallback) throw new Error('Unavailable');
          return { sourceUrl: 'https://example.invalid/verified-original' }; } } });
      const result = await service.resolve({ sourceAsset: { ...sourceAsset, assetType: 'generation_reference',
        storageKey: 'upload.jpg', metadata: { contentHash: hash } }, ownerUserId: 'usr_1', expectedContentHash: hash });
      assert.deepEqual(published.bytes, original);
      assert.equal(published.mimeType, 'image/jpeg');
      if (fallback) assert.deepEqual(Buffer.from(result.value.split(',')[1], 'base64'), original);
      else assert.equal(result.value, 'https://example.invalid/verified-original');
    }
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('first-frame transport prefers a reusable private GCS URL with a fresh task-length TTL', async () => {
  let published;
  const service = new CinematicFirstFrameTransportService({
    environment: {}, sourceLoader,
    storage: { async publish(value) { published = value; return { sourceUrl: 'https://storage.example/private-signed-frame' }; } }
  });
  const result = await service.resolve(input);
  assert.equal(result.value, 'https://storage.example/private-signed-frame');
  assert.equal(result.transport.mode, 'gcs_url');
  assert.deepEqual(published.bytes, bytes);
  assert.equal(published.contentHash, contentHash);
  assert.equal(published.ownerUserId, 'usr_1');
  assert.equal(published.reuseExisting, true);
  assert.equal(published.urlTtlSeconds, 259200);
});

test('first-frame transport falls back locally to identical Base64 bytes when GCS fails', async () => {
  let uploads = 0;
  const service = new CinematicFirstFrameTransportService({
    environment: {}, sourceLoader,
    storage: { async publish() { uploads += 1; throw new Error('Secret signed URL must not escape.'); } }
  });
  const result = await service.resolve(input);
  assert.equal(uploads, 1);
  assert.deepEqual(Buffer.from(result.value.split(',')[1], 'base64'), bytes);
  assert.deepEqual(result.transport, { mode: 'base64', fallbackCode: 'video_reference_gcs_unavailable' });
});

test('foreign or changed source never uploads and cannot fall back', async () => {
  let uploads = 0;
  const service = new CinematicFirstFrameTransportService({
    environment: {}, sourceLoader,
    storage: { async publish() { uploads += 1; } }
  });
  await assert.rejects(service.resolve({ ...input, ownerUserId: 'usr_other' }), { code: 'cinematic_video_reference_unavailable' });
  await assert.rejects(service.resolve({ ...input, expectedContentHash: 'changed' }), { code: 'cinematic_video_reference_content_changed' });
  assert.equal(uploads, 0);
});
