import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CommunityShareService } from '../server/domain/community/CommunityShareService.js';
import { CommunityPostRepository } from '../server/repositories/community/CommunityPostRepository.js';
import { registerCommunityShareRoutes } from '../server/app/routes/communityShareRoutes.js';
import { registerSceneTemplateRoutes } from '../server/app/routes/sceneTemplateRoutes.js';

const owner = { userId: 'owner', username: 'owner', role: 'creator' };
const foreign = { userId: 'foreign', username: 'foreign', role: 'user' };
const source = () => ({ id: 'image', ownerUserId: owner.userId, ownerUsername: owner.username,
  status: 'completed', mode: 'scene', imageUrl: '/outputs/result.png', prompt: 'SECRET SOURCE PROMPT',
  sceneTemplateSnapshot: { sceneTemplateVersion: 1, authoringMode: 'guided', finalPromptSnapshot: 'SECRET SOURCE PROMPT',
    replaceableVariables: [{ id: 'outfit_front_reference', type: 'reference_image', referenceRole: 'outfit_front' }] },
  templateUseContext: { templateId: 'original', templateVersionId: 'v1', templateUseSessionId: 'session',
    templateOwnerUsername: owner.username, sourceCommunityPostId: 'original-post' }
});
async function fixture(t, generation = source()) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'derived-sharing-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const userRepository = { findById: async id => id === owner.userId ? owner : foreign,
    findByUsername: async name => name === owner.username ? owner : foreign };
  const postRepository = new CommunityPostRepository({ postsFile: path.join(dir, 'posts.json'), userRepository });
  const generationRepository = { findByIdForOwner: async (id, actorId) =>
    generation && generation.id === id && generation.ownerUserId === actorId ? generation : null };
  let templateWrites = 0;
  const dependencies = { postRepository, generationRepository,
    postAccessService: { updatePresentation: (id, patch, actor) => postRepository.updatePresentationById(id, patch, actor) },
    classificationService: { classifyGeneration: async () => ({}), preparePublishTaxonomy: async () => ({}) },
    templateCoreService: { publishFromGeneration: async () => { templateWrites++; throw new Error('Unexpected Template publication'); } }
  };
  return { service: new CommunityShareService(dependencies), dependencies, postRepository,
    generation, templateWrites: () => templateWrites };
}

test('derived drafts hide source prompt and replacement settings; owner cannot republish and can still share image', async t => {
  const f = await fixture(t);
  const draft = await f.service.createGeneratedShareDraft('image', owner);
  assert.equal(draft.templateEligible, false);
  assert.equal(draft.templateIneligibleReason, 'template_derived_generation');
  assert.equal(draft.templateInputPolicy, undefined);
  assert.equal(draft.suggestedTemplateInputSchema, null);
  assert.equal(draft.promptVisibility, 'private');
  assert.deepEqual(draft.allowedPromptVisibilities, ['private']);
  assert.deepEqual(draft.allowedTemplatePromptVisibilities, []);
  assert.ok(!JSON.stringify(draft).includes('SECRET SOURCE PROMPT'));
  await assert.rejects(f.service.publishGeneratedImageShare(draft.id, {
    title: 'Copy', publishAsTemplate: true, templateEligible: true, templateUseContext: null
  }, owner), e => e.code === 'community_template_derivative_not_publishable' && e.statusCode === 403);
  for (const promptVisibility of ['full', 'partial', 'remix_only']) {
    await assert.rejects(f.service.publishGeneratedImageShare(draft.id, { title: 'Copy', promptVisibility }, owner),
      e => e.code === 'community_source_prompt_visibility_restricted');
  }
  assert.equal(f.templateWrites(), 0);
  assert.equal((await f.postRepository.readAll()).length, 0);
  const post = await f.service.publishGeneratedImageShare(draft.id, { title: 'Creation', visibility: 'public' }, owner);
  assert.equal(post.postType, 'image'); assert.equal(post.promptVisibility, 'private');
  assert.equal(post.sourceGenerationResultId, 'image'); assert.equal(post.sceneTemplateSnapshot, null);
  assert.ok(!JSON.stringify(post).includes('SECRET SOURCE PROMPT'));
  assert.equal((await f.service.getGenerationShareStatus('image', owner)).shared, true);
  const status = await f.service.getGenerationShareStatus('image', owner);
  assert.deepEqual(status.post, { id: post.id, postType: 'image', visibility: 'public', status: post.status });
  assert.equal(JSON.stringify(status).includes('SECRET'), false);
  await assert.rejects(f.service.getGenerationShareStatus('image', foreign), error => error.statusCode === 404);
  await assert.rejects(f.service.createGeneratedShareDraft('image', owner), e => e.code === 'community_generation_already_shared');
});

test('origin is rechecked at publish and incomplete context is fail-closed', async t => {
  const generation = source(); generation.templateUseContext = null;
  const f = await fixture(t, generation);
  const draft = await f.service.createGeneratedShareDraft('image', owner);
  assert.equal(draft.templateIneligibleReason, null);
  generation.templateUseContext = { templateVersionId: 'partial-legacy' };
  await assert.rejects(f.service.publishGeneratedImageShare(draft.id, { title: 'Copy', publishAsTemplate: true }, owner),
    e => e.code === 'community_template_derivative_not_publishable');
  await assert.rejects(f.service.publishGeneratedImageShare(draft.id, { title: 'Leak', promptVisibility: 'full' }, owner),
    e => e.code === 'community_source_prompt_visibility_restricted');
  assert.equal(f.templateWrites(), 0);
});

test('derived draft and published image edits cannot reopen prompt visibility, including missing history', async t => {
  const f = await fixture(t);
  const draft = await f.service.createGeneratedShareDraft('image', owner);
  await assert.rejects(f.service.updateGeneratedShareDraft(draft.id, { promptVisibility: 'full' }, owner),
    e => e.code === 'community_source_prompt_visibility_restricted');
  const post = await f.service.publishGeneratedImageShare(draft.id, { title: 'Original title' }, owner);
  assert.equal(post.templateDerived, true);
  for (const promptVisibility of ['full', 'partial', 'remix_only']) {
    await assert.rejects(f.service.updateSharedPostPresentation(post.id, { promptVisibility }, owner),
      e => e.code === 'community_source_prompt_visibility_restricted');
  }
  const changed = await f.service.updateSharedPostPresentation(post.id, { title: 'Updated title' }, owner);
  assert.equal(changed.title, 'Updated title'); assert.equal(changed.promptVisibility, 'private');
  f.dependencies.generationRepository.findByIdForOwner = async () => null;
  await assert.rejects(f.service.updateSharedPostPresentation(post.id, { promptVisibility: 'full' }, owner),
    e => e.code === 'community_source_prompt_visibility_restricted');
});

test('share status route sanitizes unexpected internal errors', async () => {
  const handlers = new Map();
  const app = { get: (p, fn) => handlers.set(p, fn), post() {}, patch() {}, delete() {} };
  registerCommunityShareRoutes(app, { communityFeaturePolicyService: { assertEnabled: async () => {} },
    communityShareService: { getGenerationShareStatus: async () => { throw new Error('PRIVATE storage path'); } } });
  const res = { status(code) { this.code = code; return this; }, json(data) { this.body = data; return this; } };
  await handlers.get('/api/community/generations/:generationId/share-status')({ params: { generationId: 'image' }, actorContext: owner }, res);
  assert.equal(res.code, 500); assert.equal(res.body.error.code, 'community_share_status_failed');
  assert.ok(!JSON.stringify(res.body).includes('PRIVATE'));
});

test('foreign and deleted source status/publish are rejected', async t => {
  const f = await fixture(t);
  await assert.rejects(f.service.getGenerationShareStatus('image', foreign), e => e.statusCode === 404);
  await assert.rejects(f.service.createGeneratedShareDraft('image', foreign), e => e.statusCode === 404);
  const draft = await f.service.createGeneratedShareDraft('image', owner);
  await assert.rejects(f.service.publishGeneratedImageShare(draft.id, { title: 'Wrong owner' }, foreign), e => e.statusCode === 404);
  f.generation.deletedAt = new Date().toISOString();
  await assert.rejects(f.service.publishGeneratedImageShare(draft.id, { title: 'Deleted' }, owner), e => e.statusCode === 404);
});

test('concurrent drafts across service instances create only one post; retry detects persisted share', async t => {
  const f = await fixture(t);
  const second = new CommunityShareService(f.dependencies);
  const a = await f.service.createGeneratedShareDraft('image', owner);
  const b = await second.createGeneratedShareDraft('image', owner);
  const results = await Promise.allSettled([
    f.service.publishGeneratedImageShare(a.id, { title: 'One' }, owner),
    second.publishGeneratedImageShare(b.id, { title: 'Two' }, owner)
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await f.postRepository.readAll()).length, 1);
  assert.equal((await new CommunityShareService(f.dependencies).getGenerationShareStatus('image', owner)).shared, true);
});

test('atomic repository guard covers competing writers and private/unpublished legacy posts', async t => {
  const f = await fixture(t);
  const input = { title: 'One', postType: 'image', sourceGenerationId: 'image', visibility: 'private', status: 'owner_unpublished' };
  const other = new CommunityPostRepository({ postsFile: f.postRepository.postsFile, userRepository: f.postRepository.userRepository });
  const results = await Promise.allSettled([f.postRepository.create(input, owner), other.create(input, owner)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'community_generation_already_shared');
  assert.equal((await f.service.getGenerationShareStatus('image', owner)).shared, true);
  await f.postRepository.create({ ...input, sourceGenerationId: 'different' }, owner);
  await f.postRepository.create(input, foreign);
  assert.equal((await f.postRepository.readAll()).length, 3);
});

test('failed publication releases in-flight guard and permits image retry', async t => {
  const f = await fixture(t);
  const draft = await f.service.createGeneratedShareDraft('image', owner);
  await assert.rejects(f.service.publishGeneratedImageShare(draft.id, { title: '' }, owner));
  assert.deepEqual(await f.service.getGenerationShareStatus('image', owner), { shared: false });
  await f.service.publishGeneratedImageShare(draft.id, { title: 'Recovered' }, owner);
});

test('current and legacy publish routes surface the same policy rejection', async t => {
  const f = await fixture(t); const handlers = new Map();
  const app = { get: (p, fn) => handlers.set(`GET ${p}`, fn), post: (p, fn) => handlers.set(`POST ${p}`, fn),
    patch() {}, delete() {} };
  const deps = { communityShareService: f.service, communityFeaturePolicyService: { assertEnabled: async () => {} } };
  registerCommunityShareRoutes(app, deps); registerSceneTemplateRoutes(app, deps);
  const draft = await f.service.createGeneratedShareDraft('image', owner);
  for (const path of ['/api/community/share-drafts/:draftId/publish', '/api/scene-templates/share-drafts/:draftId/publish']) {
    const res = { status(code) { this.code = code; return this; }, json(data) { this.body = data; return this; } };
    await handlers.get(`POST ${path}`)({ params: { draftId: draft.id }, body: { title: 'Copy', publishAsTemplate: true }, actorContext: owner }, res);
    assert.equal(res.code, 403); assert.equal(res.body.error.code, 'community_template_derivative_not_publishable');
  }
});
