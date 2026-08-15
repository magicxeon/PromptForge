import assert from 'node:assert/strict';
import test from 'node:test';
import { PromptRefinementService } from '../server/domain/generation/PromptRefinementService.js';

const canonicalPrompt = 'One natural fashion photograph (Image aspect ratio 6:8)';

function policy(overrides = {}) {
  return {
    enabled: true,
    provider: 'openai',
    model: 'gpt-5.6-luna',
    reasoningEffort: 'low',
    timeoutMs: 1_000,
    maxOutputTokens: 800,
    logPrompts: false,
    apiKey: 'test-key',
    ...overrides
  };
}

test('prompt refinement is opt-in and does not dispatch while disabled by the user', async () => {
  let calls = 0;
  const service = new PromptRefinementService({
    policyLoader: () => policy(),
    providerFactory: () => ({ refinePrompt: async () => { calls += 1; } }),
    logger: { info: () => {} }
  });
  const result = await service.refine({ prompt: canonicalPrompt, requested: false });
  assert.equal(calls, 0);
  assert.equal(result.prompt, canonicalPrompt);
  assert.equal(result.metadata.status, 'not_requested');
});

test('prompt refinement accepts structured output that preserves the aspect ratio', async () => {
  const service = new PromptRefinementService({
    policyLoader: () => policy(),
    providerFactory: () => ({
      refinePrompt: async () => ({
        refinedPrompt: 'A coherent natural fashion photograph (Image aspect ratio 6:8)',
        changeSummary: ['Resolved repetition'],
        warnings: [],
        preservedAuthorities: ['identity'],
        responseId: 'resp_1',
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 }
      })
    }),
    logger: { info: () => {} },
    now: (() => { let value = 100; return () => value += 5; })()
  });
  const result = await service.refine({ prompt: canonicalPrompt, requested: true });
  assert.equal(result.metadata.applied, true);
  assert.equal(result.metadata.status, 'refined');
  assert.match(result.prompt, /coherent natural/);
});

test('prompt refinement falls back when provider output loses a mandatory directive', async () => {
  const service = new PromptRefinementService({
    policyLoader: () => policy(),
    providerFactory: () => ({
      refinePrompt: async () => ({
        refinedPrompt: 'A prompt without its locked ratio',
        changeSummary: [],
        warnings: [],
        preservedAuthorities: []
      })
    }),
    logger: { info: () => {} }
  });
  const result = await service.refine({ prompt: canonicalPrompt, requested: true });
  assert.equal(result.prompt, canonicalPrompt);
  assert.equal(result.metadata.status, 'fallback');
  assert.equal(result.metadata.errorCode, 'prompt_refinement_authority_lost');
});

test('prompt refinement exposes before and after audit data only under the raw log policy', async () => {
  const service = new PromptRefinementService({
    policyLoader: () => policy({ logPrompts: true }),
    providerFactory: () => ({
      refinePrompt: async () => ({
        refinedPrompt: 'A polished natural fashion photograph (Image aspect ratio 6:8)',
        changeSummary: ['Improved instruction order'],
        warnings: [],
        preservedAuthorities: ['aspect ratio']
      })
    }),
    logger: { info: () => {} }
  });
  const result = await service.refine({
    prompt: canonicalPrompt,
    requested: true,
    requestId: 'req_audit'
  });

  assert.equal(result.audit.beforePrompt, canonicalPrompt);
  assert.equal(
    result.audit.afterPrompt,
    'A polished natural fashion photograph (Image aspect ratio 6:8)'
  );
  assert.deepEqual(result.audit.changeSummary, ['Improved instruction order']);
});
