import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicStoryEnhancementService } from '../server/domain/generation/CinematicStoryEnhancementService.js';

test('Cinematic story enhancement is qualification-gated and never invents Credits', async () => {
  const service = new CinematicStoryEnhancementService({
    policyLoader: () => ({ enabled: true, requestedEnabled: true, provider: 'openai', model: 'test-model', reasoningEffort: 'low', maxOutputTokens: 1000, timeoutMs: 1000, apiKey: 'test' }),
    providerFactory: () => ({
      enhanceCinematicStory: async ({ story }) => {
        assert.equal(story.storyCountryStyle, 'japan');
        assert.match(story.storyCountryStyleGuidance, /Japanese observational/);
        return ({
        enhancedStoryBrief: 'A concise enhanced story.', creativeDirection: 'Natural visual tension.',
        premise: 'A meeting', conflict: 'Time', emotionalArc: 'Fear to hope', ending: 'Resolution',
        candidateScenes: ['Station'],
        recommendedRoles: [{
          label: 'Lead', importance: 'required', storyFunction: 'Chooses', relationshipHint: '',
          objective: 'Leave the station', emotionalArc: 'Anxious to resolved',
          personalityTraits: ['restrained', 'decisive'], performanceDirection: 'Play the choice through breath and gaze.'
        }],
        warnings: [], responseId: 'resp_1'
      }); }
    })
  });
  const result = await service.enhance({ storyBrief: 'A person waits at a station.', storyCountryStyle: 'japan' });
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

test('role analysis preserves source and rejects missing roles or unsupported purpose', async () => {
  let output = { recommendedRoles: [{ label: 'Lead', importance: 'required', storyFunction: 'Decides' }], warnings: [],
    enhancedStoryBrief: 'Unwanted rewrite', creativeDirection: 'Unwanted change' };
  const service = new CinematicStoryEnhancementService({
    policyLoader: () => ({ enabled: true, provider: 'openai', model: 'test', apiKey: 'test' }),
    availabilityPolicy: { assertAvailable() {} },
    providerFactory: () => ({ enhanceCinematicStory: async ({ story }) => {
      assert.equal(story.purpose, 'roles');
      assert.equal(story.storyCountryStyle, 'thailand');
      assert.deepEqual(story.genres, ['drama', 'romance']);
      assert.equal(story.existingRolePlan[0].label, 'Old lead');
      return output;
    } })
  });
  const input = { purpose: 'roles', storyBrief: 'The current story', creativeDirection: 'Quiet',
    storyCountryStyle: 'thailand', genres: ['drama', 'romance'], storyRoleSlots: [{ label: 'Old lead' }] };
  const result = await service.enhance(input);
  assert.equal(result.enhancedStoryBrief, input.storyBrief);
  assert.equal(result.creativeDirection, input.creativeDirection);
  assert.equal(result.purpose, 'roles');
  output = { ...output, recommendedRoles: [] };
  await assert.rejects(service.enhance(input), { code: 'cinematic_story_enhancement_invalid_response' });
  await assert.rejects(service.enhance({ ...input, purpose: 'unknown' }), { code: 'cinematic_story_purpose_invalid' });
});
