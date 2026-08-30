import assert from 'node:assert/strict';
import test from 'node:test';
import { compilePromptFromGenerationContext } from '../server/domain/generation/generationRequestService.js';

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
  assert.match(prompt, /Character personality baseline: cute, beautiful smile, sparkling eyes/i);
  assert.match(prompt, /selected Shot emotional target, performance and gaze have higher authority/i);
  assert.match(prompt, /Cinematic still policy \(cinematic-storyboard-still v1\)/i);
  assert.match(prompt, /physically plausible cinematic photograph/i);
  assert.match(prompt, /Do not add .*direct-to-camera smiling unless the selected Shot explicitly requires it/i);
});

test('Cinematic Storyboard realism policy does not affect non-Cinematic Scene generation', () => {
  const prompt = compilePromptFromGenerationContext(context({ generationSurface: 'studio' }));
  assert.doesNotMatch(prompt, /cinematic-storyboard-still/i);
  assert.doesNotMatch(prompt, /Character personality baseline/i);
  assert.match(prompt, /Portray the character personality as/i);
});
