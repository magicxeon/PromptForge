import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CinematicTextProviderRouter,
  isEligibleFallbackFailure
} from '../server/domain/generation/CinematicTextProviderRouter.js';
import { ProviderAvailabilityPolicyService } from '../server/domain/admin-configuration/ProviderAvailabilityPolicyService.js';

function policy(overrides = {}) {
  return {
    provider: 'openai', model: 'gpt-5.6-terra', reasoningEffort: 'low', apiKey: 'openai-key',
    fallback: {
      enabled: true, provider: 'gemini', model: 'gemini-3.8-flash',
      reasoningEffort: 'low', apiKey: 'gemini-key'
    },
    ...overrides
  };
}

test('Cinematic text router keeps Terra when the primary request succeeds', async () => {
  let fallbackCalls = 0;
  const router = new CinematicTextProviderRouter(policy(), {
    primaryProviderFactory: () => ({ generateCinematicStoryPlan: async () => ({ objective: 'Ready' }) }),
    fallbackProviderFactory: () => ({
      generateCinematicStoryPlan: async () => { fallbackCalls += 1; return { objective: 'Fallback' }; }
    })
  });

  const result = await router.generateCinematicStoryPlan({ model: 'gpt-5.6-terra' });
  assert.equal(result.executionProvider, 'openai');
  assert.equal(result.executionModel, 'gpt-5.6-terra');
  assert.equal(result.fallbackUsed, false);
  assert.equal(fallbackCalls, 0);
});

test('Cinematic text router falls back on quota and remains sticky for the operation', async () => {
  let primaryCalls = 0;
  let fallbackCalls = 0;
  const router = new CinematicTextProviderRouter(policy(), {
    primaryProviderFactory: () => ({
      generateCinematicStoryPlan: async () => {
        primaryCalls += 1;
        const error = new Error('Quota exhausted.');
        error.code = 'cinematic_story_plan_provider_error';
        error.status = 429;
        throw error;
      }
    }),
    fallbackProviderFactory: () => ({
      generateCinematicStoryPlan: async args => {
        fallbackCalls += 1;
        assert.equal(args.model, 'gemini-3.8-flash');
        return { objective: `Fallback ${fallbackCalls}` };
      }
    })
  });

  const first = await router.generateCinematicStoryPlan({ model: 'gpt-5.6-terra' });
  const repair = await router.generateCinematicStoryPlan({ model: 'gpt-5.6-terra' });
  assert.equal(primaryCalls, 1);
  assert.equal(fallbackCalls, 2);
  assert.equal(first.fallbackReason, 'primary_rate_or_quota_exhausted');
  assert.equal(repair.executionProvider, 'gemini');
  assert.equal(repair.fallbackUsed, true);
});

test('Cinematic text router does not mask invalid request or auth failures', async () => {
  let fallbackCalls = 0;
  const router = new CinematicTextProviderRouter(policy(), {
    primaryProviderFactory: () => ({
      generateCinematicSceneDirection: async () => {
        const error = new Error('Invalid request.');
        error.code = 'cinematic_scene_direction_provider_error';
        error.status = 400;
        throw error;
      }
    }),
    fallbackProviderFactory: () => ({
      generateCinematicSceneDirection: async () => { fallbackCalls += 1; return {}; }
    })
  });

  await assert.rejects(
    router.generateCinematicSceneDirection({ model: 'gpt-5.6-terra' }),
    error => error.status === 400
  );
  assert.equal(fallbackCalls, 0);
  assert.equal(isEligibleFallbackFailure({ status: 401, code: 'provider_error' }), false);
  assert.equal(isEligibleFallbackFailure({ code: 'cinematic_story_plan_invalid_response' }), false);
  assert.equal(isEligibleFallbackFailure({ code: 'cinematic_story_plan_timeout' }), true);
});

test('Cinematic text router recognizes an explicit exhausted-quota provider code', () => {
  assert.equal(isEligibleFallbackFailure({
    status: 400,
    code: 'cinematic_story_plan_provider_error',
    providerCode: 'insufficient_quota'
  }), true);
});

test('Cinematic text router skips a runtime-disabled primary and uses only an enabled fallback', async () => {
  let primaryCalls = 0;
  let fallbackCalls = 0;
  const availabilityPolicy = new ProviderAvailabilityPolicyService({
    initialState: {
      schemaVersion: 1, version: 1, updatedAt: null, models: {}, workflows: {}, history: [],
      providers: { openai: { enabled: false, reason: 'Primary maintenance' } }
    }
  });
  const router = new CinematicTextProviderRouter(policy(), {
    availabilityPolicy,
    primaryProviderFactory: () => ({
      generateCinematicStoryPlan: async () => { primaryCalls += 1; return {}; }
    }),
    fallbackProviderFactory: () => ({
      generateCinematicStoryPlan: async () => { fallbackCalls += 1; return { objective: 'Fallback' }; }
    })
  });

  const result = await router.generateCinematicStoryPlan({ model: 'gpt-5.6-terra' });
  assert.equal(primaryCalls, 0);
  assert.equal(fallbackCalls, 1);
  assert.equal(result.executionProvider, 'gemini');
  assert.equal(result.fallbackReason, 'primary_disabled_by_admin');
});
