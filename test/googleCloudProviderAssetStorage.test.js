import assert from 'node:assert/strict';
import test from 'node:test';
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
