import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectGenerationPrompt, validateGenerationPrompt } from '../server/domain/generation/GenerationPromptBudget.js';

test('prompt budget distinguishes an internal recommendation from an unknown provider limit', () => {
  const prompt = 'x'.repeat(5000);
  const result = validateGenerationPrompt(prompt, { providerId: 'modelark', modelId: 'seedance', operation: 'video' });
  assert.equal(result.status, 'above_recommendation');
  assert.equal(result.hardLimit, null);
  assert.equal(result.scope, 'provider_limit_unknown');
  assert.equal(result.characters, 5000);
});

test('prompt budget counts Unicode code points and uses only sourced limits in the configured unit', () => {
  const configuration = { version: 1, countUnit: 'unicode_code_points', requestSafetyCharacters: 32000,
    recommendedCharacters: { video: 4000 }, providerLimits: {
      'test/model/video': { maximumCharacters: 5, unit: 'unicode_code_points', source: 'fixture://verified-contract' }
    } };
  const options = { providerId: 'test', modelId: 'model', operation: 'video' };
  assert.equal(inspectGenerationPrompt('\u{1f600}'.repeat(5), options, configuration).status, 'within_budget');
  assert.equal(inspectGenerationPrompt('\u{1f600}'.repeat(6), options, configuration).status, 'over_limit');
  configuration.providerLimits['test/model/video'].unit = 'tokens';
  assert.equal(inspectGenerationPrompt('123456', options, configuration).hardLimit, null);
});

test('prompt budget explicitly rejects the application request bound without truncating', () => {
  const text = 'z'.repeat(32001);
  assert.throws(() => validateGenerationPrompt(text, { operation: 'video' }), { code: 'generation_prompt_too_long' });
  assert.equal(text.length, 32001);
  assert.equal(validateGenerationPrompt(text.slice(1), { operation: 'video' }).characters, 32000);
});
