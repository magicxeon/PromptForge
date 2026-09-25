import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicWardrobeSuggestionService } from '../server/domain/generation/CinematicWardrobeSuggestionService.js';
import { getCinematicWardrobeSuggestionPolicy } from '../server/config/cinematic-wardrobe-suggestion-policy.js';
import { cinematicTextModelDefaults } from '../server/config/cinematicStoryConfiguration.js';

test('wardrobe model inherits canonical Cinematic configuration when overrides are missing or blank', () => {
  for (const env of [{}, { CINEMATIC_WARDROBE_SUGGESTION_MODEL: ' ', CINEMATIC_STORY_ENHANCEMENT_MODEL: '\t' }]) {
    assert.equal(getCinematicWardrobeSuggestionPolicy(env).model, cinematicTextModelDefaults.enhancement.model);
  }
  assert.equal(getCinematicWardrobeSuggestionPolicy({
    CINEMATIC_WARDROBE_SUGGESTION_MODEL: ' ', CINEMATIC_STORY_ENHANCEMENT_MODEL: ' configured-story-model '
  }).model, 'configured-story-model');
});

test('wardrobe explicit model override preserves enablement and independent generation budgets', () => {
  const policy = getCinematicWardrobeSuggestionPolicy({
    OPENAI_API_KEY: 'fixture-key', ENABLE_CINEMATIC_WARDROBE_SUGGESTION: 'true',
    CINEMATIC_WARDROBE_SUGGESTION_MODEL: ' selected-look-text-model ',
    CINEMATIC_STORY_ENHANCEMENT_MODEL: 'story-model',
    CINEMATIC_WARDROBE_SUGGESTION_REASONING: 'medium',
    CINEMATIC_WARDROBE_SUGGESTION_MAX_OUTPUT_TOKENS: '2400',
    CINEMATIC_WARDROBE_SUGGESTION_TIMEOUT_MS: '75000'
  });
  assert.equal(policy.model, 'selected-look-text-model');
  assert.equal(policy.provider, 'openai');
  assert.equal(policy.enabled, true);
  assert.equal(policy.reasoningEffort, 'medium');
  assert.equal(policy.maxOutputTokens, 2400);
  assert.equal(policy.timeoutMs, 75000);
  assert.equal(getCinematicWardrobeSuggestionPolicy({ OPENAI_API_KEY: 'fixture-key' }).enabled, false);
  assert.equal(getCinematicWardrobeSuggestionPolicy({ ENABLE_CINEMATIC_WARDROBE_SUGGESTION: 'true' }).enabled, false);
});

test('wardrobe provider receives inherited model once and access rejection is not retried', async () => {
  const policy = getCinematicWardrobeSuggestionPolicy({
    OPENAI_API_KEY: 'fixture-key', ENABLE_CINEMATIC_WARDROBE_SUGGESTION: 'true'
  });
  let calls = 0;
  const denied = new Error('Fixture model access denied');
  const service = new CinematicWardrobeSuggestionService({
    policyLoader: () => policy,
    availabilityPolicy: { assertAvailable: input => assert.equal(input.modelId, policy.model) },
    recipeLoader: () => ({ enabled: true }),
    providerFactory: () => ({ suggestCinematicWardrobe: async input => {
      calls += 1;
      assert.equal(input.model, cinematicTextModelDefaults.enhancement.model);
      throw denied;
    } })
  });
  await assert.rejects(() => service.suggest({}), error => error === denied);
  assert.equal(calls, 1);
});

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
