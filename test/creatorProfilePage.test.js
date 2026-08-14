import assert from 'node:assert/strict';
import test from 'node:test';
import { CreatorProfilePageService } from '../server/domain/community/CreatorProfilePageService.js';

const owner = {
  userId: 'usr_owner',
  username: 'owner',
  displayName: 'Owner',
  role: 'creator'
};
const viewer = {
  userId: 'usr_viewer',
  username: 'viewer',
  displayName: 'Viewer',
  role: 'user'
};
const profile = {
  id: 'creator_owner',
  userId: owner.userId,
  handle: 'owner',
  displayName: 'Owner Studio',
  bio: 'Fashion creator',
  status: 'active',
  recordVersion: 3,
  presentation: {
    profileTheme: 'creative',
    headline: 'Commercial fashion and character design',
    creatorRoles: ['fashion_creator'],
    locationText: 'Bangkok',
    websiteUrl: 'https://example.com/',
    languageCodes: ['th', 'en'],
    contentCategoryCodes: ['fashion'],
    coverPostId: 'post_image',
    featuredPostIds: ['post_image'],
    featuredCharacterProfileIds: ['character_one'],
    featuredTemplatePostIds: ['post_template'],
    sectionOrder: ['featured', 'characters', 'templates', 'comparisons']
  },
  createdAt: '2026-01-01T00:00:00.000Z'
};
const posts = [
  publicPost('post_image', 'image'),
  publicPost('post_template', 'template'),
  publicPost('post_comparison', 'comparison'),
  publicPost('post_collection', 'collection')
];
const ownerPosts = [
  ...posts,
  {
    ...publicPost('post_template_setup', 'template'),
    status: 'draft',
    templateId: 'tmpl_setup',
    templateVersionId: 'tmplv_setup'
  }
];

function createService() {
  return new CreatorProfilePageService({
    profileRepository: {
      findById: async id => id === profile.id ? structuredClone(profile) : null,
      findByHandle: async handle => handle === profile.handle ? structuredClone(profile) : null
    },
    postRepository: {
      listPublic: async () => ({
        items: structuredClone(posts),
        totalApprox: posts.length,
        hasMore: false,
        nextCursor: null
      }),
      findByOwner: async () => ({
        items: structuredClone(ownerPosts),
        totalApprox: ownerPosts.length,
        hasMore: false,
        nextCursor: null
      })
    },
    profileService: {
      getPublicProfileByHandle: async (_handle, actor) => ({
        id: profile.id,
        handle: profile.handle,
        displayName: profile.displayName,
        bio: profile.bio,
        presentation: structuredClone(profile.presentation),
        badgeCodes: [],
        followerCount: 12,
        followingCount: 4,
        publicPostCount: posts.length,
        viewer: {
          isOwner: actor.userId === owner.userId,
          isFollowing: actor.userId === viewer.userId
        },
        recordVersion: actor.userId === owner.userId ? profile.recordVersion : undefined,
        createdAt: profile.createdAt
      })
    },
    galleryService: {
      listGalleryByHandle: async () => page([{
        id: 'gallery_one',
        title: 'Gallery image',
        imageUrl: '/gallery/image'
      }]),
      listCharactersByHandle: async () => page([{
        id: 'character_one',
        displayName: 'Mina',
        imageUrl: '/characters/mina'
      }])
    }
  });
}

test('creator profile page returns a bounded overview and owner management context', async () => {
  const model = await createService().getPage('owner', { tab: 'overview' }, owner);
  assert.equal(model.selectedTab, 'overview');
  assert.equal(model.profile.coverImageUrl, '/api/scene-templates/shared/post_image/image');
  assert.equal(model.profile.profileTheme, 'creative');
  assert.equal(model.counts.publicCharacters, 1);
  assert.equal(model.counts.templates, 2);
  assert.equal(model.overview.featured.items[0].id, 'post_image');
  assert.equal(model.overview.characters.items[0].id, 'character_one');
  assert.equal(model.viewer.canManageContent, true);
  assert.equal(model.management.recordVersion, 3);
});

test('creator profile public page excludes owner management and selects a deep-linked tab', async () => {
  const model = await createService().getPage('owner', { tab: 'templates' }, viewer);
  assert.equal(model.selectedTab, 'templates');
  assert.deepEqual(model.tabData.page.items.map(item => item.id), ['post_template']);
  assert.equal(model.viewer.canManageContent, false);
  assert.equal(model.management, null);
});

test('owner Templates tab includes setup drafts without exposing them to another viewer', async () => {
  const service = createService();
  const ownerPage = await service.getPage('owner', { tab: 'templates' }, owner);
  const viewerPage = await service.getPage('owner', { tab: 'templates' }, viewer);

  assert.deepEqual(ownerPage.tabData.page.items.map(item => item.id), [
    'post_template',
    'post_template_setup'
  ]);
  assert.equal(ownerPage.tabData.page.items[1].status, 'draft');
  assert.deepEqual(viewerPage.tabData.page.items.map(item => item.id), ['post_template']);
});

test('creator profile page resolves the immutable profile id used by canonical routes', async () => {
  const model = await createService().getPage(profile.id, { tab: 'overview' }, viewer);
  assert.equal(model.profile.id, profile.id);
  assert.equal(model.profile.handle, profile.handle);
});

function publicPost(id, postType) {
  return {
    id,
    postType,
    title: `${postType} post`,
    imageUrl: `/images/${id}.png`,
    thumbnailUrl: `/images/${id}-thumb.png`,
    engagementSummary: {
      likeCount: 2,
      remixSuccessCount: 1,
      comparisonVoteCount: postType === 'comparison' ? 3 : 0
    },
    createdAt: '2026-01-02T00:00:00.000Z'
  };
}

function page(items) {
  return {
    items,
    totalApprox: items.length,
    hasMore: false,
    nextCursor: null
  };
}
