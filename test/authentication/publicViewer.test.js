import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunityPostAccessService } from '../../server/domain/community/CommunityPostAccessService.js';
import { CommunityGalleryService } from '../../server/domain/community/CommunityGalleryService.js';
import { CommunityTemplateDetailService } from '../../server/domain/community/CommunityTemplateDetailService.js';
import { CreatorProfilePageService } from '../../server/domain/community/CreatorProfilePageService.js';
import { CharacterProfileSharingService } from '../../server/domain/character-profiles/CharacterProfileSharingService.js';

const owner = { userId: 'creator', username: 'creator', role: 'user' };
const published = { id: 'post', ownerUserId: owner.userId, visibility: 'public', status: 'published', postType: 'image', imageUrl: '/outputs/private-origin.png' };
const page = items => ({ items, nextCursor: null, hasMore: false });

test('null viewer receives sanitized published post/media but no owner or action authority', async () => {
  let record = { ...published };
  const service = new CommunityPostAccessService({ postRepository: { findById: async () => record }, generationRepository: { findById: async () => null } });
  const result = await service.getPublicPost('post', null);
  assert.equal(result.viewer.isOwner, false);
  assert.equal(result.viewer.permissions.canReport, false);
  assert.equal(result.viewer.permissions.canVoteComparison, false);
  assert.ok(!JSON.stringify(result).includes('/outputs/'));
  assert.ok((await service.getPublicMediaFile('post', 'image', null)).endsWith('private-origin.png'));
  for (const delta of [{ visibility: 'private' }, { visibility: 'members_only' }, { status: 'hidden' }, { status: 'draft' }]) {
    record = { ...published, ...delta };
    await assert.rejects(service.getPublicPost('post', null), { statusCode: 404 });
    await assert.rejects(service.getPublicMediaFile('post', 'image', null), { statusCode: 404 });
  }
  record = { ...published, visibility: 'private' };
  assert.equal((await service.getPublicPost('post', owner)).viewer.isOwner, true);
  await assert.rejects(service.getPostForTemplateUse('post', null), { code: 'actor_context_required' });
  await assert.rejects(service.updatePresentation('post', {}, null), { code: 'actor_context_required' });
});

test('null viewer accesses published Gallery and Character projections while private handoffs stay denied', async () => {
  let item = { id: 'gallery', ownerUserId: owner.userId, visibility: 'public', status: 'active', sourceCommunityPostId: 'post' };
  const repository = { listPublic: async () => page([item]), findById: async () => item };
  const service = new CommunityGalleryService({ galleryRepository: repository, characterRepository: repository,
    profileRepository: { findByHandle: async () => ({ id: 'profile', userId: owner.userId }) },
    postRepository: { findById: async () => published },
    postAccessService: { getPublicMediaFile: async (_id, _kind, actor) => { assert.equal(actor, null); return 'published-media'; } }, profileCharacterService: null });
  assert.equal((await service.listGalleryByHandle('creator', {}, null)).items.length, 1);
  assert.equal((await service.listCharactersByHandle('creator', {}, null)).items.length, 1);
  assert.equal(await service.getGalleryMediaFile('gallery', 'image', null), 'published-media');
  item = { ...item, visibility: 'private' };
  await assert.rejects(service.getGalleryMediaFile('gallery', 'image', null), { statusCode: 404 });
  assert.equal((await service.requireVisibleItem(repository, 'gallery', owner)).id, 'gallery');
  await assert.rejects(service.createGalleryHandoff('gallery', null), { code: 'actor_context_required' });
  await assert.rejects(service.createCharacterHandoff('gallery', null), { code: 'actor_context_required' });
});

test('public template preview/detail accepts null and refuses private source without exposing raw work', async () => {
  let root = { ...published, postType: 'template', templateId: 'template' };
  const service = new CommunityTemplateDetailService({ postRepository: { readAll: async () => [root], findById: async () => root },
    generationRepository: { findByIds: async () => [] } });
  assert.equal((await service.getPreviews({ postIds: 'post' }, null)).items.length, 1);
  const result = await service.getForPost('post', {}, null);
  assert.equal(result.template.id, 'post');
  assert.ok(!JSON.stringify(result).includes('/outputs/'));
  root = { ...root, visibility: 'private' };
  assert.equal((await service.getPreviews({ postIds: 'post' }, null)).items.length, 0);
  await assert.rejects(service.getForPost('post', {}, null), { statusCode: 404 });
});

test('creator page uses public rows for null viewer and preserves owner management', async () => {
  const service = new CreatorProfilePageService({
    profileRepository: { findById: async () => ({ id: 'profile', userId: owner.userId, handle: 'creator', presentation: {} }) },
    postRepository: { listPublic: async (_q, actor) => { assert.equal(actor, null); return page([published]); }, findByOwner: async () => page([published, { ...published, id: 'private' }]) },
    profileService: { getPublicProfileByHandle: async (_h, actor) => ({ id: 'profile', handle: 'creator', displayName: 'Creator', viewer: { isOwner: Boolean(actor), isFollowing: false }, presentation: {} }) },
    galleryService: { listGalleryByHandle: async () => page([]), listCharactersByHandle: async () => page([]) }
  });
  const guest = await service.getPage('profile', {}, null);
  assert.equal(guest.management, null);
  assert.equal(guest.viewer.canFollow, false);
  assert.equal(guest.viewer.canReport, false);
  assert.equal(guest.viewer.canEditProfile, false);
  const own = await service.getPage('profile', {}, owner);
  assert.ok(own.management);
  assert.equal(own.viewer.canEditProfile, true);
});

test('approved Character null viewer has sanitized detail and cannot invoke handoff or owner edits', async () => {
  let profile = { id: 'character', ownerUserId: owner.userId, activeVersionId: 'version', status: 'approved', visibility: 'public', reusePolicy: 'public_reusable', intendedUses: [], displayName: 'Character', recordVersion: 2 };
  const service = new CharacterProfileSharingService({
    profileRepository: { findById: async () => profile, listPublic: async () => page([profile]) },
    versionRepository: { findById: async () => ({ id: 'version', characterProfileId: 'character', status: 'approved' }) },
    usageService: { getStats: async () => ({}) },
    generationResultRepository: { findByCharacterProfileIds: async () => [], findByIds: async () => [] },
    communityPostRepository: { listPublic: async () => page([]), readAll: async () => [], findPublicBySourceGenerationResultIds: async () => [] }
  });
  const result = await service.getPublicDetail('character', null);
  assert.equal(result.isOwner, false); assert.equal(result.recordVersion, undefined);
  assert.equal(result.handoffAvailable, false);
  assert.equal((await service.listPublic({}, null)).items.length, 1);
  await assert.rejects(service.createHandoff('character', {}, null), { code: 'actor_context_required' });
  await assert.rejects(service.updateSharing('character', {}, null), { code: 'actor_context_required' });
  for (const delta of [{ visibility: 'private' }, { status: 'draft' }, { status: 'deleted' }]) {
    profile = { ...profile, visibility: 'public', status: 'approved', ...delta };
    await assert.rejects(service.getPublicDetail('character', null), { statusCode: 404 });
    await assert.rejects(service.getMediaFile('character', null), { statusCode: 404 });
  }
});
