import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CharacterProfileRepository } from '../server/repositories/character-profiles/CharacterProfileRepository.js';
import { CharacterProfileVersionRepository } from '../server/repositories/character-profiles/CharacterProfileVersionRepository.js';
import { CharacterProfileService } from '../server/domain/character-profiles/CharacterProfileService.js';

const actor = { userId: 'usr_owner', username: 'owner' };

test('Character Profile creation is owner-scoped, idempotent and optimistic', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-character-profile-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const profiles = new CharacterProfileRepository({ profilesFile: path.join(dir, 'profiles.json') });
  const versions = new CharacterProfileVersionRepository({ versionsFile: path.join(dir, 'versions.json') });
  const sourceResult = {
    id: 'job_character_sheet',
    ownerUserId: actor.userId,
    mode: 'character-sheet',
    selections: {
      Gender: { id: 'female', group: 'Character', value: 'female' },
      Age: {
        id: 'character.004',
        group: 'Character',
        label: 'Young Adult (24-27)',
        value: 'young adult'
      }
    },
    characterSheetConfig: {
      version: 1,
      characterType: 'reusable_model',
      legacyEmbeddedReference: 'data:image/png;base64,private-image-bytes'
    }
  };
  const replacementSource = {
    ...sourceResult,
    id: 'job_character_sheet_v2',
    selections: { Gender: { id: 'female_v2', group: 'Character', value: 'female' } }
  };
  const auditEvents = [];
  const service = new CharacterProfileService({
    profileRepository: profiles,
    versionRepository: versions,
    generationResultRepository: {
      findByIdForOwner: async (id, ownerUserId) =>
        ownerUserId === actor.userId
          ? [sourceResult, replacementSource].find(item => item.id === id) || null
          : null
    },
    profileSharingService: { syncProjection: async () => null },
    usageService: { getStats: async () => ({ totalOutputs: 0, byUseCase: {} }) },
    creatorProfiles: { ensureProfileForActor: async () => ({ id: 'creator_owner' }) },
    auditRepository: {
      appendEvent: async event => {
        auditEvents.push(event);
        return event;
      }
    }
  });
  const input = {
    sourceGenerationResultId: sourceResult.id,
    displayName: 'Mina',
    personalitySummary: 'Warm and confident',
    intendedUses: ['fashion'],
    idempotencyKey: 'create:job_character_sheet'
  };
  const created = await service.create(input, actor);
  const repeated = await service.create(input, actor);
  assert.equal(created.id, repeated.id);
  assert.equal(created.versions.length, 1);
  assert.equal(created.characterType, 'reusable_model');
  assert.deepEqual(created.destinationCapabilities, ['fashion_blueprint', 'scene_builder', 'playground_image']);
  assert.equal(created.versions[0].sourceMode, 'character-sheet');
  assert.deepEqual(created.versions[0].identityMetadata.ageRange, {
    attributeId: 'character.004',
    minimum: 24,
    maximum: 27
  });
  assert.doesNotMatch(JSON.stringify(created), /data:image\//);
  const updated = await service.updateMetadata(created.id, {
    personalitySummary: 'Calm and precise',
    version: created.recordVersion
  }, actor);
  assert.equal(updated.personalitySummary, 'Calm and precise');
  await assert.rejects(
    service.updateMetadata(created.id, { displayName: 'Stale', version: created.recordVersion }, actor),
    error => error.code === 'character_profile_version_conflict'
  );
  const newIdentity = await service.createIdentityVersion(created.id, {
    sourceGenerationResultId: replacementSource.id
  }, actor);
  assert.equal(newIdentity.versions.length, 2);
  assert.equal(newIdentity.activeVersionId, newIdentity.versions[0].id);
  assert.equal(newIdentity.status, 'draft');
  assert.equal(newIdentity.visibility, 'private');
  const blocked = await service.moderate(created.id, {
    action: 'block',
    reason: 'Policy review'
  }, { userId: 'usr_admin', username: 'admin', role: 'admin' });
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.visibility, 'private');
  assert.equal(auditEvents[0].action, 'character_profile_block');
});

test('canonical Reusable Model source enters review without a second generation', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-direct-casting-profile-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const profiles = new CharacterProfileRepository({ profilesFile: path.join(dir, 'profiles.json') });
  const versions = new CharacterProfileVersionRepository({ versionsFile: path.join(dir, 'versions.json') });
  const sourceResult = {
    id: 'job_direct_casting',
    ownerUserId: actor.userId,
    mode: 'character-sheet',
    imageUrl: '/outputs/job_direct_casting.png',
    provider: 'google',
    submodel: 'gemini-image',
    selections: { Gender: { id: 'female', group: 'Character', value: 'female' } },
    characterSheetConfig: {
      version: 1,
      characterType: 'reusable_model',
      sourceHeadshotIds: ['job_face_source'],
      castingCandidate: true,
      layout: { type: 'character-casting-three-view-v4' },
      castingLayoutVersion: 'character-casting-three-view-v4',
      uniformPolicyVersion: 'casting-uniform-gray-grid-v7',
      aspectRatio: '1:1',
      outputCount: 1
    }
  };
  const service = new CharacterProfileService({
    profileRepository: profiles,
    versionRepository: versions,
    generationResultRepository: {
      findByIdForOwner: async (id, ownerUserId) =>
        id === sourceResult.id && ownerUserId === actor.userId ? sourceResult : null
    },
    profileSharingService: { syncProjection: async () => null },
    usageService: { getStats: async () => ({ totalOutputs: 0, byUseCase: {} }) },
    creatorProfiles: { ensureProfileForActor: async () => ({ id: 'creator_owner' }) }
  });

  const created = await service.create({
    sourceGenerationResultId: sourceResult.id,
    displayName: 'Direct Casting Model',
    intendedUses: ['fashion']
  }, actor);

  assert.equal(created.status, 'review');
  assert.equal(created.versions[0].status, 'review');
  assert.equal(created.versions[0].castingExportGenerationResultId, sourceResult.id);
  assert.equal(created.versions[0].canonicalCastingExportAssetId, sourceResult.id);
  assert.equal(created.versions[0].canonicalHeadshotAssetId, 'job_face_source');
  assert.equal(created.versions[0].canonicalFaceAssetId, 'job_face_source');
  assert.equal(created.versions[0].castingExportLayoutVersion, 'character-casting-three-view-v4');
  assert.equal(created.versions[0].castingUniformPolicyVersion, 'casting-uniform-gray-grid-v7');
  assert.equal(
    created.displayImageUrl,
    `/api/character-profiles/${encodeURIComponent(created.id)}/media/sheet`
  );
  assert.equal(created.handoffAvailable, false);
});

test('Styled Character lifecycle stays outfit-bound and Scene-only', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-styled-character-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const profiles = new CharacterProfileRepository({ profilesFile: path.join(dir, 'profiles.json') });
  const versions = new CharacterProfileVersionRepository({ versionsFile: path.join(dir, 'versions.json') });
  const sourceResult = {
    id: 'job_styled_character',
    ownerUserId: actor.userId,
    mode: 'character-sheet',
    imageUrl: '/outputs/styled-character.png',
    selections: {
      Outfit: { id: 'dress_1', group: 'Clothing', value: 'tailored dress' }
    },
    characterSheetConfig: {
      version: 1,
      characterType: 'styled_character'
    }
  };
  const service = new CharacterProfileService({
    profileRepository: profiles,
    versionRepository: versions,
    generationResultRepository: {
      findByIdForOwner: async (id, ownerUserId) =>
        id === sourceResult.id && ownerUserId === actor.userId ? sourceResult : null
    },
    profileSharingService: { syncProjection: async () => null },
    usageService: { getStats: async () => ({ totalOutputs: 0, byUseCase: {} }) },
    creatorProfiles: { ensureProfileForActor: async () => ({ id: 'creator_owner' }) }
  });

  const created = await service.create({
    sourceGenerationResultId: sourceResult.id,
    displayName: 'Mina Styled',
    intendedUses: ['fashion', 'scene_story']
  }, actor);
  assert.equal(created.characterType, 'styled_character');
  assert.deepEqual(created.intendedUses, ['scene_story']);
  assert.deepEqual(created.destinationCapabilities, ['scene_builder', 'playground_image']);

  await service.approveStyled(created.id, {
    characterProfileVersionId: created.activeVersionId,
    consentDeclarationVersion: 'character-rights-v1'
  }, actor);
  const approved = await service.getOwnerDetail(created.id, actor);
  const directory = await service.listOwn({}, actor);
  assert.equal(approved.status, 'approved');
  assert.equal(approved.versions[0].status, 'approved');
  assert.equal(directory.items[0].handoffAvailable, true);
  assert.equal(directory.items[0].characterProfileVersionId, approved.activeVersionId);
});
