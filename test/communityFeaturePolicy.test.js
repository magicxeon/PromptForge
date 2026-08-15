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
      characterProfilesEnabled: false,
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
          galleryEnabled: true,
          characterProfilesEnabled: true,
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

test('public runtime policy exposes the explicit debug prompt override', { concurrency: false }, async () => {
  const previous = process.env.OVERRIDE_DEBUG_PROMPT;
  const policy = new CommunityFeaturePolicyService({
    configLoader: async () => flags()
  });
  try {
    process.env.OVERRIDE_DEBUG_PROMPT = 'true';
    assert.equal(
      (await policy.getPublicFlags()).development.debugPromptOverrideEnabled,
      true
    );

    process.env.OVERRIDE_DEBUG_PROMPT = 'false';
    assert.equal(
      (await policy.getPublicFlags()).development.debugPromptOverrideEnabled,
      false
    );
  } finally {
    if (previous === undefined) delete process.env.OVERRIDE_DEBUG_PROMPT;
    else process.env.OVERRIDE_DEBUG_PROMPT = previous;
  }
});

test('public runtime policy exposes prompt refinement only with rollout and credentials', { concurrency: false }, async () => {
  const previousEnabled = process.env.ENABLE_AI_PROMPT_REFINE;
  const previousKey = process.env.OPENAI_API_KEY;
  const policy = new CommunityFeaturePolicyService({
    configLoader: async () => flags()
  });
  try {
    process.env.ENABLE_AI_PROMPT_REFINE = 'true';
    process.env.OPENAI_API_KEY = 'test-key';
    assert.equal((await policy.getPublicFlags()).generation.promptRefinementEnabled, true);

    process.env.OPENAI_API_KEY = 'your_openai_api_key_here';
    assert.equal((await policy.getPublicFlags()).generation.promptRefinementEnabled, false);
  } finally {
    if (previousEnabled === undefined) delete process.env.ENABLE_AI_PROMPT_REFINE;
    else process.env.ENABLE_AI_PROMPT_REFINE = previousEnabled;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});
