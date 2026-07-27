import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compilePromptFromGenerationContext,
  normalizeGenerationContext
} from '../server/domain/generation/generationRequestService.js';
import {
  compileReferenceRoleDirective,
  createReferenceRoleManifest,
  validatePlaygroundReferenceRoles
} from '../server/domain/generation/referenceRolePolicy.js';

const image = name => `data:image/png;base64,${name}`;

function playgroundPayload(overrides = {}) {
  return {
    generationSurface: 'playground',
    mode: 'normal',
    aspectRatio: '6:8',
    outputCount: 1,
    selections: {},
    imageReferences: {
      faceMatch: false,
      characterReference: false,
      styleMatch: false,
      poseMatch: false,
      outfitReference: false
    },
    sceneBuilder: {
      authoringMode: 'manual',
      manualPromptText: 'A commercial portrait in a clean studio.'
    },
    ...overrides
  };
}

test('Playground rejects simultaneous Face and Character identity authorities', () => {
  const payload = playgroundPayload({
    imageReferences: { faceMatch: true, characterReference: true },
    faceReferenceImageA: image('face'),
    characterReferenceImageA: image('character')
  });
  assert.throws(
    () => validatePlaygroundReferenceRoles(payload),
    error => error.code === 'reference_role_conflict' && error.statusCode === 400
  );
});

test('Playground Character reference survives normalization', () => {
  const context = normalizeGenerationContext(playgroundPayload({
    imageReferences: { characterReference: true },
    characterReferenceImageA: image('character')
  }));
  assert.equal(context.imageReferences.characterReference, true);
  assert.equal(context.characterReferenceImageA, image('character'));
  assert.deepEqual(context.referenceRoleManifest, [
    { index: 1, roles: ['character_reference_a'] }
  ]);
});

test('Playground requires Outfit Front before Outfit Back', () => {
  const payload = playgroundPayload({
    imageReferences: { outfitReference: true },
    outfitReferenceImageBack: image('back')
  });
  assert.throws(
    () => validatePlaygroundReferenceRoles(payload),
    error => error.code === 'outfit_front_required' && error.statusCode === 400
  );
});

test('manual prompt receives role boundaries without changing user text', () => {
  const context = normalizeGenerationContext(playgroundPayload({
    imageReferences: { styleMatch: true, poseMatch: true },
    styleReferenceImageA: image('style'),
    styleReferenceImageB: image('pose')
  }));
  const prompt = compilePromptFromGenerationContext(context);
  assert.match(prompt, /style_reference: apply only lighting, palette/i);
  assert.match(prompt, /do not copy identity, body, pose, garment design/i);
  assert.match(prompt, /pose_reference: apply only body arrangement/i);
  assert.match(prompt, /A commercial portrait in a clean studio\.$/);
});

test('reference manifest follows provider order and merges duplicate images', () => {
  const sharedImage = image('shared');
  const context = {
    imageReferences: {
      characterReference: true,
      outfitReference: true,
      faceMatch: false,
      styleMatch: true,
      poseMatch: true
    },
    characterReferenceImageA: image('character'),
    outfitReferenceImageFront: image('front'),
    styleReferenceImageA: sharedImage,
    styleReferenceImageB: sharedImage
  };
  assert.deepEqual(createReferenceRoleManifest(context), [
    { index: 1, roles: ['character_reference_a'] },
    { index: 2, roles: ['outfit_front_reference'] },
    { index: 3, roles: ['style_reference', 'pose_reference'] }
  ]);
  assert.match(compileReferenceRoleDirective(context), /Reference image 3: style_reference:.*pose_reference:/);
});
