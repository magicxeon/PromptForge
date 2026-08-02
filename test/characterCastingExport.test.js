import test from 'node:test';
import assert from 'node:assert/strict';
import { getCharacterCastingPolicy } from '../server/domain/character-profiles/characterCastingPolicy.js';
import { normalizeGenerationContext, compileGenerationContext } from '../server/domain/generation/generationRequestService.js';

test('casting export policy requires three full-body views and a modest gray contour-grid uniform', () => {
  const policy = getCharacterCastingPolicy();
  assert.equal(policy.layoutId, 'character-casting-three-view-v2');
  assert.equal(policy.uniformPolicyId, 'casting-uniform-gray-grid-v4');
  assert.equal(policy.aspectRatio, '6:8');
  for (const phrase of ['three', 'front view', 'side profile', 'back view', 'head-to-feet', 'opaque', 'white']) {
    assert.match(policy.promptDirective, new RegExp(phrase, 'i'));
  }
  assert.match(policy.promptDirective, /side by side in one horizontal row/i);
  assert.match(policy.promptDirective, /never crop the head/i);
  assert.match(policy.promptDirective, /head aligned with the torso/i);
  assert.match(policy.promptDirective, /viewer right/i);
  assert.match(policy.promptDirective, /unlabeled image only/i);
  assert.match(policy.promptDirective, /no text, captions, words, letters, panel titles/i);
  assert.match(policy.promptDirective, /four-way-stretch jersey/i);
  assert.match(policy.promptDirective, /neutral medium-gray/i);
  assert.match(policy.promptDirective, /clear tonal separation/i);
  assert.match(policy.promptDirective, /technical contour grid/i);
  assert.match(policy.promptDirective, /curves naturally over the exact body contours/i);
  assert.match(policy.promptDirective, /without compression, padding, reshaping, concealment, or flattening/i);
  assert.doesNotMatch(policy.promptDirective, /three-quarter|2 by 2/i);
  assert.match(
    policy.promptDirective,
    /(?:never|without)[^.]*\bunderwear\b/i,
    'Casting policy must explicitly prohibit underwear.'
  );
});

test('casting context enables the canonical character reference and prefixes policy', () => {
  const payload = {
    mode: 'character-sheet',
    outputCount: 4,
    selections: {},
    characterReferenceImageA: '/outputs/source.png',
    imageReferences: { characterReference: true },
    characterProfileContext: {
      purpose: 'character_casting_export',
      characterProfileId: 'charprof_1',
      characterProfileVersionId: 'charver_1'
    }
  };
  const context = normalizeGenerationContext(payload, { userId: 'usr_owner' });
  assert.equal(context.imageReferences.characterReference, true);
  assert.equal(context.outputCount, 1);
  const { compiledPrompt } = compileGenerationContext(payload, { userId: 'usr_owner' });
  assert.ok(compiledPrompt.indexOf('front view') < compiledPrompt.length / 2);
});

test('destination Character usage treats the casting uniform as non-final clothing', () => {
  const { compiledPrompt } = compileGenerationContext({
    mode: 'normal',
    selections: {},
    characterReferenceImageA: '/outputs/casting.png',
    imageReferences: { characterReference: true },
    characterProfileContext: {
      purpose: 'character_usage',
      characterProfileId: 'charprof_1',
      characterProfileVersionId: 'charver_1',
      useCase: 'fashion',
      sourceType: 'fashion_blueprint',
      characterType: 'reusable_model',
      outfitBehavior: 'replaceable'
    }
  }, { userId: 'usr_viewer' });
  assert.match(compiledPrompt, /any casting uniform visible.+must not be copied/i);
  assert.doesNotMatch(compiledPrompt, /white casting (?:uniform|outfit)/i);
  assert.match(compiledPrompt, /destination expression, pose, clothing/i);
});

test('Reusable Model Character Sheet strips editable clothing and outfit references', () => {
  const payload = {
    mode: 'character-sheet',
    characterType: 'reusable_model',
    aspectRatio: '1:1',
    outputCount: 4,
    selections: {
      Face: { group: 'Face', id: 'face_1' },
      Outfit: { group: 'Clothing', id: 'dress_1' },
      'Sheet Layout': {
        group: 'Body',
        id: 'body.sheet_layout.front_side_back',
        value: 'showing front, side and back views'
      }
    },
    outfitReferenceImageFront: 'data:image/png;base64,private-outfit',
    imageReferences: { outfitReference: true }
  };
  const context = normalizeGenerationContext(payload, { userId: 'usr_owner' });
  const { compiledPrompt } = compileGenerationContext(payload, { userId: 'usr_owner' });

  assert.equal(context.selections.Face.id, 'face_1');
  assert.equal(context.selections.Outfit, undefined);
  assert.equal(context.imageReferences.outfitReference, false);
  assert.equal(context.aspectRatio, '6:8');
  assert.equal(context.outputCount, 1);
  assert.equal(context.characterSheetConfig.characterType, 'reusable_model');
  assert.equal(context.characterSheetConfig.castingCandidate, true);
  assert.equal(context.characterSheetConfig.layout.type, 'character-casting-three-view-v2');
  assert.equal(context.characterSheetConfig.castingLayoutVersion, 'character-casting-three-view-v2');
  assert.equal(context.characterSheetConfig.uniformPolicyVersion, 'casting-uniform-gray-grid-v4');
  assert.match(compiledPrompt, /three clearly separated equal views/i);
  assert.match(compiledPrompt, /front view.+exact side profile.+back view/i);
  assert.match(compiledPrompt, /head aligned with the torso/i);
  assert.match(compiledPrompt, /unlabeled image only/i);
  assert.doesNotMatch(compiledPrompt, /three-quarter|2 by 2/i);
  assert.doesNotMatch(compiledPrompt, /dress_1/i);
});

test('Styled Character Sheet compiles custom hair colors and garment tones', () => {
  const { compiledPrompt } = compileGenerationContext({
    mode: 'character-sheet',
    characterType: 'styled_character',
    selections: {
      'Outfit Base': {
        id: 'outfit.base.test',
        value: 'a modest fitted fashion outfit',
        group: 'Clothing',
        category: 'clothing',
        tags: ['outfit-base-unisex']
      }
    },
    customColors: {
      Color: {
        enabled: true,
        base: '#3a2418',
        highlightEnabled: true,
        highlight: '#c99662'
      },
      'Primary Color': { enabled: true, color: '#1f2937' },
      'Secondary Color': { enabled: true, color: '#f8fafc' }
    }
  }, { userId: 'usr_owner' });

  assert.match(compiledPrompt, /base hair color #3a2418/i);
  assert.match(compiledPrompt, /dimensional hair highlights in #c99662/i);
  assert.match(compiledPrompt, /dominant garment tone #1f2937/i);
  assert.match(compiledPrompt, /coordinating accent garment tone #f8fafc/i);
});
