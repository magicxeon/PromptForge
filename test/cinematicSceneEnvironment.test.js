import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { CinematicProjectRepository } from '../server/repositories/cinematic/CinematicProjectRepository.js';
import { normalizeCinematicSceneReference } from '../server/domain/cinematic/CinematicSceneEnvironment.js';
import { CinematicStoryboardAssetService } from '../server/domain/assets/CinematicStoryboardAssetService.js';
import { ReferenceProcessingService } from '../server/domain/reference-processing/ReferenceProcessingService.js';
import { ReferencePolicyRegistry } from '../server/domain/reference-processing/ReferencePolicyRegistry.js';
import { normalizeGenerationContext, createQueueOptions } from '../server/domain/generation/generationRequestService.js';
import { prepareGenerationReferences } from '../server/domain/generation/prepareGenerationReferences.js';
import { registerCinematicRoutes } from '../server/app/routes/cinematicRoutes.js';
import { createSingleCharacterCinematicProject } from './fixtures/cinematic/cinematicProjectFixtures.js';

const actor = { userId: 'scene_owner', username: 'alice', role: 'user' };
const source = { ...createSingleCharacterCinematicProject().scenes[0].shots[0].approvedStoryboardSource,
  assetId: 'asset_environment', contentHash: 'a'.repeat(64), sourceJobId: 'job_environment' };

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-environment-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const repository = new CinematicProjectRepository({ projectsFile: path.join(directory, 'projects.json') });
  let approvals = 0;
  const service = new CinematicApplicationService({ repository, videoGenerationService: { getStoredTaskSummaries: async () => [] },
    storyboardAssetService: {
      approveGenerationResult: async ({ jobId }) => { approvals++; return { ...structuredClone(source), sourceJobId: jobId }; },
      resolveSceneReference: async value => normalizeCinematicSceneReference(value),
      getGenerationPreview: async jobId => jobId.startsWith('pending') ? null : ({ jobId, imageUrl: '/outputs/environment.jpg', thumbnailUrl: '/outputs/environment.jpg' })
    } });
  const created = await service.createProject({ title: 'Location test', storyBrief: 'A rainy street.', durationSeconds: 30, platform: 'reels', mode: 'simple' }, actor);
  const project = await service.createSimpleScene(created.id, { expectedVersion: created.version, idempotencyKey: 'scene-create' }, actor);
  return { service, repository, project, approvals: () => approvals };
}

test('Scene image context/save/approve preserve all Shot media and feed only future still references', async t => {
  const { service, repository, project } = await fixture(t);
  const sceneId = project.scenes[0].id, shotId = project.scenes[0].shots[0].id;
  await repository.mutateForActor(project.id, actor, draft => {
    draft.scenes[0].location = 'Flower shop beside a curb'; draft.scenes[0].time = 'Rainy night';
    draft.scenes[0].shots[0].approvedStoryboardSource = { ...source, assetId: 'old_frame', sourceJobId: 'old_image' };
    draft.generationAttempts.push({ id: 'old_take', shotId, operation: 'cinematic_draft_clip', status: 'approved', outputAssetIds: ['video_old'] });
  });
  const before = await service.getProject(project.id, actor);
  const videoBefore = service.videoPacketCompiler.compile({ project: before, scene: before.scenes[0], shot: before.scenes[0].shots[0] });
  const baseline = await service.getStoryboardGenerationContext(project.id, sceneId, shotId, actor);
  const context = await service.getSceneEnvironmentContext(project.id, sceneId, actor);
  assert.match(context.compiledPrompt, /No people/);
  assert.match(context.compiledPrompt, /Flower shop.*\nRainy night/);
  const saved = await service.saveSceneEnvironment(project.id, sceneId, { expectedVersion: before.version,
    expectedSceneVersion: context.sceneVersion, environmentPrompt: 'A wet flower shop and amber practical lights.' }, actor);
  const next = await service.getSceneEnvironmentContext(project.id, sceneId, actor);
  assert.notEqual(context.promptFingerprint, next.promptFingerprint);
  const registered = await service.registerStoryboardBatchAttempts(project.id, { expectedVersion: saved.version, batchId: 'environment_batch',
    children: [{ sceneId, jobId: source.sourceJobId, estimateId: 'quote_env', metadata: { purpose: 'scene_environment',
      expectedSceneVersion: next.sceneVersion, promptFingerprint: next.promptFingerprint } }] }, actor);
  const approved = await service.approveSceneEnvironment(project.id, sceneId, { expectedVersion: registered.version, jobId: source.sourceJobId }, actor);
  assert.deepEqual(approved.scenes[0].shots, before.scenes[0].shots);
  assert.deepEqual(approved.generationAttempts[0], before.generationAttempts[0]);
  assert.equal(service.videoPacketCompiler.compile({ project: approved, scene: approved.scenes[0], shot: approved.scenes[0].shots[0] }).packetFingerprint, videoBefore.packetFingerprint);
  assert.equal(approved.scenes[0].approvedEnvironmentSource.assetId, source.assetId);
  const after = await service.getStoryboardGenerationContext(project.id, sceneId, shotId, actor);
  assert.deepEqual(after.cinematicSceneReference, { assetId: source.assetId, contentHash: source.contentHash });
  assert.equal(after.keyframeContract.sourceFingerprint, baseline.keyframeContract.sourceFingerprint);
  const replay = await service.approveSceneEnvironment(project.id, sceneId, { expectedVersion: registered.version, jobId: source.sourceJobId }, actor);
  assert.equal(replay.version, approved.version);
  const planSaved = await service.saveStoryPlan(project.id, { expectedVersion: approved.version, approved: false,
    scenes: approved.scenes.map(scene => ({ ...scene, approvedEnvironmentSource: { assetId: 'untrusted' }, environmentPrompt: 'untrusted' })) }, actor);
  assert.deepEqual(planSaved.scenes[0].approvedEnvironmentSource, approved.scenes[0].approvedEnvironmentSource);
  assert.equal(planSaved.scenes[0].environmentPrompt, approved.scenes[0].environmentPrompt);
});

test('Scene operations reject foreign actors, stale versions and unrelated candidate Jobs', async t => {
  const f = await fixture(t), sceneId = f.project.scenes[0].id;
  await assert.rejects(f.service.getSceneEnvironmentContext(f.project.id, sceneId, { ...actor, userId: 'other' }));
  await assert.rejects(f.service.approveSceneEnvironment(f.project.id, sceneId, { expectedVersion: f.project.version, jobId: 'unbound' }, actor), { code: 'cinematic_scene_source_unavailable' });
  assert.equal(f.approvals(), 0);
  await assert.rejects(f.service.saveSceneEnvironment(f.project.id, sceneId, { expectedVersion: 1, expectedSceneVersion: 1, environmentPrompt: 'Changed' }, actor), { code: 'cinematic_version_conflict' });
  const before = await f.service.getProject(f.project.id, actor);
  await assert.rejects(f.service.registerStoryboardBatchAttempts(f.project.id, { expectedVersion: before.version, batchId: 'bad',
    children: [{ sceneId, jobId: 'job_other', metadata: { purpose: 'scene_environment', expectedSceneVersion: 999 } }] }, actor), { code: 'cinematic_scene_environment_changed' });
  assert.deepEqual(await f.service.getProject(f.project.id, actor), before);
});

test('Scene binding is bounded, strips supplied URLs and remains in queued options', () => {
  const binding = { assetId: source.assetId, contentHash: source.contentHash };
  assert.deepEqual(normalizeCinematicSceneReference({ ...binding, referenceValue: 'https://untrusted.invalid' }), binding);
  assert.throws(() => normalizeCinematicSceneReference({ assetId: 'test', contentHash: 'bad' }), { code: 'cinematic_scene_reference_invalid' });
  const context = normalizeGenerationContext({ generationSurface: 'cinematic', generationMode: 'scene', cinematicSceneReference: binding });
  assert.deepEqual(createQueueOptions(context, { modelConfig: { defaults: {} } }).cinematicSceneReference, binding);
});

test('Project gallery includes only registered environments, paginates and permits explicit older cross-Scene reuse', async t => {
  const { service, repository, project } = await fixture(t);
  const sceneId = project.scenes[0].id;
  await repository.mutateForActor(project.id, actor, draft => {
    draft.generationAttempts.push(
      { id: 'image_a', sceneId: 'other_scene', operation: 'cinematic_scene_environment', generationJobId: 'job_old', promptFingerprint: 'older' },
      { id: 'image_b', sceneId, operation: 'cinematic_scene_environment', generationJobId: 'job_new', promptFingerprint: 'newer' },
      { id: 'image_c', sceneId, operation: 'cinematic_scene_environment', generationJobId: 'pending_job' },
      { id: 'look', sceneId, operation: 'cinematic_storyboard_still', generationJobId: 'job_look' }
    );
  });
  const page = await service.listSceneEnvironmentImages(project.id, sceneId, actor, { limit: 2 });
  assert.deepEqual(page.items.map(item => item.jobId), ['job_new']);
  assert.equal(page.nextCursor, 'job_new');
  const older = await service.listSceneEnvironmentImages(project.id, sceneId, actor, { cursor: page.nextCursor });
  assert.deepEqual(older.items.map(item => item.jobId), ['job_old']);
  assert.equal(older.nextCursor, null);
  await assert.rejects(service.listSceneEnvironmentImages(project.id, sceneId, { ...actor, userId: 'foreign' }));
  await assert.rejects(service.listSceneEnvironmentImages(project.id, sceneId, actor, { cursor: 'missing' }), { code: 'cinematic_scene_cursor_invalid' });
  await assert.rejects(service.approveSceneEnvironment(project.id, sceneId, { expectedVersion: project.version, jobId: 'job_old' }, actor), { code: 'cinematic_scene_source_unavailable' });
  await assert.rejects(service.approveSceneEnvironment(project.id, sceneId, { expectedVersion: project.version, jobId: 'job_look', reuse: true }, actor), { code: 'cinematic_scene_source_unavailable' });
  const selected = await service.approveSceneEnvironment(project.id, sceneId, { expectedVersion: project.version, jobId: 'job_old', reuse: true }, actor);
  assert.equal(selected.scenes[0].approvedEnvironmentSource.sourceJobId, 'job_old');
  assert.equal(selected.scenes[0].environmentReferenceEnabled, true);
  assert.deepEqual(selected.scenes[0].shots, project.scenes[0].shots);
  const before = await service.getStoryboardGenerationContext(project.id, sceneId, project.scenes[0].shots[0].id, actor);
  const disabled = await service.saveSceneEnvironment(project.id, sceneId, { expectedVersion: selected.version,
    expectedSceneVersion: selected.scenes[0].version, referenceEnabled: false }, actor);
  assert.equal(disabled.scenes[0].version, project.scenes[0].version);
  assert.deepEqual(disabled.scenes[0].approvedEnvironmentSource, selected.scenes[0].approvedEnvironmentSource);
  const after = await service.getStoryboardGenerationContext(project.id, sceneId, project.scenes[0].shots[0].id, actor);
  assert.equal(after.cinematicSceneReference, null);
  assert.equal(before.keyframeContract.sourceFingerprint, after.keyframeContract.sourceFingerprint);
  const roundTrip = await service.saveStoryPlan(project.id, { expectedVersion: disabled.version, approved: false,
    scenes: disabled.scenes.map(scene => ({ ...scene, environmentReferenceEnabled: true })) }, actor);
  assert.equal(roundTrip.scenes[0].environmentReferenceEnabled, false);
  const enabled = await service.saveSceneEnvironment(project.id, sceneId, { expectedVersion: roundTrip.version,
    expectedSceneVersion: roundTrip.scenes[0].version, referenceEnabled: true }, actor);
  assert.deepEqual(enabled.scenes[0].shots, roundTrip.scenes[0].shots);
  assert.deepEqual((await service.getStoryboardGenerationContext(project.id, sceneId, project.scenes[0].shots[0].id, actor)).cinematicSceneReference, before.cinematicSceneReference);
  assert.throws(() => service.saveSceneEnvironment(project.id, sceneId, { referenceEnabled: 'false' }, actor), { code: 'cinematic_scene_environment_invalid' });
});

test('Scene reference processing preserves Casts plus environment count and refuses silent removal', async () => {
  const service = new ReferenceProcessingService({ policyRegistry: new ReferencePolicyRegistry({ knownProcessorIds: ['image_probe', 'orientation_normalize'] }),
    processorRegistry: { process: () => { throw new Error('Verified original references must not be reprocessed'); } } });
  const context = { generationSurface: 'cinematic', selections: {}, imageReferences: {},
    cinematicCastReferences: [{ displayName: 'Lalin', contentHash: 'b'.repeat(64), referenceValue: '/outputs/look.jpg' }],
    cinematicSceneReference: { assetId: source.assetId, contentHash: source.contentHash, referenceValue: '/outputs/environment.jpg' } };
  const options = { actorContext: actor, providerId: 'gemini', modelId: 'fixture', modelConfig: { capabilities: { maxReferenceImages: 3 } } };
  const result = await service.processContext(structuredClone(context), options);
  assert.equal(result.providerPlan.referenceCount, 2);
  assert.deepEqual(result.providerPlan.orderedReferences.map(item => item.roles), [['character_reference'], ['environment_reference']]);
  await assert.rejects(service.processContext(structuredClone(context), { ...options, modelConfig: { capabilities: { maxReferenceImages: 1 } } }), { code: 'reference_capacity_exceeded' });
  let resolved = false;
  await prepareGenerationReferences({ ...context, cinematicCastReferences: [] }, { ...options,
    characterService: { validateGenerationContext: async () => null },
    sceneAssetService: { resolveSceneReference: async (binding, passedActor) => { assert.equal(passedActor, actor); resolved = true; return binding; } },
    processingService: { processContext: async () => { assert.equal(resolved, true); return {}; } } });
});

test('Owned immutable environment bytes are verified before use', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'scene-asset-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const assets = [];
  const assetRepository = { findBySourceJobIdForOwner: async () => null,
    create: async (value, owner) => { const asset = { ...value, id: 'asset_scene', ownerUserId: owner.userId }; assets.push(asset); return asset; },
    findByIdForOwner: async (id, userId) => assets.find(value => value.id === id && value.ownerUserId === userId) };
  await fs.writeFile(path.join(directory, 'job_scene.jpg'), 'scene-image-fixture');
  const service = new CinematicStoryboardAssetService({ assetRepository, outputsDirectory: directory,
    generationHistory: { getById: async () => ({ username: actor.username, imageUrl: '/outputs/job_scene.jpg' }) } });
  const approved = await service.approveGenerationResult({ jobId: 'job_scene' }, actor);
  assert.equal((await service.resolveSceneReference(approved, actor)).referenceValue, '/outputs/job_scene.jpg');
  await assert.rejects(service.resolveSceneReference(approved, { ...actor, userId: 'other' }), { code: 'cinematic_scene_source_unavailable' });
  await fs.writeFile(path.join(directory, 'job_scene.jpg'), 'changed');
  await assert.rejects(service.resolveSceneReference(approved, actor), { code: 'cinematic_storyboard_source_content_changed' });
});

test('Scene generation uses the existing batch owner and validates before submission', async t => {
  const f = await fixture(t), sceneId = f.project.scenes[0].id;
  const handlers = new Map(); let submits = 0;
  registerCinematicRoutes(Object.fromEntries(['get', 'post', 'patch', 'put', 'delete'].map(method => [method, (route, handler) => handlers.set(`${method}:${route}`, handler)])), {
    cinematicService: f.service, generationApplicationService: { submitBatch: async input => { submits++; assert.equal(input.operations[0].metadata.purpose, 'scene_environment'); return {}; } }
  });
  const context = await f.service.getSceneEnvironmentContext(f.project.id, sceneId, actor);
  const request = { generationSurface: 'cinematic', generationMode: 'scene', aspectRatio: f.project.aspectRatio, outputCount: 1,
    cinematicContainsPeople: false, cinematicFaceless: false, sceneBuilder: { manualPromptText: context.compiledPrompt } };
  const body = { expectedVersion: f.project.version, idempotencyKey: 'scene-test', operations: [{ purpose: 'scene_environment', sceneId,
    expectedSceneVersion: context.sceneVersion, promptFingerprint: context.promptFingerprint, generationRequest: request }] };
  const handler = handlers.get('post:/api/cinematic/projects/:projectId/storyboard-generation-batches');
  const res = { statusCode: 200, set() { return this; }, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  await handler({ params: { projectId: f.project.id }, body, actorContext: actor }, res);
  assert.equal(res.statusCode, 202); assert.equal(submits, 1);
  request.faceReferenceImageA = '/outputs/unrelated.jpg';
  await handler({ params: { projectId: f.project.id }, body, actorContext: actor }, res);
  assert.equal(res.statusCode, 409); assert.equal(submits, 1);
});
