import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GEMINI_PRO_FASHION_PROMPT_STRATEGY_VERSION,
  resolveFashionExecutionPrompt
} from '../server/domain/fashion-blueprint/GeminiProFashionPrompt.js';

function createContext() {
  return {
    referenceRoleManifest: [
      { index: 1, roles: ['template_baseline'] },
      { index: 2, roles: ['character_reference'] },
      { index: 3, roles: ['outfit_front'] }
    ]
  };
}

test('Gemini Pro Fashion uses the concise authority prompt proven by the manual request', () => {
  const result = resolveFashionExecutionPrompt({
    plan: {
      route: { providerId: 'gemini', modelId: 'gemini-3-pro-image' },
      templatePoseProxy: { id: 'proxy_1' },
      aspectRatio: '6:8'
    },
    context: createContext(),
    fallbackPrompt: 'verbose fallback prompt with Personality and product notes'
  });

  assert.equal(
    result.promptStrategyVersion,
    GEMINI_PRO_FASHION_PROMPT_STRATEGY_VERSION
  );
  assert.match(result.prompt, /IMAGE_1 is the exclusive authority for the final person/);
  assert.match(result.prompt, /IMAGE_2 is the exclusive authority for the clothing/);
  assert.match(result.prompt, /IMAGE_0 is an identity-neutral structural pose proxy/);
  assert.match(result.prompt, /Do not add jewelry, bags, logos, accessories/);
  assert.doesNotMatch(result.prompt, /Personality|verbose fallback|Product integrity/i);
});

test('Gemini Pro Fashion retains the canonical prompt for other models', () => {
  const result = resolveFashionExecutionPrompt({
    plan: {
      route: { providerId: 'gemini', modelId: 'gemini-3.1-flash-image' },
      templatePoseProxy: { id: 'proxy_1' }
    },
    context: createContext(),
    fallbackPrompt: 'canonical prompt'
  });

  assert.equal(result.prompt, 'canonical prompt');
  assert.equal(result.promptStrategyVersion, null);
});

test('Gemini Pro Fashion falls back when the authority manifest is incomplete', () => {
  const result = resolveFashionExecutionPrompt({
    plan: {
      route: {
        providerId: 'gemini',
        modelId: 'gemini-3-pro-image',
        promptStrategyVersion: 'legacy-strategy'
      },
      templatePoseProxy: { id: 'proxy_1' }
    },
    context: { referenceRoleManifest: [] },
    fallbackPrompt: 'canonical prompt'
  });

  assert.equal(result.prompt, 'canonical prompt');
  assert.equal(result.promptStrategyVersion, 'legacy-strategy');
});
