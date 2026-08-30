import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicWardrobeSuggestionService } from '../server/domain/generation/CinematicWardrobeSuggestionService.js';

test('wardrobe suggestion uses the global recipe and returns bounded qualification output', async () => {
  let request;
  const service = new CinematicWardrobeSuggestionService({
    policyLoader: () => ({ enabled: true, requestedEnabled: true, provider: 'openai', model: 'test-model', reasoningEffort: 'low', maxOutputTokens: 1200, timeoutMs: 1000, apiKey: 'test' }),
    recipeLoader: () => ({ id: 'wardrobe', version: 3, enabled: true, instruction: 'global instruction', fingerprint: 'abc123', limits: { maximumScenes: 2 } }),
    providerFactory: () => ({ suggestCinematicWardrobe: async input => {
      request = input;
      return {
        lookName: 'Last train look', wardrobeDirection: 'A practical navy coat over a fine knit top and straight trousers.',
        garments: { upper: 'fine knit top', lower: 'straight trousers', outerwear: 'navy coat', footwear: 'low boots', accessories: [] },
        palette: ['navy', 'charcoal'], materials: ['wool'], sceneScope: 'film_wide', recommendedSceneIds: ['scene_1'],
        rationale: 'Supports the cool-to-warm visual arc.', movementConstraints: ['Keep coat hem clear while walking'],
        continuityNotes: ['Coat remains buttoned'], warnings: [], responseId: 'resp_1'
      };
    } })
  });

  const result = await service.suggest({
    project: { title: 'Before the Last Train', storyBrief: 'A woman chooses to leave.', creativeDirection: 'Cool station to warm exit.' },
    assignment: { displayName: 'Meili', storyRole: 'Young Woman', personalityTraits: ['observant'] },
    scenes: [{ id: 'scene_1', title: 'Platform' }, { id: 'scene_2', title: 'Exit' }, { id: 'scene_3', title: 'Unused' }]
  });

  assert.equal(request.recipe.instruction, 'global instruction');
  assert.equal(request.context.scenes.length, 2);
  assert.equal(result.billingStatus, 'qualification_no_charge');
  assert.deepEqual(result.provenance, {
    provider: 'openai', model: 'test-model', responseId: 'resp_1',
    recipeId: 'wardrobe', recipeVersion: 3, recipeFingerprint: 'abc123'
  });
});

test('wardrobe suggestion rejects disabled policy without calling a provider', async () => {
  const service = new CinematicWardrobeSuggestionService({
    policyLoader: () => ({ enabled: false, requestedEnabled: false }),
    providerFactory: () => { throw new Error('provider must not be created'); }
  });
  await assert.rejects(() => service.suggest({}), error => error.code === 'cinematic_wardrobe_suggestion_disabled');
});
