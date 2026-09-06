import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildTemplateInputPolicy, getTemplateInputPolicy } from '../server/domain/templates/templateInputPolicy.js';
import { validateTemplateReplacements } from '../server/domain/templates/templateContracts.js';
import { TemplateCoreService } from '../server/domain/templates/TemplateCoreService.js';
import { TemplateRepository } from '../server/repositories/templates/TemplateRepository.js';
import { TemplateVersionRepository } from '../server/repositories/templates/TemplateVersionRepository.js';
import { TemplateUseSessionRepository } from '../server/repositories/templates/TemplateUseSessionRepository.js';
import { TemplatePoseProxyService } from '../server/domain/template-pose-proxy/TemplatePoseProxyService.js';
import { TemplatePoseProxyPolicyService } from '../server/domain/template-pose-proxy/TemplatePoseProxyPolicyService.js';
import { CommunityShareService } from '../server/domain/community/CommunityShareService.js';

const owner = { userId: 'owner', username: 'owner', role: 'user' };
const viewer = { userId: 'viewer', username: 'viewer', role: 'user' };
const snapshot = {
  authoringMode: 'guided', finalPromptSnapshot: 'Keep the source scene and expression.',
  structuredSelectionsSnapshot: { Environment: { value: 'original cafe' } },
  referenceSlotMapping: Object.fromEntries(['outfit_front_reference', 'outfit_back_reference', 'character_reference', 'face_reference', 'pose_reference'].map(id => [id, { required: false, sharePolicy: 'required_user_replacement', value: null }])),
  replaceableVariables: [{ id: 'environment', sourceFieldName: 'Environment', type: 'select_option' }]
};

test('policy exposes only outfit and optional whole Character, never face, scene or pose', () => {
  const schema = buildTemplateInputPolicy(snapshot);
  assert.deepEqual(schema.inputs.map(i => [i.id, i.required]), [
    ['outfit_front_reference', true], ['character_reference', false], ['outfit_back_reference', false]
  ]);
  assert.throws(() => validateTemplateReplacements({}, schema), e => e.code === 'template_replacement_required');
  assert.doesNotThrow(() => validateTemplateReplacements({ outfit_front_reference: '/outfit.png' }, schema));
  for (const id of ['face_reference', 'pose_reference', 'environment', 'manual_prompt']) {
    assert.throws(() => validateTemplateReplacements({ outfit_front_reference: '/outfit.png', [id]: '/forged.png' }, schema), e => e.code === 'template_replacement_not_allowed');
  }
  assert.equal(buildTemplateInputPolicy(snapshot, { characterEnabled: false, outfitBackEnabled: false }).inputs.length, 1);
  for (const options of [{ faceEnabled: true }, { characterEnabled: 'true' }, [], null]) {
    assert.throws(() => buildTemplateInputPolicy(snapshot, options), e => e.code === 'template_input_policy_invalid');
  }
  assert.throws(() => buildTemplateInputPolicy({}), e => e.code === 'template_outfit_source_required');
  assert.throws(() => buildTemplateInputPolicy({ referenceSlotMapping: { outfit_front: {} } }, { characterEnabled: true }), e => e.code === 'template_input_unsupported');
});

async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'template-policy-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const repositories = {
    templateRepository: new TemplateRepository({ templatesFile: path.join(dir, 'templates.json') }),
    versionRepository: new TemplateVersionRepository({ versionsFile: path.join(dir, 'versions.json') }),
    sessionRepository: new TemplateUseSessionRepository({ sessionsFile: path.join(dir, 'sessions.json') })
  };
  const core = new TemplateCoreService(repositories);
  const published = await core.publishFromGeneration({ title: 'Source', visibility: 'public', promptVisibility: 'full',
    executionSnapshot: snapshot, publicInputSchema: { schemaVersion: 1, inputs: [
      { id: 'environment', sourceFieldName: 'Environment', type: 'select_option', required: false, replacementPolicy: 'replaceable' }
    ] }, pricing: { accessCredits: 8 }, preview: { imageUrl: '/source.png' } }, owner);
  return { ...repositories, core, published };
}

test('owner edit publishes immutable inputs, preserves original session/price, rejects stale edit and is no-op on unchanged save', async t => {
  const { core, published, versionRepository } = await fixture(t);
  const oldSession = await core.createUseSession({ templateId: published.template.id }, viewer);
  const original = await versionRepository.findById(published.version.id);
  await assert.rejects(core.getOwnerInputPolicy(published.template.id, viewer), e => e.statusCode === 404);
  const dto = await core.getOwnerInputPolicy(published.template.id, owner);
  assert.deepEqual(dto.removedFields, ['Environment']);
  assert.equal(JSON.stringify(dto).includes('original cafe'), false);
  const version = await core.updateInputPolicy(published.template.id, { characterEnabled: true, outfitBackEnabled: true }, original.id, owner);
  assert.notEqual(version.id, original.id);
  await assert.rejects(core.createUseSession({ templateId: published.template.id, templateVersionId: original.id }, viewer), e => e.code === 'template_version_conflict');
  assert.equal(version.preparationSourceVersionId, original.id);
  assert.deepEqual(await versionRepository.findById(original.id), original);
  assert.deepEqual(version.executionSnapshot, original.executionSnapshot);
  const oldResolved = await core.resolveSession(oldSession.useSession.id, viewer, { environment: { value: 'old session scene' } });
  assert.equal(oldResolved.version.id, original.id);
  assert.equal((await core.resolvePricing(oldSession.useSession.id, viewer)).unitCredits, 8);
  const next = await core.createUseSession({ templateId: published.template.id }, viewer);
  assert.equal(next.currentVersionId, version.id);
  await assert.rejects(core.resolveSession(next.useSession.id, viewer, {}), e => e.code === 'template_replacement_required');
  assert.ok(await core.resolveSession(next.useSession.id, viewer, { outfit_front_reference: '/outfit.png' }));
  await assert.rejects(core.updateInputPolicy(published.template.id, {}, original.id, owner), e => e.code === 'template_version_conflict');
  const same = await core.updateInputPolicy(published.template.id, { characterEnabled: true, outfitBackEnabled: true }, version.id, owner);
  assert.equal(same.id, version.id);
  assert.equal((await versionRepository.findByTemplateId(published.template.id)).length, 2);
});

test('policy-only versions inherit only same-source approved current-strategy preparation', async t => {
  const { core, published, versionRepository, templateRepository } = await fixture(t);
  const version = await core.updateInputPolicy(published.template.id, {}, published.version.id, owner);
  const policy = new TemplatePoseProxyPolicyService().getPolicy();
  const record = { id: 'proxy', templateId: published.template.id, templateVersionId: published.version.id,
    poseVariantId: 'default', status: 'active', providerId: policy.providerId, modelId: policy.modelId,
    processorPolicyVersion: policy.policyVersion, processorStrategyVersion: policy.processorStrategyVersion,
    outputRepresentation: policy.outputRepresentation };
  const proxy = new TemplatePoseProxyService({ providerRegistry: {}, generationApplicationService: {},
    templateRepository, versionRepository, repository: { readAll: async () => [record] },
    policyService: { getPolicy: () => policy } });
  assert.equal((await proxy.requireActive(version.id)).id, 'proxy');
  assert.equal((await proxy.getReadiness(published.template.id, version.id)).templateVersionId, version.id);
  await assert.rejects(proxy.getOwnerReadiness('unowned', version.id, owner), e => e.statusCode === 404);
  const other = await versionRepository.create({ ...version, templateId: 'other-template' }, viewer);
  await assert.rejects(proxy.getOwnerReadiness(published.template.id, other.id, owner), e => e.statusCode === 404);
  const changed = await versionRepository.create({ ...version, executionSnapshot: { ...snapshot, finalPromptSnapshot: 'different' } }, owner);
  await assert.rejects(proxy.requireActive(changed.id), e => e.code === 'fashion_template_pose_proxy_required');
  record.status = 'review_required';
  await assert.rejects(proxy.requireActive(version.id), e => e.code === 'fashion_template_pose_proxy_required');
  assert.equal((await proxy.getReadiness(published.template.id, version.id)).status, 'not_prepared');
  record.status = 'active'; record.processorPolicyVersion = 'obsolete';
  await assert.rejects(proxy.requireActive(version.id), e => e.code === 'fashion_template_pose_proxy_required');
});

test('Community policy save recovers identical retry after post failure and serializes overlapping writes', async t => {
  const { core, published, versionRepository } = await fixture(t);
  let post = { id: 'post', postType: 'template', ownerUserId: owner.userId, templateId: published.template.id,
    templateVersionId: published.version.id, visibility: 'public', sharedPromptSnapshot: {} };
  let fail = true;
  let pauseWrite = null;
  const service = new CommunityShareService({ templateCoreService: core,
    postRepository: { findById: async () => structuredClone(post) },
    postAccessService: { updatePresentation: async (id, patch) => {
      if (fail) { fail = false; throw new Error('injected write failure'); }
      if (pauseWrite) await pauseWrite;
      assert.equal(patch.expectedPostTemplateVersionId, post.templateVersionId);
      post = { ...post, ...patch }; return post;
    } }
  });
  const request = { templateInputOptions: { characterEnabled: true, outfitBackEnabled: true }, expectedTemplateVersionId: published.version.id };
  await assert.rejects(service.updateSharedPostPresentation(post.id, request, owner), /injected/);
  const advanced = (await core.getOwnerInputPolicy(published.template.id, owner)).templateVersionId;
  assert.notEqual(advanced, post.templateVersionId);
  await service.updateSharedPostPresentation(post.id, request, owner);
  assert.equal(post.templateVersionId, advanced);
  assert.equal((await versionRepository.findByTemplateId(published.template.id)).length, 2);
  let release;
  pauseWrite = new Promise(resolve => { release = resolve; });
  const a = service.updateSharedPostPresentation(post.id, { templateInputOptions: { characterEnabled: false, outfitBackEnabled: true }, expectedTemplateVersionId: advanced }, owner);
  while ((await core.getOwnerInputPolicy(published.template.id, owner)).templateVersionId === advanced) await new Promise(resolve => setTimeout(resolve, 1));
  const middle = (await core.getOwnerInputPolicy(published.template.id, owner)).templateVersionId;
  const b = service.updateSharedPostPresentation(post.id, { templateInputOptions: { characterEnabled: true, outfitBackEnabled: false }, expectedTemplateVersionId: middle }, owner);
  release(); pauseWrite = null;
  await a; await b;
  const latest = await core.getOwnerInputPolicy(published.template.id, owner);
  assert.equal(post.templateVersionId, latest.templateVersionId);
  assert.equal(latest.characterEnabled, true); assert.equal(latest.outfitBackEnabled, false);
  assert.equal(service.presentationUpdates.size, 0);
  await assert.rejects(service.updateSharedPostPresentation(post.id, request, viewer), e => e.statusCode === 403);
});

test('initial Community publication uses the same source-bound policy as Edit, not arbitrary client fields', async t => {
  const { core } = await fixture(t);
  const generation = { id: 'job_source', ownerUserId: owner.userId, ownerUsername: owner.username,
    imageUrl: '/source.png', thumbnailUrl: '/source.png', mode: 'scene', prompt: 'source',
    sceneTemplateSnapshot: { ...snapshot, sceneTemplateVersion: 1 } };
  const service = new CommunityShareService({ templateCoreService: core,
    generationRepository: { findByIdForOwner: async (id, actorId) => actorId === owner.userId ? generation : null },
    postRepository: { findByGenerationForOwner: async () => null, create: async input => ({ ...input, id: 'new-post' }) },
    classificationService: { classifyGeneration: async () => ({}), preparePublishTaxonomy: async () => ({}) }
  });
  const draft = await service.createGeneratedShareDraft(generation.id, owner);
  assert.equal(draft.templateEligible, true);
  assert.deepEqual(draft.suggestedTemplateInputSchema.inputs.map(i => i.id), ['outfit_front_reference', 'character_reference', 'outfit_back_reference']);
  const post = await service.publishGeneratedImageShare(draft.id, { title: 'New Template', publishAsTemplate: true,
    promptVisibility: 'full', visibility: 'public', templateInputOptions: { characterEnabled: false, outfitBackEnabled: true },
    publicInputSchema: { inputs: [{ id: 'face_reference', type: 'reference_image', required: true }] }
  }, owner);
  const policy = await core.getOwnerInputPolicy(post.templateId, owner);
  assert.equal(policy.characterEnabled, false);
  assert.equal(policy.outfitBackEnabled, true);
  const next = await core.createUseSession({ templateId: post.templateId }, viewer);
  assert.deepEqual(next.publicInputSchema.inputs.map(i => [i.id, i.required]), [['outfit_front_reference', true], ['outfit_back_reference', false]]);
});
