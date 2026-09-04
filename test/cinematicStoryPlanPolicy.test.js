import assert from 'node:assert/strict';
import test from 'node:test';
import { getCinematicStoryPlanPolicy } from '../server/config/cinematic-story-plan-policy.js';

const enabled = {
  ENABLE_CINEMATIC_STORY_PLAN: 'true',
  OPENAI_API_KEY: 'test-key'
};

test('Cinematic Story Plan policy provides separate bounded stage timeout defaults', () => {
  const policy = getCinematicStoryPlanPolicy(enabled);

  assert.equal(policy.generationTimeoutMs, 120_000);
  assert.equal(policy.repairTimeoutMs, 90_000);
  assert.equal(policy.timeoutMs, policy.generationTimeoutMs);
});

test('Cinematic Story Plan policy supports independent timeout overrides and bounds them', () => {
  const policy = getCinematicStoryPlanPolicy({
    ...enabled,
    CINEMATIC_STORY_PLAN_GENERATION_TIMEOUT_MS: '999999',
    CINEMATIC_STORY_PLAN_REPAIR_TIMEOUT_MS: '1'
  });

  assert.equal(policy.generationTimeoutMs, 240_000);
  assert.equal(policy.repairTimeoutMs, 10_000);
});

test('Cinematic Story Plan policy retains the legacy timeout as a generation fallback only', () => {
  const policy = getCinematicStoryPlanPolicy({
    ...enabled,
    CINEMATIC_STORY_PLAN_TIMEOUT_MS: '75000'
  });

  assert.equal(policy.generationTimeoutMs, 75_000);
  assert.equal(policy.timeoutMs, 75_000);
  assert.equal(policy.repairTimeoutMs, 90_000);
});
