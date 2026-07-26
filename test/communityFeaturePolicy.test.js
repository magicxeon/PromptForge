import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CommunityFeaturePolicyService,
  validateCommunityFeatureFlags
} from '../server/domain/community/CommunityFeaturePolicyService.js';

function flags(overrides = {}) {
  return {
    schemaVersion: 1,
    community: {
      enabled: true,
      shareEnabled: true,
      exploreEnabled: false,
      engagementEnabled: false,
      creatorProfilesEnabled: false,
      galleryEnabled: false,
      moderationEnabled: true,
      privateBeta: false,
      ...(overrides.community || {})
    },
    development: {
      mockActorSwitcherEnabled: true,
      ...(overrides.development || {})
    },
    routing: {
      automaticSimpleModeEnabled: false,
      ...(overrides.routing || {})
    }
  };
}

test('community feature policy validates dependencies and rejects disabled access', async () => {
  assert.equal(validateCommunityFeatureFlags(flags()), true);
  assert.throws(
    () => validateCommunityFeatureFlags(flags({
      community: { exploreEnabled: true, shareEnabled: false }
    })),
    /Explore requires Community sharing and moderation/
  );
  assert.throws(
    () => validateCommunityFeatureFlags(flags({
      community: { exploreEnabled: true, moderationEnabled: false }
    })),
    /Explore requires Community sharing and moderation/
  );
  assert.throws(
    () => validateCommunityFeatureFlags(flags({
      community: { engagementEnabled: true, exploreEnabled: false }
    })),
    /engagement requires Explore and moderation/
  );
  assert.throws(
    () => validateCommunityFeatureFlags(flags({
      routing: { automaticSimpleModeEnabled: true }
    })),
    /Automatic Simple provider routing must remain disabled/
  );

  const policy = new CommunityFeaturePolicyService({
    configLoader: async () => flags()
  });
  assert.equal(await policy.isEnabled('community.shareEnabled'), true);
  assert.equal(await policy.isEnabled('community.exploreEnabled'), false);
  await assert.rejects(
    () => policy.assertEnabled('community.exploreEnabled'),
    error => error.code === 'community_feature_disabled' && error.statusCode === 404
  );
});

test('production masks internal Community features until private beta', { concurrency: false }, async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const policy = new CommunityFeaturePolicyService({
      configLoader: async () => flags({
        community: {
          exploreEnabled: true,
          engagementEnabled: true,
          creatorProfilesEnabled: true,
          moderationEnabled: true,
          privateBeta: false
        }
      })
    });
    const effective = await policy.getEffectiveFlags();
    assert.equal(effective.community.exploreEnabled, false);
    assert.equal(effective.community.engagementEnabled, false);
    assert.equal(effective.community.creatorProfilesEnabled, false);
    assert.equal(effective.community.moderationEnabled, false);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
