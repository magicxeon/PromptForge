import test from 'node:test';
import assert from 'node:assert/strict';
import { FaceReferenceHandoffService } from '../server/domain/generation/FaceReferenceHandoffService.js';
import { normalizeGenerationContext } from '../server/domain/generation/generationRequestService.js';

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
const headshot = {
  id: 'job_face',
  ownerUserId: owner.userId,
  ownerUsername: owner.username,
  status: 'completed',
  mode: 'headshot',
  imageUrl: '/outputs/job_face.png'
};

function createService(post = null) {
  return new FaceReferenceHandoffService({
    generationRepository: {
      findByIdForOwner: async (id, userId) =>
        id === headshot.id && userId === owner.userId ? headshot : null,
      findById: async id => id === headshot.id ? headshot : null
    },
    postRepository: {
      findById: async id => post?.id === id ? post : null
    },
    now: () => Date.parse('2026-07-28T12:00:00.000Z'),
    secret: 'test-face-handoff-secret'
  });
}

test('owner receives an actor-bound Face reference handoff for a private generation', async () => {
  const service = createService();
  const handoff = await service.create({
    sourceType: 'generation',
    sourceId: headshot.id,
    destination: 'character_sheet'
  }, owner);

  assert.equal(handoff.referenceRole, 'face_reference');
  assert.equal(handoff.referenceValue.jobId, headshot.id);
  assert.equal(
    service.verifyAuthorization(handoff.authorizationToken, owner, headshot.id).jobId,
    headshot.id
  );
  assert.throws(
    () => service.verifyAuthorization(handoff.authorizationToken, viewer, headshot.id),
    error => error.code === 'face_reference_handoff_invalid'
  );
});

test('public reusable Face post permits another actor while view-only does not', async () => {
  const reusablePost = {
    id: 'post_face',
    ownerUserId: owner.userId,
    ownerUsername: owner.username,
    sourceGenerationResultId: headshot.id,
    sourceGenerationMode: 'headshot',
    status: 'published',
    visibility: 'public',
    faceReusePolicy: 'public_reusable'
  };
  const service = createService(reusablePost);
  const handoff = await service.create({
    sourceType: 'community_post',
    sourceId: reusablePost.id,
    destination: 'playground'
  }, viewer);
  assert.equal(handoff.source.ownerUserId, owner.userId);
  assert.equal(handoff.attribution.communityPostId, reusablePost.id);

  const viewOnlyService = createService({ ...reusablePost, faceReusePolicy: 'view_only' });
  await assert.rejects(
    () => viewOnlyService.create({
      sourceType: 'community_post',
      sourceId: reusablePost.id,
      destination: 'scene_builder'
    }, viewer),
    error => error.code === 'face_reference_reuse_unavailable'
  );
});

test('authorized Face handoff persists its source Job ID into Character Sheet lineage', async () => {
  const service = new FaceReferenceHandoffService({
    generationRepository: {
      findByIdForOwner: async id => id === headshot.id ? headshot : null
    },
    postRepository: { findById: async () => null },
    now: () => Date.now(),
    secret: 'local-face-reference-handoff'
  });
  const handoff = await service.create({
    sourceType: 'generation',
    sourceId: headshot.id,
    destination: 'character_sheet'
  }, owner);

  const context = normalizeGenerationContext({
    mode: 'character-sheet',
    characterType: 'reusable_model',
    faceReferenceImageA: headshot.imageUrl,
    faceReferenceContext: { authorizationToken: handoff.authorizationToken },
    imageReferences: { faceMatch: true }
  }, owner);

  assert.deepEqual(context.faceReferenceJobIds, [headshot.id]);
  assert.deepEqual(context.characterSheetConfig.sourceHeadshotIds, [headshot.id]);
});
