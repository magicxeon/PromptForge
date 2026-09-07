import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { canReuseCharacterProfile, reuseStatus } from '../server/domain/character-profiles/characterProfilePolicy.js';
import { CharacterProfileSharingService } from '../server/domain/character-profiles/CharacterProfileSharingService.js';
import { CharacterProfileService } from '../server/domain/character-profiles/CharacterProfileService.js';
import { CommunityCharacterRepository } from '../server/repositories/community/CommunityCharacterRepository.js';
import { CommunityPostRepository } from '../server/repositories/community/CommunityPostRepository.js';

const owner = { userId: 'usr_owner' };
const viewer = { userId: 'usr_viewer' };
const approved = {
  ownerUserId: owner.userId,
  status: 'approved',
  visibility: 'public',
  reusePolicy: 'public_reusable'
};

test('owner Character list shares manual artwork with public and owner detail using one page batch', async () => {
  const fixture = ownerFeaturedFixture();
  const before = structuredClone(fixture.profile);
  const recent = { ...fixture.posts[0], id: 'recent', sourceGenerationResultId: 'recent-job', createdAt: '2026-09-07', engagementSummary: { likeCount: 99 } };
  fixture.posts.push(recent);
  fixture.results.push({ ...fixture.results[0], id: 'recent-job', timestamp: Date.parse('2026-09-07') });
  const page = await fixture.service.listOwn({ limit: 2 }, owner);
  assert.equal(fixture.historyReads(), 1);
  assert.equal(fixture.postReads(), 1);
  assert.equal(page.nextCursor, 'next-page');
  assert.equal(page.hasMore, true);
  assert.equal(page.items.length, 2);
  assert.equal(page.items[0].displayImageSource, 'owner_selected_work');
  assert.equal(page.items[0].featuredWorkPostId, 'selected-work');
  assert.equal(page.items[0].featuredImageMode, 'manual');
  assert.equal(page.items[0].characterProfileVersionId, 'version');
  assert.equal(page.items[0].imageUrl, '/api/character-profiles/character/media/image');
  assert.equal(page.items[1].displayImageSource, 'owner_canonical_sheet');
  const publicPage = await fixture.sharing.listPublic({}, viewer);
  const detail = await fixture.service.getOwnerDetail(fixture.profile.id, owner);
  assert.equal(page.items[0].displayImageUrl, publicPage.items[0].displayImageUrl);
  assert.equal(page.items[0].displayImageUrl, detail.displayImageUrl);
  assert.equal(publicPage.items[0].displayImageSource, 'owner_selected_work');
  assert.deepEqual(fixture.profile, before);
  assert.ok(!JSON.stringify(page).includes('/outputs/'));
  assert.ok(!JSON.stringify(publicPage).includes('/outputs/'));
});

for (const restriction of [
  { visibility: 'private' }, { visibility: 'unlisted' }, { status: 'hidden' },
  { status: 'removed' }, { deletedAt: '2026-09-07' }
]) {
  test(`owner Character list and public projection stop featuring inaccessible manual work: ${JSON.stringify(restriction)}`, async () => {
    const fixture = ownerFeaturedFixture();
    assert.equal((await fixture.service.listOwn({}, owner)).items[0].displayImageSource, 'owner_selected_work');
    Object.assign(fixture.posts[0], restriction);
    const ownPage = await fixture.service.listOwn({}, owner);
    const publicPage = await fixture.sharing.listPublic({}, viewer);
    assert.equal(ownPage.items[0].displayImageSource, 'owner_canonical_sheet');
    assert.equal(publicPage.items[0].displayImageSource, 'canonical_sheet');
    assert.ok(!ownPage.items[0].displayImageUrl.includes('featured-image'));
    assert.ok(!publicPage.items[0].displayImageUrl.includes('featured-image'));
    assert.equal(fixture.profile.featuredWorkPostId, 'selected-work');
  });
}

test('owner Character list retains authorized private Character artwork without granting public access', async () => {
  const fixture = ownerFeaturedFixture();
  fixture.profile.visibility = 'private';
  const ownPage = await fixture.service.listOwn({}, owner);
  assert.equal(ownPage.items[0].displayImageSource, 'owner_selected_work');
  await assert.rejects(fixture.sharing.getPublicDetail(fixture.profile.id, viewer), { code: 'character_profile_not_found' });
  assert.equal((await fixture.service.listOwn({}, viewer)).items.length, 0);
});

function ownerFeaturedFixture() {
  const profile = { ...approved, id: 'character', activeVersionId: 'version', displayName: 'Manual character',
    characterType: 'styled_character', intendedUses: ['scene_story'], featuredImageMode: 'manual',
    featuredImageSourceType: 'community_post', featuredWorkPostId: 'selected-work' };
  const profiles = [profile, { ...approved, id: 'no-work', activeVersionId: 'other-version', displayName: 'No work',
    characterType: 'styled_character', intendedUses: ['scene_story'] }];
  const versions = profiles.map(item => ({ id: item.activeVersionId, characterProfileId: item.id,
    status: 'approved', canonicalCharacterSheetAssetId: `sheet-${item.id}` }));
  const results = [{ id: 'selected-job', ownerUserId: viewer.userId, imageUrl: '/outputs/private-source.png',
    characterProfileContext: { characterProfileId: profile.id, characterProfileVersionId: 'version' } }];
  const posts = [{ id: 'selected-work', sourceGenerationResultId: 'selected-job', ownerUserId: viewer.userId,
    imageUrl: '/outputs/private-source.png', visibility: 'public', status: 'published', createdAt: '2026-09-01' }];
  let historyReads = 0;
  let postReads = 0;
  const postRepository = new CommunityPostRepository();
  // Exercise the real public-post filter without reading or writing runtime storage.
  postRepository.readAll = async () => { postReads++; return posts; };
  const profileRepository = {
    findByOwner: async actorId => ({ items: profiles.filter(item => item.ownerUserId === actorId), nextCursor: 'next-page', hasMore: true }),
    listPublic: async () => ({ items: profiles.filter(item => item.visibility === 'public'), nextCursor: null, hasMore: false }),
    findById: async id => profiles.find(item => item.id === id),
    findByIdForOwner: async (id, actorId) => profiles.find(item => item.id === id && item.ownerUserId === actorId)
  };
  const versionRepository = {
    findById: async id => versions.find(item => item.id === id),
    listByProfileId: async id => versions.filter(item => item.characterProfileId === id)
  };
  const usageService = { getStats: async () => ({ totalOutputs: 0, byUseCase: {} }) };
  const sharing = new CharacterProfileSharingService({ profileRepository, versionRepository, usageService,
    communityPostRepository: postRepository,
    generationResultRepository: { findByCharacterProfileIds: async ids => {
      historyReads++;
      return results.filter(item => ids.includes(item.characterProfileContext.characterProfileId));
    } }
  });
  const service = new CharacterProfileService({ profileRepository, versionRepository, usageService, profileSharingService: sharing });
  return { service, sharing, profile, posts, results, historyReads: () => historyReads, postReads: () => postReads };
}

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
    destinationCapabilities: ['scene_builder', 'playground_image'],
    outfitBehavior: 'preserve',
    reusePolicy: 'use_as_character',
    visibility: 'public',
    status: 'active'
  }, { userId: 'usr_owner', username: 'owner' });

  const page = await repository.listPublic();
  assert.equal(page.items[0].handoffAvailable, true);
  assert.deepEqual(page.items[0].destinationCapabilities, ['scene_builder', 'playground_image']);
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
