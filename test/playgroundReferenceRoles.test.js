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
import { prepareGenerationReferences } from '../server/domain/generation/prepareGenerationReferences.js';
import { buildStructuredReferenceBrief } from '../server/domain/reference-processing/StructuredReferenceBrief.js';

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

test('system Character identity pack may use body and face authorities together', () => {
  const payload = playgroundPayload({
    characterProfileContext: { purpose: 'character_usage' },
    imageReferences: { faceMatch: true, characterReference: true },
    faceReferenceImageA: image('face'),
    characterReferenceImageA: image('character')
  });
  assert.doesNotThrow(() => validatePlaygroundReferenceRoles(payload));
});

test('Character identity pack injects canonical face unless an explicit override exists', async () => {
  const processingCalls = [];
  const characterService = {
    validateGenerationContext: async context => ({
      ...context,
      purpose: 'character_usage',
      authorizedCharacterReferenceAssetId: 'asset_three_view',
      authorizedCharacterFaceReferenceAssetId: 'asset_canonical_face',
      outfitBehavior: 'replaceable'
    })
  };
  const processingService = {
    processContext: async context => {
      processingCalls.push(structuredClone(context));
      return context;
    }
  };
  const base = {
    imageReferences: { faceMatch: false, characterReference: false },
    characterProfileContext: { purpose: 'character_usage' }
  };

  const canonical = await prepareGenerationReferences(structuredClone(base), {
    actorContext: { userId: 'usr_1', username: 'owner' },
    providerId: 'gemini',
    modelId: 'image',
    modelConfig: {},
    characterService,
    processingService
  });
  assert.equal(canonical.characterReferenceImageA, 'asset_three_view');
  assert.equal(canonical.faceReferenceImageA, 'asset_canonical_face');
  assert.equal(canonical.characterProfileContext.faceAuthoritySource, 'character_canonical_face');

  const explicit = await prepareGenerationReferences({
    ...structuredClone(base),
    imageReferences: { faceMatch: true, characterReference: false },
    faceReferenceImageA: 'asset_explicit_face'
  }, {
    actorContext: { userId: 'usr_1', username: 'owner' },
    providerId: 'gemini',
    modelId: 'image',
    modelConfig: {},
    characterService,
    processingService
  });
  assert.equal(explicit.characterReferenceImageA, 'asset_three_view');
  assert.equal(explicit.faceReferenceImageA, 'asset_explicit_face');
  assert.equal(explicit.characterProfileContext.faceAuthoritySource, 'explicit_face_override');
  assert.equal(processingCalls.length, 2);
});

test('structured provider brief separates detailed face authority from Character body authority', () => {
  const section = {
    authority: ['identity'],
    preserve: ['identity'],
    ignore: ['source pose']
  };
  const brief = buildStructuredReferenceBrief({
    orderedReferences: [
      { roles: ['template_baseline'] },
      { roles: ['character_reference'] },
      { roles: ['face_reference'] },
      { roles: ['outfit_front'] }
    ],
    config: {
      id: 'test',
      generationSurfaces: ['fashion'],
      requiredRoles: ['template_baseline', 'character_reference', 'outfit_front'],
      task: 'Generate one image.',
      templateDirection: section,
      characterIdentity: section,
      outfitTransfer: section,
      output: {
        subjectCount: 1,
        singleFullFramePhoto: true,
        fullBodyVisible: true,
        prohibit: []
      }
    },
    context: { generationSurface: 'fashion', aspectRatio: '6:8' }
  });
  assert.equal(brief.character_identity.source_image, 'IMAGE_2');
  assert.equal(brief.character_identity.face_source_image, 'IMAGE_2');
  assert.equal(brief.character_identity.body_source_image, 'IMAGE_1');
  assert.match(brief.output.identity_source, /IMAGE_2.+IMAGE_1/);
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
