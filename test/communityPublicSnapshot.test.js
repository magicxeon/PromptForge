import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCommunityPostPublicView } from '../server/domain/community/communityPostPublicView.js';

test('public community post view exposes only allowlisted presentation fields', () => {
  const view = buildCommunityPostPublicView({
    id: 'post_1',
    ownerUserId: 'usr_alice',
    ownerUsername: 'user_alice',
    title: 'Summer look',
    imageUrl: '/outputs/look.png',
    thumbnailUrl: '/outputs/look_thumb.png',
    promptVisibility: 'full',
    counts: { likes: 4, privateLedgerCost: 99 },
    sceneTemplateSnapshot: {
      finalPromptSnapshot: 'portrait with an intentionally long but public prompt',
      providerModelSnapshot: { providerId: 'gemini', modelId: 'image-fast' },
      referenceSlotMapping: { face: { imageUrl: '/outputs/private.png' } }
    }
  });

  assert.equal(view.ownerUserId, undefined);
  assert.equal(view.sceneTemplateSnapshot, undefined);
  assert.equal(view.counts.privateLedgerCost, undefined);
  assert.equal(view.promptPreview, 'portrait with an intentionally long but public prompt');
  assert.equal(view.providerModelDisplay, 'gemini - image-fast');
  assert.equal(view.imageUrl, '/api/scene-templates/shared/post_1/image');
  assert.equal(view.thumbnailUrl, '/api/scene-templates/shared/post_1/thumbnail');
});

test('hidden and remix-only prompt settings never expose a prompt preview', () => {
  for (const promptVisibility of ['hidden', 'remix_only']) {
    assert.equal(buildCommunityPostPublicView({
      promptVisibility,
      sceneTemplateSnapshot: { finalPromptSnapshot: 'must stay private' }
    }).promptPreview, null);
  }
});
