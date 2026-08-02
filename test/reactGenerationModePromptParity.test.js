import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADDITIONAL_DIRECTION_MAX_LENGTH,
  compileGenerationContext,
  normalizeGenerationContext
} from '../server/domain/generation/generationRequestService.js';

const actor = { userId: 'usr_prompt_parity', username: 'prompt_parity' };

test('React Headshot generationMode selects the strict white-background compiler', () => {
  const { context, compiledPrompt } = compileGenerationContext({
    mode: 'normal',
    generationMode: 'headshot',
    aspectRatio: '1:1',
    selections: {
      Gender: selection('female', 'Character', 'character'),
      Environment: selection('in a busy city street', 'Environment', 'environment')
    }
  }, actor);

  assert.equal(context.mode, 'headshot');
  assert.match(compiledPrompt, /straight front-facing portrait/i);
  assert.match(compiledPrompt, /solid pure white background/i);
  assert.doesNotMatch(compiledPrompt, /busy city street/i);
});

test('React Reusable Character Sheet uses casting layout and gray contour-grid uniform', () => {
  const { context, compiledPrompt } = compileGenerationContext({
    mode: 'normal',
    generationMode: 'character-sheet',
    characterType: 'reusable_model',
    selections: {
      Gender: selection('female', 'Character', 'character'),
      Tone: selection('warm olive skin tone', 'Skin', 'skin'),
      'Skin Texture': selection('natural detailed skin texture', 'Skin', 'skin'),
      'Model Build': selection('athletic natural build', 'Body', 'body'),
      'Body Silhouette': selection('balanced hourglass body silhouette', 'Body', 'body'),
      Clothing: selection('wearing a red evening dress', 'Clothing', 'clothing')
    }
  }, actor);

  assert.equal(context.mode, 'character-sheet');
  assert.equal(context.characterType, 'reusable_model');
  assert.match(
    compiledPrompt,
    /front view facing directly toward the camera.*exact side profile facing toward the viewer right.*back view facing directly away from the camera/i
  );
  assert.match(compiledPrompt, /head aligned with the torso/i);
  assert.match(compiledPrompt, /medium-gray.+four-way-stretch jersey casting uniform/i);
  assert.match(compiledPrompt, /warm olive skin tone/i);
  assert.match(compiledPrompt, /natural detailed skin texture/i);
  assert.match(compiledPrompt, /athletic natural build/i);
  assert.match(compiledPrompt, /balanced hourglass body silhouette/i);
  assert.match(compiledPrompt, /solid pure white background/i);
  assert.doesNotMatch(compiledPrompt, /red evening dress/i);
});

test('React Reusable Character Sheet preserves an explicit runway hourglass body direction', () => {
  const { compiledPrompt } = compileGenerationContext({
    mode: 'normal',
    generationMode: 'character-sheet',
    characterType: 'reusable_model',
    selections: {
      'Height Impression': selection(
        'elongated runway-style body line without anatomical distortion',
        'Body',
        'body'
      ),
      'Model Build': selection(
        'slender curvaceous adult fashion-model build with a narrow lean frame, slim shoulders, arms, waist, and legs, while retaining distinctly fuller natural upper-torso volume and proportionate rounded hips; do not interpret slender as a straight, flat, or low-curve body shape',
        'Body',
        'body'
      ),
      'Body Silhouette': selection(
        'adult high-fashion model anatomy with distinctly fuller natural bust volume, clear natural forward upper-torso projection visible consistently in both front and exact side profile, pronounced but anatomically plausible bust-to-waist contrast, a narrow clearly defined waist, balanced rounded hips, slender shoulders and limbs, and long elegant legs; preserve these same selected bust, waist, hip, and limb proportions across every view without normalizing them toward average body proportions',
        'Body',
        'body'
      )
    }
  }, actor);

  assert.match(compiledPrompt, /elongated runway-style body line/i);
  assert.match(compiledPrompt, /slender curvaceous adult fashion-model build/i);
  assert.match(compiledPrompt, /do not interpret slender as a straight, flat, or low-curve body shape/i);
  assert.match(compiledPrompt, /distinctly fuller natural bust volume/i);
  assert.match(compiledPrompt, /clear natural forward upper-torso projection/i);
  assert.match(compiledPrompt, /narrow clearly defined waist/i);
  assert.match(compiledPrompt, /without normalizing them toward average body proportions/i);
  assert.match(compiledPrompt, /four-way-stretch jersey/i);
  assert.match(compiledPrompt, /clear tonal separation/i);
  assert.match(compiledPrompt, /technical contour grid/i);
  assert.match(compiledPrompt, /without compression, padding, reshaping, concealment, or flattening/i);
  assert.match(compiledPrompt, /never underwear, lingerie, swimwear/i);
});

test('React Styled Character Sheet preserves selected clothing on white', () => {
  const { compiledPrompt } = compileGenerationContext({
    mode: 'normal',
    generationMode: 'character-sheet',
    characterType: 'styled_character',
    selections: {
      Gender: selection('female', 'Character', 'character'),
      Tone: selection('deep neutral skin tone', 'Skin', 'skin'),
      'Model Build': selection('soft natural build', 'Body', 'body'),
      'Outfit Base': {
        ...selection('wearing a tailored navy suit', 'Clothing', 'clothing'),
        id: 'outfit.base.tailored',
        tags: ['outfit-base-female']
      }
    }
  }, actor);

  assert.match(
    compiledPrompt,
    /front view facing directly toward the camera.*exact side profile facing toward the viewer right.*back view facing directly away from the camera/i
  );
  assert.match(compiledPrompt, /head aligned with the torso/i);
  assert.match(compiledPrompt, /wearing a tailored navy suit/i);
  assert.match(compiledPrompt, /deep neutral skin tone/i);
  assert.match(compiledPrompt, /soft natural build/i);
  assert.match(compiledPrompt, /solid pure white background/i);
  assert.doesNotMatch(compiledPrompt, /casting uniform/i);
});

test('React Scene generationMode remains scene-directed and is not forced to white', () => {
  const context = normalizeGenerationContext({
    mode: 'headshot',
    generationMode: 'scene',
    selections: {
      'Cut / Style': selection('sleek chin-length bob haircut', 'Hair', 'hair'),
      Tone: selection('warm brown skin tone', 'Skin', 'skin'),
      'Model Build': selection('tall athletic natural build', 'Body', 'body'),
      Environment: selection('inside a warm Bangkok cafe', 'Environment', 'environment')
    },
    sceneBuilder: { authoringMode: 'guided' }
  }, actor);
  const { compiledPrompt } = compileGenerationContext(context, actor);

  assert.equal(context.mode, 'normal');
  assert.match(compiledPrompt, /warm Bangkok cafe/i);
  assert.match(compiledPrompt, /sleek chin-length bob haircut/i);
  assert.match(compiledPrompt, /warm brown skin tone/i);
  assert.match(compiledPrompt, /tall athletic natural build/i);
  assert.doesNotMatch(compiledPrompt, /straight front-facing portrait/i);
  assert.doesNotMatch(compiledPrompt, /solid pure white background/i);
});

test('Face Reference preserves identity while retaining editable Expression', () => {
  const { compiledPrompt } = compileGenerationContext({
    generationMode: 'scene',
    selections: {
      'Face Shape': selection('diamond face marker', 'Face', 'face'),
      Expression: selection('bright joyful expression marker', 'Face', 'expression')
    },
    faceReferenceImageA: '/outputs/references/face.jpg',
    imageReferences: { faceMatch: true }
  }, actor);

  assert.match(compiledPrompt, /Preserve the identity of the uploaded person/i);
  assert.match(compiledPrompt, /bright joyful expression marker/i);
  assert.doesNotMatch(compiledPrompt, /diamond face marker/i);
});

test('Guided Studio compiles Additional Direction without weakening mode framing', () => {
  const { context, compiledPrompt } = compileGenerationContext({
    generationMode: 'headshot',
    generationSurface: 'studio',
    additionalDirection: 'subtle natural asymmetry and restrained editorial polish',
    selections: {
      Gender: selection('female', 'Character', 'character')
    }
  }, actor);

  assert.equal(
    context.additionalDirection,
    'subtle natural asymmetry and restrained editorial polish'
  );
  assert.match(compiledPrompt, /subtle natural asymmetry/i);
  assert.match(compiledPrompt, /straight front-facing portrait/i);
  assert.match(compiledPrompt, /solid pure white background/i);
});

test('Additional Direction rejects requests over 300 characters and ignores Manual Scene', () => {
  assert.throws(
    () => normalizeGenerationContext({
      generationMode: 'scene',
      generationSurface: 'studio',
      sceneBuilder: { authoringMode: 'guided' },
      additionalDirection: 'x'.repeat(ADDITIONAL_DIRECTION_MAX_LENGTH + 1)
    }, actor),
    error => error.code === 'additional_direction_too_long'
  );

  const manual = normalizeGenerationContext({
    generationMode: 'scene',
    generationSurface: 'studio',
    sceneBuilder: {
      authoringMode: 'manual',
      manualPromptText: 'A complete manual prompt'
    },
    additionalDirection: 'must be ignored'
  }, actor);
  assert.equal(manual.additionalDirection, '');
});

test('Template snapshot Additional Direction cannot be overridden by the caller', () => {
  const { context, compiledPrompt } = compileGenerationContext({
    generationMode: 'scene',
    generationSurface: 'studio',
    sceneBuilder: { authoringMode: 'guided' },
    additionalDirection: 'consumer override',
    sceneTemplateSnapshot: {
      authoringMode: 'guided',
      structuredSelectionsSnapshot: {},
      referenceSlotMapping: {},
      additionalDirectionSnapshot: 'immutable creator direction'
    },
    selections: {
      Environment: selection('inside a clean studio', 'Environment', 'environment')
    }
  }, actor);

  assert.equal(context.additionalDirection, 'immutable creator direction');
  assert.match(compiledPrompt, /immutable creator direction/i);
  assert.doesNotMatch(compiledPrompt, /consumer override/i);
});

function selection(value, group, category) {
  return {
    id: `${category}.fixture`,
    value,
    group,
    category,
    tags: []
  };
}
