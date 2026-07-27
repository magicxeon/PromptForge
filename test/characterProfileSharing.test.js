import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { canReuseCharacterProfile, reuseStatus } from '../server/domain/character-profiles/characterProfilePolicy.js';
import { CharacterProfileSharingService } from '../server/domain/character-profiles/CharacterProfileSharingService.js';
import { CommunityCharacterRepository } from '../server/repositories/community/CommunityCharacterRepository.js';

const owner = { userId: 'usr_owner' };
const viewer = { userId: 'usr_viewer' };
const approved = {
  ownerUserId: owner.userId,
  status: 'approved',
  visibility: 'public',
  reusePolicy: 'public_reusable'
};

test('public reusable Character permits viewer handoff while view-only does not', () => {
  assert.equal(canReuseCharacterProfile(approved, viewer), true);
  assert.equal(reuseStatus(approved, viewer), 'available');
  const viewOnly = { ...approved, reusePolicy: 'view_only' };
  assert.equal(canReuseCharacterProfile(viewOnly, viewer), false);
  assert.equal(reuseStatus(viewOnly, viewer), 'view_only');
  assert.equal(canReuseCharacterProfile(viewOnly, owner), true);
});

test('public Character Profile projection is selectable without a legacy handoff snapshot', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-character-projection-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const repository = new CommunityCharacterRepository({
    characterFile: path.join(dir, 'characters.json')
  });
  await repository.upsertProfileProjection({
    characterProfileId: 'charprof_1',
    characterProfileVersionId: 'charver_1',
    displayName: 'Mina',
    canonicalCastingExportAssetId: 'job_casting',
    reusePolicy: 'use_as_character',
    visibility: 'public',
    status: 'active'
  }, { userId: 'usr_owner', username: 'owner' });
  const page = await repository.listPublic();
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].handoffAvailable, true);
});

test('public Styled Character projection is selectable in Scene without a Casting Export', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-styled-projection-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const repository = new CommunityCharacterRepository({
    characterFile: path.join(dir, 'characters.json')
  });
  await repository.upsertProfileProjection({
    characterProfileId: 'charprof_styled',
    characterProfileVersionId: 'charver_styled',
    displayName: 'Mina Styled',
    characterType: 'styled_character',
    canonicalCharacterSheetAssetId: 'job_styled_sheet',
    destinationCapabilities: ['scene_builder'],
    outfitBehavior: 'preserve',
    reusePolicy: 'use_as_character',
    visibility: 'public',
    status: 'active'
  }, { userId: 'usr_owner', username: 'owner' });

  const page = await repository.listPublic();
  assert.equal(page.items[0].handoffAvailable, true);
  assert.deepEqual(page.items[0].destinationCapabilities, ['scene_builder']);
  assert.equal(page.items[0].outfitBehavior, 'preserve');
  assert.equal(page.items[0].canonicalCastingExportAssetId, null);
});

test('public Character summary prefers its newest public work and retains canonical fallback', async () => {
  const profile = {
    id: 'charprof_featured',
    activeVersionId: 'charver_featured',
    ownerUserId: owner.userId,
    ownerUsernameSnapshot: 'owner',
    displayName: 'Mina',
    personalitySummary: 'Calm and precise',
    intendedUses: ['fashion'],
    characterType: 'reusable_model',
    status: 'approved',
    visibility: 'public',
    reusePolicy: 'public_reusable'
  };
  const version = {
    id: 'charver_featured',
    characterProfileId: profile.id,
    status: 'approved',
    canonicalCastingExportAssetId: 'job_casting',
    castingFrontPreviewUrl: '/outputs/front.webp'
  };
  const service = new CharacterProfileSharingService({
    profileRepository: {
      listPublic: async () => ({ items: [profile], nextCursor: null, hasMore: false })
    },
    versionRepository: {
      findById: async id => id === version.id ? version : null
    },
    generationResultRepository: {
      findByIds: async ids => ids.includes('job_featured')
        ? [{
          id: 'job_featured',
          characterProfileContext: { characterProfileId: profile.id }
        }]
        : []
    },
    communityPostRepository: {
      listPublic: async () => ({
        items: [{
          id: 'post_featured',
          sourceGenerationResultId: 'job_featured',
          imageUrl: '/outputs/featured.png',
          visibility: 'public',
          status: 'published'
        }],
        nextCursor: null,
        hasMore: false
      })
    },
    usageService: {
      getStats: async () => ({ totalOutputs: 4, byUseCase: { fashion: 4 } })
    }
  });

  const page = await service.listPublic({}, viewer);
  assert.equal(page.items[0].status, 'approved');
  assert.equal(page.items[0].displayImageSource, 'featured_work');
  assert.equal(
    page.items[0].displayImageUrl,
    '/api/scene-templates/shared/post_featured/thumbnail'
  );
  assert.equal(
    page.items[0].thumbnailUrl,
    '/api/community/character-profiles/charprof_featured/thumbnail'
  );
});
