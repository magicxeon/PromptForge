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
  assert.equal(view.imageUrl, '/api/scene-templates/shared/post_1/image');
  assert.equal(view.thumbnailUrl, '/api/scene-templates/shared/post_1/thumbnail');
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
    workflowSnapshot: { privateRuntimeField: 'must not be returned' },
    reusePolicy: 'view_only'
  });

  assert.equal(view.promptPreview, 'Approved public excerpt');
  assert.equal(view.providerModelDisplay, 'Google Gemini AI - Image Fast');
  assert.equal(view.workflowSnapshot, undefined);
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
