import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ModelArkAssetLibraryClient,
  signModelArkAssetLibraryRequest
} from '../server/providers/ModelArkAssetLibraryClient.js';

const environment = {
  MODEL_ARK_ASSET_LIBRARY_ENABLED: 'true',
  MODEL_ARK_ASSET_ACCESS_KEY: 'test-access-key',
  MODEL_ARK_ASSET_SECRET_KEY: 'test-secret-key',
  MODEL_ARK_ASSET_LIBRARY_BASE_URL: 'https://ark.ap-southeast-1.byteplusapi.com',
  MODEL_ARK_ASSET_PROJECT_NAME: 'default',
  MODEL_ARK_ASSET_GROUP_NAME: 'momelo-cinematic-aigc'
};

test('ModelArk Asset signing is deterministic and does not place credentials in the body', () => {
  const signed = signModelArkAssetLibraryRequest({
    action: 'GetAsset', body: { Id: 'Asset-20260905-approved01', ProjectName: 'default' },
    accessKey: 'test-access-key', secretKey: 'test-secret-key',
    now: new Date('2026-09-05T00:00:00.000Z')
  });
  assert.equal(signed.url, 'https://ark.ap-southeast-1.byteplusapi.com/?Action=GetAsset&Version=2024-01-01');
  assert.equal(signed.headers['X-Date'], '20260905T000000Z');
  assert.match(signed.headers.Authorization, /^HMAC-SHA256 Credential=test-access-key\/20260905\/ap-southeast-1\/ark\/request/);
  assert.doesNotMatch(signed.body, /test-access-key|test-secret-key/);
});

test('ModelArk Asset client reuses an exact AIGC group and keeps default moderation', async () => {
  const requests = [];
  const responses = [
    { Result: { Items: [{ Id: 'group-20260905-aigc01', Name: 'momelo-cinematic-aigc', GroupType: 'AIGC' }] } },
    { Result: { Id: 'Asset-20260905-approved01' }, ResponseMetadata: { RequestId: 'req-create-asset' } },
    { Result: { Id: 'Asset-20260905-approved01', GroupId: 'group-20260905-aigc01', Status: 'Active' } }
  ];
  const client = new ModelArkAssetLibraryClient({
    environment,
    clock: () => new Date('2026-09-05T00:00:00.000Z'),
    fetchImpl: async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body), headers: init.headers });
      return jsonResponse(responses.shift());
    }
  });

  const groupId = await client.resolveAigcGroup();
  const asset = await client.createImageAsset({
    groupId, sourceUrl: 'https://storage.example/signed-frame', name: 'approved-frame'
  });
  const active = await client.getAsset(asset.id);

  assert.equal(groupId, 'group-20260905-aigc01');
  assert.equal(requests[0].body.PageNumber, 1);
  assert.equal(requests[0].body.PageSize, 100);
  assert.deepEqual(requests[1].body.Moderation, { Strategy: 'Default' });
  assert.equal(requests[2].body.Id, 'Asset-20260905-approved01');
  assert.equal(active.status, 'active');
});

test('ambiguous CreateAsset server failure reports unknown delivery state', async () => {
  const client = new ModelArkAssetLibraryClient({
    environment: { ...environment, MODEL_ARK_ASSET_GROUP_ID: 'group-20260905-aigc01' },
    fetchImpl: async () => jsonResponse({ message: 'upstream unavailable' }, 503)
  });

  await assert.rejects(client.createImageAsset({
    groupId: 'group-20260905-aigc01',
    sourceUrl: 'https://storage.example/signed-frame',
    name: 'approved-frame'
  }), error => error.code === 'video_provider_asset_library_request_failed'
    && error.deliveryState === 'unknown'
    && error.retryable === true);
});

function jsonResponse(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, async json() { return structuredClone(payload); } };
}
