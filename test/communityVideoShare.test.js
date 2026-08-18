import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunityVideoShareService } from '../server/domain/community/CommunityVideoShareService.js';

const alice = {
  userId: 'usr_alice',
  username: 'user_alice',
  role: 'creator',
  activeCreatorProfileId: 'creator_alice'
};

function createHarness({ posterUrl = '/outputs/posters/video.webp', visibility = 'public' } = {}) {
  const posts = [];
  const asset = {
    id: 'ast_video',
    ownerUserId: alice.userId,
    assetType: 'cinematic_video_output',
    status: 'active',
    publicUrl: '/outputs/cinematic-video/usr_alice/video.mp4',
    thumbnailUrl: posterUrl,
    mimeType: 'video/mp4',
    width: 1280,
    height: 720,
    metadata: {
      durationSeconds: 6,
      characterAttributions: [{
        characterProfileId: 'charprof_1',
        characterProfileVersionId: 'charver_1',
        role: 'Lead'
      }]
    }
  };
  const service = new CommunityVideoShareService({
    assetRepository: {
      async findByIdForOwner(id, ownerUserId) {
        return id === asset.id && ownerUserId === asset.ownerUserId
          ? structuredClone(asset)
          : null;
      }
    },
    postRepository: {
      async readAll() {
        return structuredClone(posts);
      },
      async create(input, actor) {
        const post = {
          ...structuredClone(input),
          id: `post_${posts.length + 1}`,
          ownerUserId: actor.userId,
          ownerUsername: actor.username,
          createdAt: new Date().toISOString()
        };
        posts.push(post);
        return structuredClone(post);
      }
    },
    profileRepository: {
      async findById(id) {
        return id === 'charprof_1' ? {
          id,
          displayName: 'Alice Lead',
          status: 'approved',
          visibility
        } : null;
      }
    },
    versionRepository: {
      async findById(id) {
        return id === 'charver_1' ? {
          id,
          characterProfileId: 'charprof_1',
          status: 'approved'
        } : null;
      }
    },
    creatorProfiles: {
      async ensureProfileForActor() {
        return { id: 'creator_alice' };
      }
    },
    now: () => Date.parse('2026-08-18T03:00:00.000Z')
  });
  return { service, posts };
}

test('video share publishes one owned durable Asset with verified Character attribution', async () => {
  const { service, posts } = createHarness();
  const draft = await service.createDraft('ast_video', alice);
  assert.equal(draft.characterAttributions[0].verificationStatus, 'verified');

  const first = await service.publish(draft.id, { title: 'Episode one' }, alice);
  const replayDraft = await service.createDraft('ast_video', alice);
  const replay = await service.publish(replayDraft.id, { title: 'Ignored replay' }, alice);

  assert.equal(posts.length, 1);
  assert.equal(first.id, replay.id);
  assert.equal(first.postType, 'video');
  assert.equal(first.characterAttributions[0].characterProfileId, 'charprof_1');
  assert.equal(first.promptPreview, null);
});

test('video share keeps private Character provenance out of the public projection', async () => {
  const { service } = createHarness({ visibility: 'private' });
  const draft = await service.createDraft('ast_video', alice);
  assert.equal(draft.characterAttributions[0].verificationStatus, 'hidden_private');
  const post = await service.publish(draft.id, { title: 'Private cast' }, alice);
  assert.deepEqual(post.characterAttributions, []);
});

test('video share requires a durable poster and actor-owned video Asset', async () => {
  const { service } = createHarness({ posterUrl: null });
  const draft = await service.createDraft('ast_video', alice);
  await assert.rejects(
    () => service.publish(draft.id, { title: 'Missing poster' }, alice),
    error => error.code === 'community_video_poster_required'
  );
  await assert.rejects(
    () => service.createDraft('ast_video', { ...alice, userId: 'usr_bob' }),
    error => error.code === 'community_video_asset_not_shareable'
  );
});
