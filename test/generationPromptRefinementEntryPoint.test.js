import assert from 'node:assert/strict';
import test from 'node:test';
import { GenerationApplicationService } from '../server/domain/generation/GenerationApplicationService.js';

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
