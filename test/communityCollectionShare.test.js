import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunityCollectionShareService } from '../server/domain/community/CommunityCollectionShareService.js';

const alice = {
  userId: 'usr_alice',
  username: 'user_alice',
  role: 'user'
};
const bob = {
  userId: 'usr_bob',
  username: 'user_bob',
  role: 'user'
};

function fixture() {
  const posts = [];
  const collection = {
    id: 'col_1',
    ownerUserId: alice.userId,
    status: 'active',
    name: 'Editorial looks',
    description: 'A selected image series',
    story: '',
    coverJobId: 'job_2',
    jobIds: ['job_1', 'job_2']
  };
  const generations = new Map([
    ['job_1', {
      id: 'job_1',
      ownerUserId: alice.userId,
      status: 'completed',
      imageUrl: '/outputs/one.png',
      provider: 'gemini',
      submodel: 'image-fast',
      timestamp: 100
    }],
    ['job_2', {
      id: 'job_2',
      ownerUserId: alice.userId,
      status: 'completed',
      imageUrl: '/outputs/two.png',
      thumbnailUrl: '/outputs/two-thumb.png',
      provider: 'openai',
      submodel: 'gpt-image',
      timestamp: 200
    }]
  ]);
  const service = new CommunityCollectionShareService({
    collectionRepository: {
      findByIdForOwner: async (id, ownerUserId) =>
        id === collection.id && ownerUserId === collection.ownerUserId
          ? structuredClone(collection)
          : null
    },
    generationRepository: {
      findByIdForOwner: async (id, ownerUserId) => {
        const item = generations.get(id);
        return item?.ownerUserId === ownerUserId ? structuredClone(item) : null;
      }
    },
    postRepository: {
      readAll: async () => structuredClone(posts),
      create: async (input, actor) => {
        const post = {
          ...structuredClone(input),
          id: 'post_collection_1',
          ownerUserId: actor.userId,
          ownerUsername: actor.username,
          status: 'published',
          createdAt: '2026-07-26T00:00:00.000Z'
        };
        posts.push(post);
        return structuredClone(post);
      }
    },
    profileService: {
      ensureProfileForActor: async () => ({ id: 'profile_alice' })
    },
    classificationService: {
      classifyGeneration: async () => ({ suggestions: [] }),
      preparePublishTaxonomy: async () => ({
        officialTags: [],
        customTags: [],
        categoryCodes: [],
        trendingCategoryCodes: [],
        taxonomyAssignments: [],
        taxonomyVersion: 'test',
        taxonomyReviewStatus: 'unclassified',
        taxonomyConfidence: 0
      })
    }
  });
  return { service, posts };
}

test('owner shares an immutable Collection snapshot without public source IDs', async () => {
  const { service, posts } = fixture();
  const publicPost = await service.publish('col_1', {}, alice);

  assert.equal(publicPost.postType, 'collection');
  assert.equal(publicPost.collectionSnapshot.itemCount, 2);
  assert.equal(
    publicPost.collectionSnapshot.items[0].imageUrl,
    '/api/community/posts/post_collection_1/collection-items/item_001/image'
  );
  assert.equal(publicPost.imageUrl, '/api/scene-templates/shared/post_collection_1/image');
  assert.equal(JSON.stringify(publicPost).includes('job_'), false);
  assert.equal(JSON.stringify(publicPost).includes('/outputs/'), false);
  assert.equal(JSON.stringify(publicPost).includes('sourceCollectionId'), false);

  assert.equal(posts[0].sourceCollectionId, 'col_1');
  assert.equal(posts[0].collectionSnapshot.items[1].imageUrl, '/outputs/two.png');
  assert.equal(posts[0].imageUrl, '/outputs/two.png');
});

test('another actor cannot share the owner Collection', async () => {
  const { service } = fixture();
  await assert.rejects(
    service.publish('col_1', {}, bob),
    error => error.code === 'collection_not_found' && error.statusCode === 404
  );
});
