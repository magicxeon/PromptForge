import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunityShareService } from '../server/domain/community/CommunityShareService.js';

const alice = {
  userId: 'usr_alice',
  username: 'user_alice',
  role: 'creator',
  activeCreatorProfileId: 'creator_alice'
};
const bob = { userId: 'usr_bob', username: 'user_bob', role: 'user' };

function createService(generations = {}) {
  const posts = [];
  const events = [];
  const publishedTemplates = [];
  const generationRepository = {
    async findByIdForOwner(id, ownerUserId) {
      const generation = generations[id] || null;
      return generation?.ownerUserId === ownerUserId ? structuredClone(generation) : null;
    }
  };
  const postRepository = {
    async findByGenerationForOwner(id, ownerId) { return posts.find(post => post.sourceGenerationResultId === id && post.ownerUserId === ownerId) || null; },
    async create(input, actor) {
      const post = {
        ...structuredClone(input),
        id: `post_${posts.length + 1}`,
        ownerUserId: actor.userId,
        ownerUsername: actor.username,
        visibility: input.visibility || 'public',
        status: input.status || 'published'
      };
      posts.push(post);
      return structuredClone(post);
    },
    async findById(id) {
      const post = posts.find(item => item.id === id);
      return post ? structuredClone(post) : null;
    },
    async activatePreparedTemplateByVersion(templateId, templateVersionId, actor) {
      const post = posts.find(item => (
        item.templateId === templateId
        && item.templateVersionId === templateVersionId
        && item.ownerUserId === actor.userId
      ));
      if (!post) return null;
      post.status = 'published';
      return structuredClone(post);
    }
  };
  const remixRepository = {
    async appendEvent(input, actor) {
      const event = { ...structuredClone(input), actorUserId: actor.userId, actorUsername: actor.username };
      events.push(event);
      return structuredClone(event);
    }
  };
  const engagementService = {
    async recordSuccessfulRemix() {
      return { created: true };
    }
  };
  const templateCoreService = {
    async publishFromGeneration(input) {
      publishedTemplates.push(structuredClone(input));
      return {
        template: {
          id: `template_${posts.length + 1}`,
          pricing: {
            accessCredits: Number(input.pricing?.accessCredits) || 0,
            creatorShareBps: 0,
            platformShareBps: 10000,
            cadence: 'per_output',
            currency: 'credits'
          }
        },
        version: { id: `template_version_${posts.length + 1}` }
      };
    },
    async createUseSession({ templateId, templateVersionId, sourceCommunityPostId }) {
      return {
        id: templateId,
        currentVersionId: templateVersionId,
        useSession: {
          id: `template_session_${sourceCommunityPostId}`,
          sourceCommunityPostId
        },
        sceneTemplateSnapshot: {}
      };
    }
  };
  return {
    service: new CommunityShareService({
      generationRepository,
      postRepository,
      remixRepository,
      engagementService,
      templateCoreService
    }),
    posts,
    events,
    publishedTemplates
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
        outfit_front_reference: { required: true, policy: 'required_user_replacement' },
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
    title: 'Guided template', description: 'A safe template', promptVisibility: 'remix_only',
    publishAsTemplate: true
  }, alice);

  assert.equal(post.ownerUserId, 'usr_alice');
  assert.equal(post.creatorProfileId, 'creator_alice');
  assert.equal(post.postType, 'template');
  assert.equal(post.status, 'draft');
  assert.equal(post.sceneTemplateSnapshot.finalPromptSnapshot, '');
  assert.equal(posts.length, 1);
});

test('guided sharing remains image-only unless reusable Template intent is explicit', async () => {
  const { service } = createService({ job_guided: generation('job_guided') });
  const draft = await service.createSceneShareDraft('job_guided', alice);
  const post = await service.publishSceneTemplateShare(draft.id, {
    title: 'Community image',
    promptVisibility: 'full'
  }, alice);
  assert.equal(post.postType, 'image');
  assert.equal(post.status, 'published');
});

test('reusable Template remains owner-only until preparation approval activates the same post', async () => {
  const { service, events, posts } = createService({
    job_guided: generation('job_guided'),
    job_bob_result: {
      ...generation('job_bob_result'),
      ownerUserId: 'usr_bob',
      ownerUsername: 'user_bob',
      status: 'completed'
    }
  });
  const draft = await service.createSceneShareDraft('job_guided', alice);
  const post = await service.publishSceneTemplateShare(draft.id, {
    title: 'Reusable template', promptVisibility: 'full', publishAsTemplate: true
  }, alice);

  assert.equal(post.status, 'draft');
  await assert.rejects(
    () => service.getTemplateForViewer(post.id, bob),
    error => error.code === 'community_post_unavailable'
  );

  const activated = await service.activatePreparedTemplate({
    templateId: post.templateId,
    templateVersionId: post.templateVersionId
  }, alice);
  assert.equal(activated.id, post.id);
  assert.equal(activated.status, 'published');
  assert.equal(posts.length, 1);

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

test('Template publication restores mandatory Outfit Front from server draft policy', async () => {
  const source = generation('job_fashion_template');
  source.sceneTemplateSnapshot.replaceableVariables = [
    {
      id: 'outfit_front_reference',
      label: 'Outfit Front',
      type: 'reference_image',
      sourceFieldName: 'outfit_front_reference',
      fashionBindingRole: 'fashion.outfit_front'
    },
    {
      id: 'Expression',
      label: 'Expression',
      type: 'select_option',
      sourceFieldName: 'Expression'
    }
  ];
  const { service, publishedTemplates } = createService({
    job_fashion_template: source
  });
  const draft = await service.createSceneShareDraft('job_fashion_template', alice);
  assert.deepEqual(draft.mandatoryTemplateInputIds, ['outfit_front_reference']);

  await service.publishSceneTemplateShare(draft.id, {
    title: 'Fashion template',
    promptVisibility: 'full',
    publishAsTemplate: true,
    publicInputSchema: {
      schemaVersion: 1,
      inputs: [{
        id: 'Expression',
        sourceFieldName: 'crafted_field',
        required: false
      }]
    }
  }, alice);

  const [mandatoryOutfit, optionalCharacter] =
    publishedTemplates[0].publicInputSchema.inputs;
  assert.equal(mandatoryOutfit.id, 'outfit_front_reference');
  assert.equal(mandatoryOutfit.sourceFieldName, 'outfit_front_reference');
  assert.equal(mandatoryOutfit.fashionBindingRole, 'fashion.outfit_front');
  assert.equal(mandatoryOutfit.required, true);
  assert.equal(mandatoryOutfit.replacementPolicy, 'replaceable');
  assert.equal(optionalCharacter.id, 'character_reference');
  assert.equal(optionalCharacter.required, false);
  assert.ok(!publishedTemplates[0].publicInputSchema.inputs.some(input => input.id === 'Expression'));
});
