import assert from 'node:assert/strict';
import test from 'node:test';
import { GenerationApplicationService } from '../server/domain/generation/GenerationApplicationService.js';

for (const method of ['submitPreparedOperation', 'submitPreparedGroup']) {
  test(`Cinematic final prompt bound precedes Credit reservation in ${method}`, async () => {
    let reservations = 0;
    const application = new GenerationApplicationService({
      providerRegistry: { assertRuntimeAvailable() {} },
      queueManager: { createJobId: () => 'isolated_prompt_test' },
      generationGroupRepository: { findByRequest: async () => null },
      creditService: {
        validateAndReserveForRequest: async () => { reservations += 1; },
        reserveGenerationGroup: async () => { reservations += 1; }
      }
    });
    await assert.rejects(application[method]({
      providerId: 'fixture', modelId: 'fixture', context: { cinematicContainsPeople: false },
      compiledPrompt: 'x'.repeat(32001)
    }), { code: 'generation_prompt_too_long' });
    assert.equal(reservations, 0);
  });
}

test('Generation application compiles canonically and invokes refinement once per execution', async () => {
  const calls = [];
  const application = new GenerationApplicationService({
    providerRegistry: {},
    queueManager: {},
    templateCoreService: {},
    promptRefinementService: {
      refine: async input => {
        calls.push(input);
        return {
          prompt: `${input.prompt} refined`,
          metadata: { applied: true, status: 'refined' }
        };
      }
    }
  });
  const result = await application.compilePromptForExecution({
    mode: 'normal',
    generationMode: 'scene',
    generationSurface: 'studio',
    aspectRatio: '6:8',
    outputCount: 1,
    sceneBuilder: {
      authoringMode: 'manual',
      manualPromptText: 'Create one natural fashion photograph (Image aspect ratio 6:8)'
    },
    imageReferences: {},
    promptRefinement: { enabled: true }
  }, { requestId: 'req_1' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].requested, true);
  assert.equal(calls[0].requestId, 'req_1');
  assert.match(result.prompt, /refined$/);
});
