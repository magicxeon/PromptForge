import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunityLaunchReadinessService } from '../server/domain/community/CommunityLaunchReadinessService.js';

function flags(overrides = {}) {
  return {
    schemaVersion: 1,
    community: {
      enabled: true,
      shareEnabled: true,
      exploreEnabled: true,
      engagementEnabled: true,
      creatorProfilesEnabled: true,
      galleryEnabled: true,
      moderationEnabled: true,
      privateBeta: false,
      ...overrides
    },
    routing: { automaticSimpleModeEnabled: false }
  };
}

test('Community-08 readiness opens internal E2E while retaining production blockers', async () => {
  const service = new CommunityLaunchReadinessService({
    featurePolicyService: {
      getPublicFlags: async () => flags()
    }
  });
  const result = await service.getReadiness();
  assert.equal(result.readyForInternal, true);
  assert.equal(result.readyForPrivateBeta, false);
  assert.equal(result.readyForProduction, false);
  assert.deepEqual(result.missingInternalFeatures, []);
  assert.ok(result.productionBlockers.includes('production_authentication'));
  assert.ok(result.productionBlockers.includes('durable_database'));
  assert.equal(JSON.stringify(result).includes('prompt'), false);
  assert.equal(JSON.stringify(result).includes('imageUrl'), false);
});

test('Community-08 readiness reports disabled dependencies without opening exposure', async () => {
  const service = new CommunityLaunchReadinessService({
    featurePolicyService: {
      getPublicFlags: async () => flags({
        exploreEnabled: false,
        engagementEnabled: false,
        galleryEnabled: false
      })
    }
  });
  const result = await service.getReadiness();
  assert.equal(result.readyForInternal, false);
  assert.deepEqual(result.missingInternalFeatures, [
    'exploreEnabled',
    'engagementEnabled',
    'galleryEnabled'
  ]);
});
