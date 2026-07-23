import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunityShareService } from '../server/domain/community/CommunityShareService.js';

const alice = { userId: 'usr_alice', username: 'user_alice', role: 'creator' };
const bob = { userId: 'usr_bob', username: 'user_bob', role: 'user' };

function createService(generations = {}) {
  const posts = [];
  const events = [];
  const generationRepository = {
    async findByIdForOwner(id, ownerUserId) {
      const generation = generations[id] || null;
      return generation?.ownerUserId === ownerUserId ? structuredClone(generation) : null;
    }
  };
  const postRepository = {
    async create(input, actor) {
      const post = {
        ...structuredClone(input),
        id: `post_${posts.length + 1}`,
        ownerUserId: actor.userId,
        ownerUsername: actor.username,
        visibility: 'public',
        status: 'published'
      };
      posts.push(post);
      return structuredClone(post);
    },
    async findById(id) {
      const post = posts.find(item => item.id === id);
      return post ? structuredClone(post) : null;
    }
  };
  const remixRepository = {
    async appendEvent(input, actor) {
      const event = { ...structuredClone(input), actorUserId: actor.userId, actorUsername: actor.username };
      events.push(event);
      return structuredClone(event);
    }
  };
  return {
    service: new CommunityShareService({ generationRepository, postRepository, remixRepository }),
    posts,
    events
  };
}

function generation(id, authoringMode = 'guided') {
  return {
    id,
    ownerUserId: 'usr_alice',
    ownerUsername: 'user_alice',
    imageUrl: `/outputs/${id}.png`,
    sceneTemplateSnapshot: {
      sceneTemplateVersion: 1,
      authoringMode,
      finalPromptSnapshot: 'A private prompt',
      manualPromptSnapshot: authoringMode === 'manual' ? 'A private prompt' : '',
      referenceSlotMapping: {
        character_reference: {
          required: true,
          policy: 'required_user_replacement',
          imageUrl: 'data:image/png;base64,PRIVATE'
        }
      },
      replaceableVariables: []
    }
  };
}

test('createSceneShareDraft accepts only the generation owner and strips embedded base64', async () => {
  const { service } = createService({ job_alice: generation('job_alice') });
  const draft = await service.createSceneShareDraft('job_alice', alice);

  assert.equal(draft.ownerUserId, 'usr_alice');
  assert.equal(draft.sceneTemplateSnapshot.referenceSlotMapping.character_reference.imageUrl, undefined);
  await assert.rejects(() => service.createSceneShareDraft('job_alice', bob), /not available/);
});

test('publish blocks manual remix_only and publishes guided snapshots without prompt text', async () => {
  const { service, posts } = createService({
    job_manual: generation('job_manual', 'manual'),
    job_guided: generation('job_guided')
  });
  const manualDraft = await service.createSceneShareDraft('job_manual', alice);
  await assert.rejects(
    () => service.publishSceneTemplateShare(manualDraft.id, {
      title: 'Manual template', promptVisibility: 'remix_only'
    }, alice),
    /Manual prompts cannot be hidden/
  );

  const guidedDraft = await service.createSceneShareDraft('job_guided', alice);
  const post = await service.publishSceneTemplateShare(guidedDraft.id, {
    title: 'Guided template', description: 'A safe template', promptVisibility: 'remix_only'
  }, alice);

  assert.equal(post.ownerUserId, 'usr_alice');
  assert.equal(post.sceneTemplateSnapshot.finalPromptSnapshot, '');
  assert.equal(posts.length, 1);
});

test('template use and remix events retain actor identity separately from post ownership', async () => {
  const { service, events } = createService({ job_guided: generation('job_guided') });
  const draft = await service.createSceneShareDraft('job_guided', alice);
  const post = await service.publishSceneTemplateShare(draft.id, {
    title: 'Reusable template', promptVisibility: 'full'
  }, alice);

  const payload = await service.getTemplateForViewer(post.id, bob);
  assert.equal(payload.postId, post.id);
  assert.equal(payload.ownerUserId, undefined);

  const event = await service.recordRemix({
    sourcePostId: post.id,
    generatedJobId: 'job_bob_result'
  }, bob);
  assert.equal(event.actorUserId, 'usr_bob');
  assert.equal(events.length, 1);
});
