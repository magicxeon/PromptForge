import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { GoogleCloudProviderAssetStorage } from '../server/repositories/assets/GoogleCloudProviderAssetStorage.js';

test('private GCS handoff preserves exact bytes and returns only a short-lived signed URL', async () => {
  const calls = [];
  const file = {
    async save(bytes, options) { calls.push(['save', Buffer.from(bytes), options]); },
    async getSignedUrl(options) {
      calls.push(['sign', options]);
      return ['https://storage.example/signed-approved-frame'];
    },
    async delete(options) { calls.push(['delete', options]); }
  };
  const storage = {
    bucket(name) {
      assert.equal(name, 'private-cinematic-assets');
      return { file: objectKey => { calls.push(['file', objectKey]); return file; } };
    }
  };
  const service = new GoogleCloudProviderAssetStorage({
    environment: {
      CINEMATIC_PROVIDER_ASSET_GCS_BUCKET: 'private-cinematic-assets',
      CINEMATIC_PROVIDER_ASSET_GCS_PREFIX: 'modelark-aigc-handoff',
      CINEMATIC_PROVIDER_ASSET_SIGNED_URL_TTL_SECONDS: '600'
    },
    storage,
    clock: () => new Date('2026-09-05T00:00:00.000Z')
  });
  const bytes = Buffer.from('exact-approved-storyboard-bytes');
  const result = await service.publish({
    ownerUserId: 'usr_alice', sourceAssetId: 'ast_storyboard_1',
    contentHash: 'a'.repeat(64), bytes, mimeType: 'image/png'
  });

  assert.deepEqual(calls.find(call => call[0] === 'save')[1], bytes);
  assert.equal(calls.find(call => call[0] === 'save')[2].metadata.cacheControl, 'private, max-age=0, no-store');
  assert.equal(calls.find(call => call[0] === 'sign')[1].action, 'read');
  assert.equal(result.sourceUrl, 'https://storage.example/signed-approved-frame');
  assert.equal(result.expiresAt, '2026-09-05T00:10:00.000Z');
  assert.match(result.objectKey, /^modelark-aigc-handoff\//);

  assert.equal(await service.cleanup(result.objectKey), true);
  assert.deepEqual(calls.at(-1), ['delete', { ignoreNotFound: true }]);
});

test('reusable GCS first frames upload once, renew URLs and isolate owner/content keys', async () => {
  const objects = new Map();
  const saves = [];
  let now = new Date('2026-09-05T00:00:00.000Z');
  const storage = { bucket: () => ({ file: key => ({
    async getMetadata() {
      if (!objects.has(key)) throw Object.assign(new Error('Missing'), { code: 404 });
      return [objects.get(key)];
    },
    async save(bytes, options) {
      assert.equal(options.preconditionOpts.ifGenerationMatch, 0);
      saves.push(key);
      objects.set(key, { size: bytes.length, contentType: 'image/png',
        md5Hash: crypto.createHash('md5').update(bytes).digest('base64'),
        metadata: options.metadata.metadata });
    },
    async getSignedUrl() { return ['https://storage.example/signed']; }
  }) }) };
  const service = new GoogleCloudProviderAssetStorage({
    environment: { CINEMATIC_PROVIDER_ASSET_GCS_BUCKET: 'private' }, storage, clock: () => now
  });
  const bytes = Buffer.from('original');
  const input = { ownerUserId: 'usr_a', sourceAssetId: 'asset_a', bytes,
    contentHash: crypto.createHash('sha256').update(bytes).digest('hex'), mimeType: 'image/png',
    reuseExisting: true, urlTtlSeconds: 259200 };
  const first = await service.publish(input);
  now = new Date('2026-09-06T00:00:00.000Z');
  const reused = await service.publish(input);
  assert.equal(saves.length, 1);
  assert.equal(first.objectKey, reused.objectKey);
  assert.match(first.objectKey, /\/video-first-frames\//);
  assert.equal(reused.expiresAt, '2026-09-09T00:00:00.000Z');
  const other = await service.publish({ ...input, ownerUserId: 'usr_b' });
  assert.notEqual(other.objectKey, first.objectKey);
  const changed = await service.publish({ ...input, bytes: Buffer.from('new'), contentHash: 'b'.repeat(64) });
  assert.notEqual(changed.objectKey, first.objectKey);
  objects.get(first.objectKey).md5Hash = 'tampered';
  await assert.rejects(service.publish(input), { code: 'video_provider_asset_storage_failed' });
  assert.equal(saves.length, 3);
});
