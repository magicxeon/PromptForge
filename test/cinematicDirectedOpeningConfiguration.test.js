import assert from 'node:assert/strict';
import test from 'node:test';
import { storyAuthoringConfiguration, normalizeStoryIntent, validateStoryAuthoring } from '../server/config/cinematicStoryConfiguration.js';
import { getCinematicStoryEnhancementPolicy } from '../server/config/cinematic-story-enhancement-policy.js';
import { getCinematicStoryPlanPolicy } from '../server/config/cinematic-story-plan-policy.js';
import { cinematicFieldManifestService } from '../server/domain/cinematic/CinematicFieldManifestService.js';

test('JSON policy defaults to Sol and preserves explicit environment override', () => {
  assert.equal(getCinematicStoryEnhancementPolicy({}).model, 'gpt-6-sol');
  assert.equal(getCinematicStoryEnhancementPolicy({}).maxOutputTokens, 8000);
  assert.equal(getCinematicStoryEnhancementPolicy({}).longFormTimeoutMs, 120000);
  assert.equal(getCinematicStoryEnhancementPolicy({ GEMINI_API_KEY: 'gemini-key' }).fallback.enabled, true);
  assert.equal(getCinematicStoryEnhancementPolicy({ GEMINI_API_KEY: 'gemini-key' }).fallback.model, 'gemini-3.8-flash');
  assert.equal(getCinematicStoryPlanPolicy({}).model, 'gpt-6-sol');
  assert.equal(getCinematicStoryEnhancementPolicy({ CINEMATIC_STORY_ENHANCEMENT_MODEL: 'custom' }).model, 'custom');
  assert.deepEqual(cinematicFieldManifestService.getPublicManifest().storyAuthoring, storyAuthoringConfiguration);
  assert.equal('apiKey' in cinematicFieldManifestService.getPublicManifest().storyAuthoring, false);
});
test('ordered creative intent round-trips with primary legacy scalar', () => {
  const input = { genres: ['mystery', 'romance'], audienceFeelings: ['curious', 'tense', 'relieved'], pacingTraits: ['slow-burn', 'accelerating'] };
  const normalized = normalizeStoryIntent(input);
  assert.deepEqual(normalized.genres, input.genres);
  assert.equal(normalized.genre, 'mystery');
  assert.deepEqual(normalizeStoryIntent(normalized), normalized);
  assert.deepEqual(normalizeStoryIntent({ genre: 'comedy' }).genres, ['comedy']);
});
test('invalid and contradictory selections and malformed config fail closed', () => {
  for (const input of [{ genres: [] }, { genres: ['drama', 'drama'] }, { genres: ['invented'] },
    { genres: ['drama', 'comedy', 'romance', 'mystery'] }, { pacingTraits: ['slow', 'fast'] }]) {
    assert.throws(() => normalizeStoryIntent(input), { code: 'cinematic_story_intent_invalid' });
  }
  const config = structuredClone(storyAuthoringConfiguration);
  config.choices.genres.maxSelections = 99;
  assert.throws(() => validateStoryAuthoring(config));
});

test('country style defaults safely for legacy projects and accepts only configured presets', () => {
  assert.equal(normalizeStoryIntent({}).storyCountryStyle, 'none');
  for (const option of storyAuthoringConfiguration.countryStyles.options) {
    assert.equal(normalizeStoryIntent({ storyCountryStyle: option.id }).storyCountryStyle, option.id);
    assert.ok(option.guidance.length > 20);
  }
  assert.throws(() => normalizeStoryIntent({ storyCountryStyle: 'unknown' }), { code: 'cinematic_story_intent_invalid' });
  const invalid = structuredClone(storyAuthoringConfiguration);
  invalid.countryStyles.options[1].flag = '../private';
  assert.throws(() => validateStoryAuthoring(invalid));
});

test('story period defaults safely and rejects unknown or malformed presets', () => {
  assert.equal(normalizeStoryIntent({}).storyPeriod, 'contemporary');
  for (const option of storyAuthoringConfiguration.periods.options) {
    assert.equal(normalizeStoryIntent({ storyPeriod: option.id }).storyPeriod, option.id);
    assert.ok(option.guidance.length > 20);
  }
  assert.throws(() => normalizeStoryIntent({ storyPeriod: 'unknown' }), { code: 'cinematic_story_intent_invalid' });
  const invalid = structuredClone(storyAuthoringConfiguration);
  invalid.periods.options[0].guidance = '';
  assert.throws(() => validateStoryAuthoring(invalid));
});
