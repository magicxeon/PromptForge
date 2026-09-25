import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPromptRefinementPolicy,
  getPublicPromptRefinementPolicy
} from '../server/config/prompt-refinement-policy.js';
import { getAttributeLocalizationPolicy } from '../server/config/attribute-localization-policy.js';
import { getCinematicStoryEnhancementPolicy } from '../server/config/cinematic-story-enhancement-policy.js';
import { getCinematicStoryPlanPolicy } from '../server/config/cinematic-story-plan-policy.js';
import { getCinematicWardrobeSuggestionPolicy } from '../server/config/cinematic-wardrobe-suggestion-policy.js';
import { openAITextModels } from '../server/config/openaiTextModels.js';

test('OpenAI text defaults agree on Sol while Luna stays unselected', () => {
  assert.equal(openAITextModels.active, 'gpt-6-sol');
  assert.equal(openAITextModels.standby, 'gpt-6-luna');
  assert.equal(getPromptRefinementPolicy({}).model, openAITextModels.active);
  assert.equal(getAttributeLocalizationPolicy({}).model, openAITextModels.active);
  assert.equal(getCinematicStoryEnhancementPolicy({}).model, openAITextModels.active);
  assert.equal(getCinematicStoryPlanPolicy({}).model, openAITextModels.active);
  assert.equal(getCinematicWardrobeSuggestionPolicy({}).model, openAITextModels.active);
  assert.equal(getPromptRefinementPolicy({ PROMPT_REFINEMENT_MODEL: openAITextModels.standby }).model, openAITextModels.standby);
});

test('prompt refinement requires both rollout enablement and a configured API key', () => {
  assert.equal(getPromptRefinementPolicy({
    ENABLE_AI_PROMPT_REFINE: 'true',
    OPENAI_API_KEY: 'your_openai_api_key_here'
  }).enabled, false);
  assert.equal(getPromptRefinementPolicy({
    ENABLE_AI_PROMPT_REFINE: 'true',
    OPENAI_API_KEY: 'test-key'
  }).enabled, true);
  assert.deepEqual(getPublicPromptRefinementPolicy({
    ENABLE_AI_PROMPT_REFINE: 'true',
    OPENAI_API_KEY: 'test-key'
  }), {
    enabled: true,
    provider: 'openai',
    model: 'gpt-6-sol'
  });
});

test('raw prompt logging is always disabled in production', () => {
  assert.equal(getPromptRefinementPolicy({
    ENABLE_AI_PROMPT_REFINE: 'true',
    OPENAI_API_KEY: 'test-key',
    LOG_AI_PROMPT_REFINE: 'true',
    NODE_ENV: 'production'
  }).logPrompts, false);
});

test('prompt refinement bounds private audit retention', () => {
  assert.equal(getPromptRefinementPolicy({
    PROMPT_REFINEMENT_AUDIT_MAX_FILES: '2'
  }).auditMaxFiles, 10);
  assert.equal(getPromptRefinementPolicy({
    PROMPT_REFINEMENT_AUDIT_MAX_FILES: '750'
  }).auditMaxFiles, 750);
});
