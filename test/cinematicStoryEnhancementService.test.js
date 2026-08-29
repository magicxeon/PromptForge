import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicStoryEnhancementService } from '../server/domain/generation/CinematicStoryEnhancementService.js';

test('Cinematic story enhancement is qualification-gated and never invents Credits', async () => {
  const service = new CinematicStoryEnhancementService({
    policyLoader: () => ({ enabled: true, requestedEnabled: true, provider: 'openai', model: 'test-model', reasoningEffort: 'low', maxOutputTokens: 1000, timeoutMs: 1000, apiKey: 'test' }),
    providerFactory: () => ({
      enhanceCinematicStory: async () => ({
        enhancedStoryBrief: 'A concise enhanced story.', creativeDirection: 'Natural visual tension.',
        premise: 'A meeting', conflict: 'Time', emotionalArc: 'Fear to hope', ending: 'Resolution',
        candidateScenes: ['Station'],
        recommendedRoles: [{
          label: 'Lead', importance: 'required', storyFunction: 'Chooses', relationshipHint: '',
          objective: 'Leave the station', emotionalArc: 'Anxious to resolved',
          personalityTraits: ['restrained', 'decisive'], performanceDirection: 'Play the choice through breath and gaze.'
        }],
        warnings: [], responseId: 'resp_1'
      })
    })
  });
  const result = await service.enhance({ storyBrief: 'A person waits at a station.' });
  assert.equal(result.billingStatus, 'qualification_no_charge');
  assert.equal(result.provenance.model, 'test-model');
  assert.equal(result.recommendedRoles.length, 1);
  assert.deepEqual(result.recommendedRoles[0].personalityTraits, ['restrained', 'decisive']);
  assert.equal(result.recommendedRoles[0].objective, 'Leave the station');
  assert.equal(Object.hasOwn(result, 'credits'), false);
});

test('Cinematic story enhancement refuses calls while its env gate is disabled', async () => {
  const service = new CinematicStoryEnhancementService({
    policyLoader: () => ({ enabled: false, requestedEnabled: false, provider: 'openai', model: 'test' })
  });
  await assert.rejects(service.enhance({ storyBrief: 'A valid story.' }), error => (
    error.code === 'cinematic_story_enhancement_disabled' && error.statusCode === 503
  ));
});
