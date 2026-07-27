import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCommunityPostPublicView } from '../server/domain/community/communityPostPublicView.js';

test('public community post view exposes only allowlisted presentation fields', () => {
  const view = buildCommunityPostPublicView({
    id: 'post_1',
    postType: 'template',
    ownerUserId: 'usr_alice',
    ownerUsername: 'user_alice',
    title: 'Summer look',
    imageUrl: '/outputs/look.png',
    thumbnailUrl: '/outputs/look_thumb.png',
    promptVisibility: 'full',
    counts: { likes: 4, privateLedgerCost: 99 },
    engagementSummary: {
      viewCount: 8,
      likeCount: 4,
      saveCount: 2,
      commentCount: 1,
      remixSuccessCount: 3,
      comparisonVoteCount: 0,
      updatedAt: '2026-07-26T00:00:00.000Z'
    },
    sceneTemplateSnapshot: {
      finalPromptSnapshot: 'portrait with an intentionally long but public prompt',
      providerModelSnapshot: { providerId: 'gemini', modelId: 'image-fast' },
      generationSettingsSnapshot: {
        aspectRatio: '4:5',
        width: 1024,
        height: 1280,
        resolution: '1K',
        privateSeed: 12345
      },
      referenceSlotMapping: { face: { imageUrl: '/outputs/private.png' } }
    }
  });

  assert.equal(view.ownerUserId, undefined);
  assert.equal(view.sceneTemplateSnapshot, undefined);
  assert.equal(view.counts.privateLedgerCost, undefined);
  assert.equal(view.postType, 'template');
  assert.equal(view.engagementSummary.likeCount, 4);
  assert.equal(view.engagementSummary.saveCount, 2);
  assert.equal(view.promptPreview, 'portrait with an intentionally long but public prompt');
  assert.equal(view.providerModelDisplay, 'gemini - image-fast');
  assert.deepEqual(view.generationMetadata, {
    aspectRatio: '4:5',
    width: 1024,
    height: 1280,
    resolution: '1K'
  });
  assert.equal(view.generationMetadata.privateSeed, undefined);
  assert.equal(view.imageUrl, '/api/scene-templates/shared/post_1/image');
  assert.equal(view.thumbnailUrl, '/api/scene-templates/shared/post_1/thumbnail');
  assert.equal(view.contentDisclosure, 'ai_generated');
});

test('hidden and remix-only prompt settings never expose a prompt preview', () => {
  for (const promptVisibility of ['hidden', 'remix_only', 'private']) {
    assert.equal(buildCommunityPostPublicView({
      promptVisibility,
      sceneTemplateSnapshot: { finalPromptSnapshot: 'must stay private' }
    }).promptPreview, null);
  }
});

test('generated-image public view reads the approved top-level prompt and provider snapshots', () => {
  const view = buildCommunityPostPublicView({
    id: 'post_generic',
    imageUrl: '/outputs/generic.png',
    promptVisibility: 'partial',
    sharedPromptSnapshot: { publicPromptText: 'Approved public excerpt' },
    providerModelSnapshot: {
      providerDisplayName: 'Google Gemini AI',
      modelDisplayName: 'Image Fast'
    },
    workflowSnapshot: {
      privateRuntimeField: 'must not be returned',
      generationSettings: {
        aspectRatio: '6:8',
        width: '768',
        height: '1024'
      }
    },
    reusePolicy: 'view_only'
  });

  assert.equal(view.promptPreview, 'Approved public excerpt');
  assert.equal(view.providerModelDisplay, 'Google Gemini AI - Image Fast');
  assert.equal(view.workflowSnapshot, undefined);
  assert.deepEqual(view.generationMetadata, {
    aspectRatio: '6:8',
    width: 768,
    height: 1024,
    resolution: null
  });
  assert.equal(view.templateAvailability, false);
  assert.equal(view.postType, 'image');
  assert.deepEqual(view.engagementSummary, {
    viewCount: 0,
    likeCount: 0,
    saveCount: 0,
    commentCount: 0,
    remixSuccessCount: 0,
    comparisonVoteCount: 0,
    updatedAt: null
  });
});

test('approved public prompt is preserved for client-side disclosure controls', () => {
  const prompt = `Detailed public prompt ${'with visible detail '.repeat(30)}`.trim();
  const view = buildCommunityPostPublicView({
    id: 'post_long_prompt',
    promptVisibility: 'full',
    sharedPromptSnapshot: { publicPromptText: prompt }
  });

  assert.equal(view.promptPreview, prompt);
});

test('collection public view exposes proxy items without history or output identifiers', () => {
  const view = buildCommunityPostPublicView({
    id: 'post_collection',
    postType: 'collection',
    sourceCollectionId: 'col_private',
    imageUrl: '/outputs/cover.png',
    promptVisibility: 'hidden',
    collectionSnapshot: {
      items: [{
        itemId: 'item_001',
        imageUrl: '/outputs/private-member.png',
        thumbnailUrl: '/outputs/private-member-thumb.png',
        providerDisplayName: 'Provider',
        modelDisplayName: 'Model'
      }]
    }
  });

  assert.equal(view.postType, 'collection');
  assert.equal(view.sourceCollectionId, undefined);
  assert.equal(view.collectionSnapshot.itemCount, 1);
  assert.equal(
    view.collectionSnapshot.items[0].imageUrl,
    '/api/community/posts/post_collection/collection-items/item_001/image'
  );
  assert.equal(JSON.stringify(view).includes('/outputs/'), false);
  assert.equal(JSON.stringify(view).includes('col_private'), false);
});
