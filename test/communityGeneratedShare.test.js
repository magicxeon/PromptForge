import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunityShareService } from '../server/domain/community/CommunityShareService.js';
import { buildCommunityPostPublicView } from '../server/domain/community/communityPostPublicView.js';

const alice = {
  userId: 'usr_alice',
  username: 'user_alice',
  role: 'creator',
  activeCreatorProfileId: 'creator_alice'
};
const bob = { userId: 'usr_bob', username: 'user_bob', role: 'user' };

function createService(generation) {
  const posts = [];
  const generationRepository = {
    async findByIdForOwner(id, ownerUserId) {
      return id === generation.id && ownerUserId === generation.ownerUserId
        ? structuredClone(generation)
        : null;
    }
  };
  const postRepository = {
    async create(input, actor) {
      const post = {
        ...structuredClone(input),
        id: `post_${posts.length + 1}`,
        ownerUserId: actor.userId,
        ownerUsername: actor.username,
        status: 'published'
      };
      posts.push(post);
      return structuredClone(post);
    }
  };
  const classificationService = {
    async classifyGeneration() {
      return { suggestions: [] };
    },
    async preparePublishTaxonomy() {
      return {
        officialTags: [],
        customTags: [],
        categoryCodes: [],
        trendingCategoryCodes: [],
        taxonomyAssignments: []
      };
    }
  };
  return {
    service: new CommunityShareService({
      generationRepository,
      postRepository,
      classificationService
    }),
    posts
  };
}

function genericGeneration() {
  return {
    id: 'job_generic',
    ownerUserId: alice.userId,
    ownerUsername: alice.username,
    imageUrl: '/outputs/job_generic.png',
    thumbnailUrl: '/outputs/job_generic_thumb.png',
    prompt: 'Fashion portrait in a bright studio, crisp clothing detail. Negative prompt: private avoid list',
    provider: 'gemini',
    submodel: 'image-fast',
    mode: 'headshot',
    selections: {
      faceShape: 'oval',
      referenceImage: 'data:image/png;base64,PRIVATE',
      thumbnailUrl: '/outputs/private-reference.png'
    },
    timestamp: Date.parse('2026-07-26T10:00:00.000Z')
  };
}

test('generic generated result creates an owner-only sanitized share draft', async () => {
  const generation = genericGeneration();
  const { service } = createService(generation);
  const draft = await service.createGeneratedShareDraft(generation.id, alice);

  assert.equal(draft.sourceType, 'generated_image');
  assert.equal(draft.creatorProfileId, 'creator_alice');
  assert.equal(draft.sceneTemplateSnapshot, null);
  assert.equal(draft.sharedPromptSnapshot.publicPromptText, generation.prompt);
  assert.equal(draft.providerModelSnapshot.providerId, 'gemini');
  assert.equal(draft.workflowSnapshot.structuredSelections.referenceImage, undefined);
  assert.equal(draft.workflowSnapshot.structuredSelections.thumbnailUrl, undefined);
  await assert.rejects(
    () => service.createGeneratedShareDraft(generation.id, bob),
    /not available/
  );
});

test('partial prompt publishing stores only a bounded public-safe excerpt', async () => {
  const generation = genericGeneration();
  const { service, posts } = createService(generation);
  const draft = await service.createGeneratedShareDraft(generation.id, alice);
  const post = await service.publishGeneratedImageShare(draft.id, {
    title: 'Studio fashion',
    promptVisibility: 'partial',
    visibility: 'public'
  }, alice);

  assert.equal(posts.length, 1);
  assert.equal(post.sharedPromptSnapshot.publicPromptText.includes('private avoid list'), false);
  assert.deepEqual(post.workflowSnapshot, {
    schemaVersion: 1,
    mode: 'headshot',
    authoringMode: 'guided'
  });
  assert.equal(post.reusePolicy, 'view_only');
  assert.equal(post.postType, 'image');
  assert.equal(buildCommunityPostPublicView(post).promptPreview, 'Fashion portrait in a bright studio, crisp clothing detail.');
});

test('private prompt publishing removes prompt and workflow data from the immutable post snapshot', async () => {
  const generation = genericGeneration();
  const { service } = createService(generation);
  const draft = await service.createGeneratedShareDraft(generation.id, alice);
  const post = await service.publishGeneratedImageShare(draft.id, {
    title: 'Image only',
    promptVisibility: 'private',
    visibility: 'unlisted'
  }, alice);

  assert.equal(post.sharedPromptSnapshot.publicPromptText, null);
  assert.deepEqual(post.workflowSnapshot, {});
  assert.equal(post.sceneTemplateSnapshot, null);
  assert.equal(post.visibility, 'unlisted');
  assert.equal(buildCommunityPostPublicView(post).promptPreview, null);
});

test('generic generated result cannot claim Remix Only without a Scene Builder template', async () => {
  const generation = genericGeneration();
  const { service } = createService(generation);
  const draft = await service.createGeneratedShareDraft(generation.id, alice);

  await assert.rejects(
    () => service.publishGeneratedImageShare(draft.id, {
      title: 'Invalid remix',
      promptVisibility: 'remix_only'
    }, alice),
    /requires a guided Scene Builder template/
  );
});
