import test from 'node:test';
import assert from 'node:assert/strict';
import { CharacterProfileSharingService } from '../server/domain/character-profiles/CharacterProfileSharingService.js';
import { CharacterUsageService } from '../server/domain/character-profiles/CharacterUsageService.js';
import {
  compilePromptFromGenerationContext,
  createQueueOptions
} from '../server/domain/generation/generationRequestService.js';

test('Scene handoff snapshots personality and excludes casting outfit attributes', async () => {
  const profile = {
    id: 'charprof_1',
    ownerUserId: 'usr_owner',
    ownerUsernameSnapshot: 'owner',
    status: 'approved',
    visibility: 'public',
    reusePolicy: 'public_reusable',
    activeVersionId: 'charver_1',
    displayName: 'Mina',
    personalitySummary: 'Warm and confident',
    intendedUses: ['fashion', 'scene_story'],
    characterType: 'reusable_model'
  };
  const version = {
    id: 'charver_1',
    characterProfileId: profile.id,
    status: 'approved',
    canonicalCastingExportAssetId: 'job_casting',
    structuredCharacterSnapshot: {
      selections: {
        Face: { group: 'Face', id: 'face_1' },
        Body: { group: 'Body', id: 'body_1' },
        Outfit: { group: 'Clothing', id: 'white_uniform' },
        Pose: { group: 'Pose', id: 'pose_1' }
      }
    }
  };
  const service = new CharacterProfileSharingService({
    profileRepository: { findById: async () => profile },
    versionRepository: { findById: async () => version },
    usageService: { getStats: async () => ({ totalOutputs: 0, byUseCase: {} }) }
  });
  const handoff = await service.createHandoff(
    profile.id,
    { destination: 'scene_builder' },
    { userId: 'usr_viewer', username: 'viewer' }
  );
  assert.equal(handoff.personalitySummarySnapshot, profile.personalitySummary);
  assert.equal(handoff.characterReferenceAssetId, 'job_casting');
  assert.equal(handoff.compatibleAttributeSnapshot.Face.id, 'face_1');
  assert.equal(handoff.compatibleAttributeSnapshot.Outfit, undefined);
  assert.equal(handoff.compatibleAttributeSnapshot.Pose, undefined);
  assert.equal(handoff.outfitBehavior, 'replaceable');
});

test('server replaces client Character metadata with canonical snapshots before queueing', async () => {
  const profile = {
    id: 'charprof_1',
    ownerUserId: 'usr_owner',
    ownerUsernameSnapshot: 'owner',
    displayName: 'Mina',
    personalitySummary: 'Warm and confident',
    intendedUses: ['fashion'],
    characterType: 'reusable_model',
    status: 'approved',
    visibility: 'public',
    reusePolicy: 'public_reusable'
  };
  const service = new CharacterUsageService({
    profileRepository: { findById: async () => profile },
    versionRepository: {
      findById: async () => ({
        id: 'charver_1',
        characterProfileId: profile.id,
        status: 'approved',
        canonicalCastingExportAssetId: 'job_casting',
        castingFacePreviewUrl: '/outputs/character-profiles/charprof_1/charver_1/face.webp',
        castingFrontPreviewUrl: '/outputs/character-profiles/charprof_1/charver_1/front.webp'
      })
    },
    usageRepository: {}
  });
  const context = await service.validateGenerationContext({
    purpose: 'character_usage',
    characterProfileId: profile.id,
    characterProfileVersionId: 'charver_1',
    displayNameSnapshot: 'tampered',
    personalitySummarySnapshot: 'tampered'
  }, { userId: 'usr_viewer', username: 'viewer' });
  assert.equal(context.displayNameSnapshot, profile.displayName);
  assert.equal(context.personalitySummarySnapshot, profile.personalitySummary);
  assert.equal(context.attribution.ownerUserId, profile.ownerUserId);
  assert.equal(context.authorizedCharacterReferenceAssetId, 'job_casting');
  assert.equal(
    context.authorizedCharacterFaceReferenceUrl,
    '/outputs/character-profiles/charprof_1/charver_1/face.webp'
  );
  assert.equal(
    context.authorizedCharacterFrontReferenceUrl,
    '/outputs/character-profiles/charprof_1/charver_1/front.webp'
  );
  assert.match(compilePromptFromGenerationContext({
    mode: 'normal',
    selections: {},
    aspectRatio: '1:1',
    imageReferences: {},
    characterProfileContext: context
  }), /Warm and confident/);

  const queueOptions = createQueueOptions({
    selections: {},
    imageReferences: { characterReference: true },
    characterProfileContext: context,
    characterReferenceImageA: context.authorizedCharacterFaceReferenceUrl,
    characterReferenceImageB: context.authorizedCharacterFrontReferenceUrl,
    characterReferenceJobIds: ['job_casting'],
    aspectRatio: '6:8'
  }, {
    username: 'viewer',
    stream: false,
    modelConfig: { defaults: {} },
    providerConfigVersion: 'test',
    creditCost: 1,
    payerUserId: 'usr_viewer'
  });
  assert.deepEqual(queueOptions.authorizedCharacterReferenceUrls, [
    '/outputs/character-profiles/charprof_1/charver_1/face.webp',
    '/outputs/character-profiles/charprof_1/charver_1/front.webp'
  ]);
  assert.equal(
    queueOptions.characterProfileContext.authorizedCharacterFaceReferenceUrl,
    undefined
  );
});

test('Styled Character preserves its outfit in Scene and is rejected by Fashion', async () => {
  const profile = {
    id: 'charprof_styled',
    ownerUserId: 'usr_owner',
    ownerUsernameSnapshot: 'owner',
    status: 'approved',
    visibility: 'public',
    reusePolicy: 'public_reusable',
    activeVersionId: 'charver_styled',
    displayName: 'Mina Styled',
    personalitySummary: 'Elegant and composed',
    intendedUses: ['scene_story'],
    characterType: 'styled_character'
  };
  const version = {
    id: 'charver_styled',
    characterProfileId: profile.id,
    status: 'approved',
    characterType: 'styled_character',
    canonicalCharacterSheetAssetId: 'job_styled_sheet',
    structuredCharacterSnapshot: {
      selections: {
        Face: { group: 'Face', id: 'face_1' },
        Outfit: { group: 'Clothing', id: 'dress_1' }
      }
    }
  };
  const service = new CharacterProfileSharingService({
    profileRepository: { findById: async () => profile },
    versionRepository: { findById: async () => version },
    usageService: { getStats: async () => ({ totalOutputs: 0, byUseCase: {} }) }
  });

  const handoff = await service.createHandoff(
    profile.id,
    { destination: 'scene_builder' },
    { userId: 'usr_viewer', username: 'viewer' }
  );
  assert.equal(handoff.characterReferenceAssetId, 'job_styled_sheet');
  assert.equal(handoff.outfitBehavior, 'preserve');
  assert.deepEqual(handoff.destinationCapabilities, ['scene_builder']);

  await assert.rejects(
    service.createHandoff(
      profile.id,
      { destination: 'fashion_blueprint' },
      { userId: 'usr_viewer', username: 'viewer' }
    ),
    error => error.code === 'character_destination_incompatible'
  );

  const prompt = compilePromptFromGenerationContext({
    mode: 'normal',
    selections: {},
    aspectRatio: '1:1',
    imageReferences: {},
    characterProfileContext: {
      purpose: 'character_usage',
      characterProfileId: profile.id,
      characterProfileVersionId: version.id,
      personalitySummarySnapshot: profile.personalitySummary,
      outfitBehavior: handoff.outfitBehavior
    }
  });
  assert.match(prompt, /Preserve the original outfit identity/i);
  assert.doesNotMatch(prompt, /any casting uniform visible.+must not be copied/i);
});
