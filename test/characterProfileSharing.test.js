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

test('Character sharing rejects an unknown reuse policy instead of silently retaining owner-only', async () => {
  const service = new CharacterProfileSharingService({
    profileRepository: {
      findByIdForOwner: async () => ({
        id: 'charprof_policy',
        ownerUserId: owner.userId,
        status: 'approved',
        visibility: 'public',
        reusePolicy: 'owner_only'
      })
    }
  });

  await assert.rejects(
    service.updateSharing('charprof_policy', {
      visibility: 'public',
      reusePolicy: 'public_reuse'
    }, owner),
    error => error?.code === 'character_reuse_policy_invalid'
  );
});

test('Character sharing persists public reuse and synchronizes a reusable projection', async () => {
  let persistedPatch = null;
  let projectedRecord = null;
  const profile = {
    id: 'charprof_reusable',
    activeVersionId: 'charver_reusable',
    ownerUserId: owner.userId,
    status: 'approved',
    visibility: 'public',
    reusePolicy: 'owner_only',
    displayName: 'Reusable Mina',
    shortDescription: '',
    personalitySummary: '',
    intendedUses: ['scene_story'],
    characterType: 'reusable_model'
  };
  const service = new CharacterProfileSharingService({
    profileRepository: {
      findByIdForOwner: async () => profile,
      updateSystem: async (_id, patch) => {
        persistedPatch = patch;
        return { ...profile, ...patch, recordVersion: 2 };
      }
    },
    versionRepository: {
      findById: async () => ({
        id: 'charver_reusable',
        characterProfileId: profile.id,
        status: 'approved',
        canonicalCastingExportAssetId: 'job_casting'
      })
    },
    communityCharacterRepository: {
      upsertProfileProjection: async record => {
        projectedRecord = record;
        return record;
      }
    }
  });

  const result = await service.updateSharing(profile.id, {
    visibility: 'public',
    reusePolicy: 'public_reusable',
    rightsDeclarationAccepted: true
  }, owner);

  assert.equal(persistedPatch.reusePolicy, 'public_reusable');
  assert.equal(persistedPatch.rightsDeclarationVersion, 'character-public-reuse-rights-v1');
  assert.equal(projectedRecord.reusePolicy, 'use_as_character');
  assert.equal(projectedRecord.status, 'active');
  assert.equal(result.reusePolicy, 'public_reusable');
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

test('Creator profile character listing includes legacy projections owned by the profile user', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-legacy-character-owner-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const repository = new CommunityCharacterRepository({
    characterFile: path.join(dir, 'characters.json')
  });
  await repository.upsertProfileProjection({
    characterProfileId: 'charprof_legacy',
    displayName: 'Legacy Alice Character',
    visibility: 'public',
    status: 'active'
  }, { userId: 'usr_alice', username: 'alice' });

  const page = await repository.listPublic({
    filters: {
      creatorProfileId: 'creator_alice',
      ownerUserId: 'usr_alice'
    }
  });
  assert.equal(page.items.length, 1);

  const otherOwnerPage = await repository.listPublic({
    filters: {
      creatorProfileId: 'creator_bob',
      ownerUserId: 'usr_bob'
    }
  });
  assert.equal(otherOwnerPage.items.length, 0);
});

test('profile projection sync backfills its Creator profile relation', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-character-profile-link-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const repository = new CommunityCharacterRepository({
    characterFile: path.join(dir, 'characters.json')
  });
  const actor = { userId: 'usr_alice', username: 'alice' };
  await repository.upsertProfileProjection({
    characterProfileId: 'charprof_linked',
    displayName: 'Alice Character',
    visibility: 'public',
    status: 'active'
  }, actor);
  await repository.upsertProfileProjection({
    characterProfileId: 'charprof_linked',
    creatorProfileId: 'creator_alice',
    displayName: 'Alice Character',
    visibility: 'public',
    status: 'active'
  }, actor);

  const record = await repository.findByCharacterProfileId('charprof_linked');
  assert.equal(record.creatorProfileId, 'creator_alice');
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
      findByCharacterProfileIds: async ids => ids.includes(profile.id)
        ? [{
          id: 'job_featured',
          ownerUserId: viewer.userId,
          imageUrl: '/outputs/featured.png',
          characterProfileContext: { characterProfileId: profile.id }
        }]
        : []
    },
    communityPostRepository: {
      findPublicBySourceGenerationResultIds: async () => [{
          id: 'post_featured',
          ownerUserId: viewer.userId,
          sourceGenerationResultId: 'job_featured',
          imageUrl: '/outputs/featured.png',
          visibility: 'public',
          status: 'published'
        }]
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
    '/api/community/character-profiles/charprof_featured/featured-image'
  );
  assert.equal(
    page.items[0].thumbnailUrl,
    '/api/community/character-profiles/charprof_featured/thumbnail'
  );
});

test('automatic Character feature selection prefers active-version engagement over recency', async () => {
  const profile = {
    id: 'charprof_ranked',
    activeVersionId: 'charver_active',
    ownerUserId: owner.userId,
    displayName: 'Ranked Mina',
    intendedUses: ['fashion'],
    characterType: 'reusable_model',
    status: 'approved',
    visibility: 'public',
    reusePolicy: 'public_reusable',
    featuredImageMode: 'auto'
  };
  const version = {
    id: 'charver_active',
    characterProfileId: profile.id,
    status: 'approved',
    canonicalCastingExportAssetId: 'job_casting'
  };
  const service = new CharacterProfileSharingService({
    profileRepository: {
      listPublic: async () => ({ items: [profile], nextCursor: null, hasMore: false })
    },
    versionRepository: { findById: async () => version },
    generationResultRepository: {
      findByCharacterProfileIds: async () => [
        { id: 'job_new', ownerUserId: viewer.userId, imageUrl: '/outputs/new.png', characterProfileContext: { characterProfileId: profile.id } },
        {
          id: 'job_active',
          ownerUserId: viewer.userId,
          imageUrl: '/outputs/active.png',
          characterProfileContext: {
            characterProfileId: profile.id,
            characterProfileVersionId: version.id
          }
        }
      ]
    },
    communityPostRepository: {
      findPublicBySourceGenerationResultIds: async () => [
          publicPost('post_new', 'job_new', { likeCount: 99 }, '2026-08-03T12:00:00.000Z'),
          publicPost('post_active', 'job_active', { likeCount: 2 }, '2026-08-01T12:00:00.000Z')
        ],
      findPublicById: async () => null
    },
    usageService: { getStats: async () => ({ totalOutputs: 2, byUseCase: {} }) }
  });

  const page = await service.listPublic({}, viewer);
  assert.equal(page.items[0].displayImageSource, 'featured_work');
  assert.equal(page.items[0].displayImageUrl, '/api/community/character-profiles/charprof_ranked/featured-image');
});

test('owner can select an eligible public Character work and reset to automatic mode', async () => {
  const profile = {
    id: 'charprof_manual',
    ownerUserId: owner.userId,
    recordVersion: 4,
    featuredImageMode: 'auto',
    featuredWorkPostId: null
  };
  const updates = [];
  const service = new CharacterProfileSharingService({
    profileRepository: {
      findByIdForOwner: async () => profile,
      updateOwned: async (_id, patch) => {
        updates.push(patch);
        return {
          ...profile,
          featuredImageMode: patch.featuredImageMode,
          featuredImageSourceType: patch.featuredImageSourceType,
          featuredGenerationResultId: patch.featuredGenerationResultId,
          featuredWorkPostId: patch.featuredWorkPostId,
          recordVersion: profile.recordVersion + updates.length
        };
      }
    },
    versionRepository: { findById: async () => null },
    communityCharacterRepository: { upsertProfileProjection: async () => null },
    communityPostRepository: {
      findPublicById: async id => id === 'post_owned'
        ? { id, ownerUserId: viewer.userId, sourceGenerationResultId: 'job_owned' }
        : null
    },
    generationResultRepository: {
      findById: async () => ({
        id: 'job_owned',
        ownerUserId: viewer.userId,
        imageUrl: '/outputs/job_owned.png',
        characterProfileContext: { characterProfileId: profile.id }
      })
    }
  });

  const selected = await service.updateFeaturedImage(profile.id, {
    mode: 'manual',
    postId: 'post_owned',
    recordVersion: 4
  }, owner);
  assert.equal(selected.featuredImageMode, 'manual');
  assert.equal(selected.featuredWorkPostId, 'post_owned');

  const automatic = await service.updateFeaturedImage(profile.id, {
    mode: 'auto',
    recordVersion: selected.recordVersion
  }, owner);
  assert.equal(automatic.featuredImageMode, 'auto');
  assert.equal(automatic.featuredWorkPostId, null);
});

test('owner can feature an unshared same-owner Character result', async () => {
  const profile = {
    id: 'charprof_private_result',
    ownerUserId: owner.userId,
    recordVersion: 2,
    featuredImageMode: 'auto'
  };
  const service = new CharacterProfileSharingService({
    profileRepository: {
      findByIdForOwner: async () => profile,
      updateOwned: async (_id, patch) => ({ ...profile, ...patch, recordVersion: 3 })
    },
    versionRepository: { findById: async () => null },
    communityCharacterRepository: { upsertProfileProjection: async () => null },
    generationResultRepository: {
      findById: async id => ({
        id,
        ownerUserId: owner.userId,
        imageUrl: `/outputs/${id}.png`,
        characterProfileContext: { characterProfileId: profile.id }
      })
    }
  });

  const selected = await service.updateFeaturedImage(profile.id, {
    mode: 'manual',
    sourceType: 'generation_result',
    sourceId: 'job_private_owner',
    recordVersion: 2
  }, owner);

  assert.equal(selected.featuredImageSourceType, 'generation_result');
  assert.equal(selected.featuredGenerationResultId, 'job_private_owner');
  assert.equal(selected.featuredWorkPostId, null);
});

test('owner cannot feature another user result without a public Community post', async () => {
  const profile = { id: 'charprof_guarded', ownerUserId: owner.userId, recordVersion: 1 };
  const service = new CharacterProfileSharingService({
    profileRepository: { findByIdForOwner: async () => profile },
    generationResultRepository: {
      findById: async id => ({
        id,
        ownerUserId: viewer.userId,
        imageUrl: `/outputs/${id}.png`,
        characterProfileContext: { characterProfileId: profile.id }
      })
    }
  });

  await assert.rejects(
    service.updateFeaturedImage(profile.id, {
      mode: 'manual',
      sourceType: 'generation_result',
      sourceId: 'job_other_private',
      recordVersion: 1
    }, owner),
    error => error.code === 'character_featured_work_ineligible'
  );
});

test('featured image candidates combine same-owner results with other users public posts', async () => {
  const profile = { id: 'charprof_candidates', ownerUserId: owner.userId };
  const ownerResult = {
    id: 'job_owner',
    ownerUserId: owner.userId,
    imageUrl: '/outputs/job_owner.png',
    timestamp: Date.parse('2026-08-04T01:00:00.000Z'),
    characterProfileContext: { characterProfileId: profile.id }
  };
  const sharedResult = {
    id: 'job_shared',
    ownerUserId: viewer.userId,
    imageUrl: '/outputs/job_shared.png',
    timestamp: Date.parse('2026-08-04T00:00:00.000Z'),
    characterProfileContext: { characterProfileId: profile.id }
  };
  const privateOtherResult = {
    id: 'job_private_other',
    ownerUserId: viewer.userId,
    imageUrl: '/outputs/job_private_other.png',
    characterProfileContext: { characterProfileId: profile.id }
  };
  const service = new CharacterProfileSharingService({
    profileRepository: { findByIdForOwner: async () => profile },
    generationResultRepository: {
      findByCharacterProfileIds: async () => [ownerResult, sharedResult, privateOtherResult]
    },
    communityPostRepository: {
      findPublicBySourceGenerationResultIds: async () => [
        publicPost('post_shared', sharedResult.id, {}, '2026-08-04T00:30:00.000Z')
      ]
    }
  });

  const page = await service.listFeaturedImageCandidates(profile.id, {}, owner);
  assert.deepEqual(page.items.map(item => item.id), [
    'generation_result:job_owner',
    'community_post:post_shared'
  ]);
  assert.deepEqual(page.items.map(item => item.ownership), ['owner', 'community']);
});

function publicPost(id, sourceGenerationResultId, engagementSummary, createdAt) {
  return {
    id,
    ownerUserId: owner.userId,
    ownerUsername: 'owner',
    sourceGenerationResultId,
    imageUrl: `/outputs/${id}.png`,
    visibility: 'public',
    status: 'published',
    engagementSummary,
    createdAt
  };
}
