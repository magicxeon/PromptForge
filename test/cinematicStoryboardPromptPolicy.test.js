import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compilePromptFromGenerationContext,
  createQueueOptions,
  normalizeGenerationContext
} from '../server/domain/generation/generationRequestService.js';

function context(overrides = {}) {
  return {
    mode: 'normal',
    generationMode: 'scene',
    generationSurface: 'cinematic',
    selections: {},
    aspectRatio: '9:16',
    imageReferences: {},
    sceneBuilder: {
      authoringMode: 'manual',
      manualPromptText: [
        'STORYBOARD STILL CONTRACT',
        'Selected Shot emotional target: Tense and watchful.',
        'Do not smile unless this Shot explicitly requests it.'
      ].join('\n')
    },
    characterProfileContext: {
      purpose: 'character_usage',
      personalitySummarySnapshot: 'cute, beautiful smile, sparkling eyes'
    },
    ...overrides
  };
}

test('Cinematic Storyboard final prompt gives Shot emotion authority over personality', () => {
  const prompt = compilePromptFromGenerationContext(context());
  assert.ok(prompt.startsWith('Create a detailed monochrome graphite'));
  assert.match(prompt, /STORYBOARD STILL CONTRACT/);
  assert.doesNotMatch(prompt, /cute, beautiful smile|Character personality baseline/i);
  assert.match(prompt, /observed narrative moment, not a posed portrait, fashion image or sales presentation/i);
  assert.match(prompt, /clearly hand-drawn sketch/i);
  assert.match(prompt, /graphite contours and cross-hatching/i);
  assert.match(prompt, /No photorealistic rendering/i);
  assert.match(prompt, /do not add a friendly micro-smile or direct camera gaze/i);
  assert.match(prompt, /do not raise, center or turn it toward camera/i);
  assert.match(prompt, /do not add beauty fill, lift the face or activate an unrequested fixture/i);
});

test('Cinematic Storyboard realism policy does not affect non-Cinematic Scene generation', () => {
  const prompt = compilePromptFromGenerationContext(context({ generationSurface: 'studio' }));
  assert.doesNotMatch(prompt, /cinematic-storyboard-still/i);
  assert.doesNotMatch(prompt, /Character personality baseline/i);
  assert.match(prompt, /Portray the character personality as/i);
});

test('Cinematic Storyboard can disable only the optional natural camera profile', () => {
  const prompt = compilePromptFromGenerationContext(context({ cinematicCaptureProfileId: null }));
  assert.match(prompt, /physically plausible cinematic composition/i);
  assert.match(prompt, /motivated light expressed through graphite/i);
  assert.doesNotMatch(prompt, /source-consistent unretouched skin|subtle sensor noise/i);
  assert.match(prompt, /Selected Shot emotional target: Tense and watchful/i);
});

test('Cinematic Storyboard defaults and validates the capture profile before estimate or submit', () => {
  const normalized = normalizeGenerationContext(context({ promptRefinement: { enabled: true } }));
  assert.equal(normalized.cinematicCaptureProfileId, 'photorealistic-cinematic');
  assert.equal(normalized.promptRefinement.enabled, false);
  assert.throws(
    () => normalizeGenerationContext(context({ cinematicCaptureProfileId: 'unknown-profile' })),
    error => error.code === 'cinematic_capture_profile_invalid' && error.statusCode === 400
  );
});

test('sketch: queue metadata is derived only for the Cinematic still compiler', () => {
  assert.equal(createQueueOptions(normalizeGenerationContext(context()), { modelConfig: { defaults: {} } }).storyboardRenderStyle, 'concept_sketch_v1');
  assert.equal(createQueueOptions(normalizeGenerationContext(context({ generationSurface: 'studio', storyboardRenderStyle: 'concept_sketch_v1' })), { modelConfig: { defaults: {} } }).storyboardRenderStyle, null);
});
