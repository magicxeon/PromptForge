import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPromptRefinementPolicy,
  getPublicPromptRefinementPolicy
} from '../server/config/prompt-refinement-policy.js';

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
    model: 'gpt-5.6-luna'
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
