import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { registerCinematicRoutes } from '../server/app/routes/cinematicRoutes.js';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { cinematicStoryboardPromptComposer } from '../server/domain/cinematic/CinematicStoryboardPromptComposer.js';
import { storyboardKeyframeContractCompiler } from '../server/domain/cinematic/StoryboardKeyframeContractCompiler.js';
import { GenerationApplicationService } from '../server/domain/generation/GenerationApplicationService.js';
import { compileGenerationContext, compilePromptFromGenerationContext, createQueueOptions, normalizeGenerationContext } from '../server/domain/generation/generationRequestService.js';
import { CinematicProjectRepository } from '../server/repositories/cinematic/CinematicProjectRepository.js';
import { createSingleCharacterCinematicProject } from './fixtures/cinematic/cinematicProjectFixtures.js';

const actor = { userId: 'manual_alice', username: 'alice', role: 'user' };
const other = { userId: 'manual_bob', username: 'alice', role: 'user' };
const setup = { title: 'Manual film', storyBrief: 'A curtain moves beside a cup.', durationSeconds: 30, platform: 'tiktok', mode: 'simple' };
const events = [
  { startMs: 0, endMs: 1250, description: 'The curtain lifts in the breeze.' },
  { startMs: 1500, endMs: 5000, description: 'The curtain settles beside the cup.' }
];
const rowRoute = '/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/';

async function fixture(t, mode = 'simple') {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-manual-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const projectsFile = path.join(directory, 'projects.json');
  const repository = new CinematicProjectRepository({ projectsFile });
  const forbiddenCalls = [];
  const offline = new Proxy({}, { get: (_target, method) => () => {
    forbiddenCalls.push(String(method));
    throw new Error(`Offline test must not call ${String(method)}.`);
  } });
  const service = new CinematicApplicationService({
    repository,
    storyboardAssetService: offline, wardrobeAuthorityService: offline, characterAuthorizationService: offline,
    lookService: offline, generatedCastService: offline, providerTaskRepository: offline, videoCapabilities: offline,
    storyEnhancementService: offline, wardrobeSuggestionService: offline, storyPlanService: offline, clipBundleService: offline,
    videoGenerationService: { getStoredTaskSummaries: async () => [] },
    assetRepository: { findByIdForOwner: async (id, owner) => {
      assert.equal(owner, actor.userId);
      return { id, publicUrl: `/api/fixtures/${id}`, status: 'active' };
    } }
  });
  t.after(() => assert.deepEqual(forbiddenCalls, [], 'No provider, generation, live task or asset mutation calls'));
  const project = await service.createProject({ ...setup, mode }, actor);
  return { service, repository, project, projectsFile };
}

function inputFor(project, patch = {}, sceneIndex = 0, shotIndex = 0) {
  const shot = project.scenes[sceneIndex].shots[shotIndex];
  return {
    expectedVersion: project.version, expectedShotVersion: shot.version,
    title: shot.title || 'Window', imagePrompt: shot.prompt || 'A cup beside a closed curtain at the opening instant.',
    durationMs: shot.durationMs, castAssignmentIds: [...shot.castAssignmentIds], wardrobeLookIds: [...shot.wardrobeLookIds],
    videoActionTimeline: structuredClone(shot.videoActionTimeline?.length ? shot.videoActionTimeline : events), ...patch
  };
}

function save(service, project, patch = {}) {
  return service.saveManualStoryboard(project.id, project.scenes[0].id, project.scenes[0].shots[0].id, inputFor(project, patch), actor);
}

function settings(service, project, storyboardFaceless, patch = {}) {
  return service.updateStoryboardSettings(project.id, project.scenes[0].id, project.scenes[0].shots[0].id, {
    expectedVersion: project.version, expectedShotVersion: project.scenes[0].shots[0].version, storyboardFaceless, ...patch
  }, actor);
}

async function savedFixture(t, { mode = 'simple', cast = false, media = false, siblings = false } = {}) {
  const f = await fixture(t, mode);
  if (cast) await f.repository.mutateForActor(f.project.id, actor, draft => {
    draft.castAssignments = createSingleCharacterCinematicProject().castAssignments;
  });
  const created = await f.service.createSimpleScene(f.project.id, { expectedVersion: 1, idempotencyKey: 'initial-row' }, actor);
  f.project = await save(f.service, created);
  if (!media && !siblings) return f;
  const context = await f.service.getStoryboardGenerationContext(f.project.id, f.project.scenes[0].id, f.project.scenes[0].shots[0].id, actor);
  await f.repository.mutateForActor(f.project.id, actor, draft => {
    const scene = draft.scenes[0], shot = scene.shots[0];
    if (media) {
      const source = { ...createSingleCharacterCinematicProject().scenes[0].shots[0].approvedStoryboardSource,
        storyboardRenderStyle: 'faceless_previs_v1' };
      Object.assign(shot, { storyboardStatus: 'approved', approvedStoryboardSource: source,
        approvedStoryboardAttemptId: 'still_target', approvedVideoAttemptId: 'take_target',
        approvedVideoSourceFingerprint: source.sourceFingerprint, videoReferenceMode: 'storyboard_and_looks' });
      draft.generationAttempts = [
        { id: 'still_target', sceneId: scene.id, shotId: shot.id, operation: 'cinematic_storyboard_still', status: 'approved',
          sourceFingerprint: source.sourceFingerprint, keyframeContractFingerprint: context.keyframeContract.sourceFingerprint, outputAssetIds: [source.assetId] },
        { id: 'take_target', sceneId: scene.id, shotId: shot.id, operation: 'cinematic_draft_clip', status: 'approved',
          reviewDecision: 'approved', referenceMode: 'storyboard_and_looks', sourceFingerprint: source.sourceFingerprint,
          outputAsset: { id: 'video_target', publicUrl: '/api/fixtures/target.mp4' }, downstreamSourceStatus: 'current' },
        { id: 'take_previous', sceneId: scene.id, shotId: shot.id, operation: 'cinematic_draft_clip', status: 'succeeded',
          sourceFingerprint: source.sourceFingerprint, outputAsset: { id: 'video_previous', publicUrl: '/api/fixtures/previous.mp4' },
          downstreamSourceStatus: 'current' }
      ];
      draft.timelineVersions = [{ id: 'timeline', status: 'active', exportEligible: true,
        entries: [{ id: 'clip_target', shotId: shot.id, approvedVideoAttemptId: 'take_target', sourceFingerprint: source.sourceFingerprint,
          durationMs: shot.durationMs, downstreamSourceStatus: 'current' }] }];
    }
    if (siblings) {
      const sibling = { ...structuredClone(shot), id: 'sibling_shot', title: 'Protected sibling' };
      scene.shots.push(sibling);
      scene.shotOrder.push(sibling.id);
      scene.durationMs += sibling.durationMs;
      const otherScene = { ...structuredClone(scene), id: 'other_scene', title: 'Protected scene',
        shots: [{ ...structuredClone(sibling), id: 'other_shot' }], shotOrder: ['other_shot'] };
      draft.scenes.push(otherScene);
      draft.generationAttempts.push({ id: 'sibling_take', sceneId: scene.id, shotId: sibling.id, operation: 'cinematic_draft_clip',
        status: 'approved', sourceFingerprint: 'sibling_source', outputAsset: { publicUrl: '/api/fixtures/sibling.mp4' }, downstreamSourceStatus: 'current' });
      if (media) draft.timelineVersions[0].entries.push({ id: 'clip_sibling', shotId: sibling.id, approvedVideoAttemptId: 'sibling_take', downstreamSourceStatus: 'current' });
    }
  });
  f.project = await f.service.getProject(f.project.id, actor);
  return f;
}

async function legacyAdvancedFixture(t, explicitCastMode = false) {
  const f = await fixture(t, 'advanced');
  const legacy = createSingleCharacterCinematicProject();
  await f.repository.mutateForActor(f.project.id, actor, draft => {
    for (const key of ['castAssignments', 'scenes', 'storyPlanVersions', 'activeStoryPlanVersionId',
      'storySourceVersions', 'activeStorySourceVersionId', 'generationAttempts', 'timelineVersions', 'activeTimelineVersionId']) {
      draft[key] = structuredClone(legacy[key]);
    }
    const scene = draft.scenes[0], shot = scene.shots[0];
    if (explicitCastMode) shot.castMode = 'selected';
    const contract = storyboardKeyframeContractCompiler.compile({ project: draft, scene, shot });
    draft.generationAttempts.find(item => item.id === shot.approvedStoryboardAttemptId).keyframeContractFingerprint = contract.sourceFingerprint;
  });
  f.project = await f.service.getProject(f.project.id, actor);
  return f;
}

test('manual rows: creation appends one blank Scene/Shot without plans, media or automatic generation', async t => {
  const { service, project } = await fixture(t);
  const created = await service.createSimpleScene(project.id, { expectedVersion: 1, idempotencyKey: 'new-row' }, actor);
  assert.equal(created.version, 2);
  assert.equal(created.scenes.length, 1);
  const scene = created.scenes[0], shot = scene.shots[0];
  assert.equal(scene.shots.length, 1);
  assert.deepEqual(scene.shotOrder, [shot.id]);
  assert.equal(shot.manualStoryboard, true);
  assert.equal(shot.manualStillAuthority, true);
  assert.equal(shot.storyboardFaceless, false);
  assert.equal(shot.prompt, '');
  assert.deepEqual(shot.videoActionTimeline, []);
  assert.equal(shot.storyboardStatus, 'draft');
  assert.equal(shot.approvedStoryboardSource, undefined);
  for (const key of ['storyPlanVersions', 'generationAttempts', 'timelineVersions']) assert.deepEqual(created[key], []);
  assert.equal(created.activeStoryPlanVersionId, null);
  assert.equal(created.activeStage, project.activeStage);
});

test('manual rows: concurrent idempotency replays append once and stale new commands fail', async t => {
  const { service, repository, project, projectsFile } = await fixture(t);
  const command = { expectedVersion: 1, idempotencyKey: 'same-command' };
  const [first, replay] = await Promise.all([service.createSimpleScene(project.id, command, actor), service.createSimpleScene(project.id, command, actor)]);
  assert.equal(replay.version, first.version);
  assert.deepEqual(replay.scenes, first.scenes);
  assert.equal(replay.commandReceipts.length, 1);
  const before = await fs.readFile(projectsFile, 'utf8');
  await assert.rejects(service.createSimpleScene(project.id, { ...command, idempotencyKey: 'different-command' }, actor), { code: 'cinematic_version_conflict', statusCode: 409 });
  await assert.rejects(service.createSimpleScene(project.id, command, other), { code: 'cinematic_project_not_found', statusCode: 404 });
  assert.equal(await fs.readFile(projectsFile, 'utf8'), before);
  assert.equal((await repository.findForActor(project.id, actor)).scenes.length, 1);
  const second = await service.createProject(setup, actor);
  assert.equal((await service.createSimpleScene(second.id, command, actor)).scenes.length, 1, 'Receipts are Project-scoped');
});

test('manual rows: invalid idempotency keys and the 24-Scene limit do not mutate storage', async t => {
  const { service, repository, project, projectsFile } = await fixture(t);
  for (const idempotencyKey of ['', ' ', undefined, 'x'.repeat(161)]) {
    await assert.rejects(async () => service.createSimpleScene(project.id, { expectedVersion: 1, idempotencyKey }, actor), { code: 'cinematic_idempotency_key_required' });
  }
  const created = await service.createSimpleScene(project.id, { expectedVersion: 1, idempotencyKey: 'row-1' }, actor);
  await repository.mutateForActor(project.id, actor, draft => {
    draft.scenes = Array.from({ length: 24 }, (_, index) => ({ ...structuredClone(created.scenes[0]), id: `scene_${index}` }));
  });
  const before = await fs.readFile(projectsFile, 'utf8');
  await assert.rejects(service.createSimpleScene(project.id, { expectedVersion: 2, idempotencyKey: 'row-25' }, actor), { code: 'cinematic_scene_limit' });
  assert.equal(await fs.readFile(projectsFile, 'utf8'), before);
});

test('manual rows: all commands enforce actor ownership and project/Shot versions without partial writes', async t => {
  const { service, project, projectsFile } = await savedFixture(t);
  const scene = project.scenes[0], shot = scene.shots[0], body = inputFor(project);
  const calls = [
    actorContext => service.createSimpleScene(project.id, { expectedVersion: project.version, idempotencyKey: 'unauthorized' }, actorContext),
    actorContext => service.saveManualStoryboard(project.id, scene.id, shot.id, body, actorContext),
    actorContext => service.updateStoryboardSettings(project.id, scene.id, shot.id, { ...body, storyboardFaceless: true }, actorContext)
  ];
  const before = await fs.readFile(projectsFile, 'utf8');
  for (const call of calls) {
    await assert.rejects(call(other), { code: 'cinematic_project_not_found', statusCode: 404 });
    await assert.rejects(call(null), { code: 'actor_context_required', statusCode: 401 });
  }
  for (const [patch, code] of [[{ expectedVersion: 999 }, 'cinematic_version_conflict'], [{ expectedShotVersion: 999 }, 'cinematic_shot_version_conflict']]) {
    await assert.rejects(save(service, project, patch), { code, statusCode: 409 });
    await assert.rejects(settings(service, project, true, patch), { code, statusCode: 409 });
  }
  for (const [sceneId, shotId] of [['wrong_scene', shot.id], [scene.id, 'wrong_shot']]) {
    await assert.rejects(service.saveManualStoryboard(project.id, sceneId, shotId, body, actor), { code: 'cinematic_shot_not_found', statusCode: 404 });
    await assert.rejects(service.updateStoryboardSettings(project.id, sceneId, shotId, { ...body, storyboardFaceless: true }, actor), { code: 'cinematic_shot_not_found', statusCode: 404 });
  }
  assert.equal(await fs.readFile(projectsFile, 'utf8'), before);
});

test('manual rows: completed and archived Projects reject every authoring command', async t => {
  const { service, repository, project } = await savedFixture(t);
  for (const status of ['completed', 'archived']) {
    await repository.mutateForActor(project.id, actor, draft => { draft.status = status; });
    await assert.rejects(service.createSimpleScene(project.id, { expectedVersion: project.version, idempotencyKey: status }, actor), { code: 'cinematic_project_not_editable' });
    await assert.rejects(save(service, project), { code: 'cinematic_project_not_editable' });
    await assert.rejects(settings(service, project, true), { code: 'cinematic_project_not_editable' });
  }
});

test('manual rows: invalid timelines and foreign Cast/Looks fail atomically rather than sorting or shortening', async t => {
  const { service, project, projectsFile } = await savedFixture(t, { cast: true });
  const event = { startMs: 0, endMs: 1000, description: 'Move.' };
  const invalid = [
    { videoActionTimeline: undefined }, { videoActionTimeline: {} }, { videoActionTimeline: [null] },
    { videoActionTimeline: [{ ...event, startMs: -1 }] }, { videoActionTimeline: [{ ...event, startMs: 0.5 }] },
    { videoActionTimeline: [{ ...event, endMs: '1000' }] }, { videoActionTimeline: [{ ...event, endMs: 0 }] },
    { videoActionTimeline: [{ ...event, endMs: 5001 }] }, { videoActionTimeline: [{ ...event, description: ' ' }] },
    { videoActionTimeline: [{ ...event, description: 'x'.repeat(1201) }] },
    { videoActionTimeline: [event, { ...event, startMs: 500, endMs: 2000 }] },
    { videoActionTimeline: [{ ...event, startMs: 2000, endMs: 3000 }, event] },
    { videoActionTimeline: Array.from({ length: 13 }, (_, index) => ({ ...event, startMs: index * 100, endMs: (index + 1) * 100 })) },
    { durationMs: 999 }, { durationMs: 30001 }, { durationMs: 5000.5 },
    { imagePrompt: 'x'.repeat(4001) }, { title: 'x'.repeat(101) },
    { castAssignmentIds: ['foreign_cast'] }, { castAssignmentIds: [project.castAssignments[0].id, project.castAssignments[0].id] },
    { wardrobeLookIds: ['foreign_look'] }, { castAssignmentIds: [] }
  ];
  const before = await fs.readFile(projectsFile, 'utf8');
  for (const patch of invalid) {
    await assert.rejects(save(service, project, patch), { code: 'cinematic_manual_storyboard_invalid', statusCode: 400 });
    assert.equal(await fs.readFile(projectsFile, 'utf8'), before);
  }
});

test('manual rows: exact event text and ordered boundary intervals persist; empty drafts and no-op saves are valid', async t => {
  const { service, project } = await savedFixture(t);
  const timeline = Array.from({ length: 12 }, (_, index) => ({
    startMs: index * 2500, endMs: (index + 1) * 2500,
    description: index ? `Event ${index + 1}.` : `Keep  double spaces\nand a newline. ${'x'.repeat(1100)}`
  }));
  const saved = await save(service, project, { durationMs: 30000, videoActionTimeline: timeline });
  assert.deepEqual(saved.scenes[0].shots[0].videoActionTimeline, timeline);
  assert.deepEqual((await service.getProject(saved.id, actor)).scenes[0].shots[0].videoActionTimeline, timeline);
  const replay = await save(service, saved);
  assert.equal(replay.version, saved.version);
  assert.equal(replay.scenes[0].shots[0].version, saved.scenes[0].shots[0].version);
  const empty = await save(service, saved, { videoActionTimeline: [] });
  const context = await service.getProduceShotContext(empty.id, empty.scenes[0].id, empty.scenes[0].shots[0].id, actor, 'text_only');
  assert.equal(context.generationEligible, false);
  assert.equal(context.blockingReason, 'cinematic_video_timeline_required');
});

test('manual rows: timeline and duration changes preserve still fingerprint, approved source and sibling media', async t => {
  const { service, project } = await savedFixture(t, { media: true, siblings: true });
  const scene = project.scenes[0], shot = scene.shots[0];
  const before = await service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor);
  const saved = await save(service, project, { durationMs: 6000, videoActionTimeline: [{ startMs: 0, endMs: 6000, description: 'The curtain sways.' }] });
  const after = await service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor);
  assert.equal(after.keyframeContract.sourceFingerprint, before.keyframeContract.sourceFingerprint);
  assert.equal(after.keyframeContract.providerIndependentPrompt, before.keyframeContract.providerIndependentPrompt);
  assert.deepEqual(saved.scenes[0].shots[0].approvedStoryboardSource, shot.approvedStoryboardSource);
  assert.equal(saved.scenes[0].shots[0].storyboardStatus, 'approved');
  assert.deepEqual(saved.generationAttempts.find(item => item.id === 'still_target'), project.generationAttempts.find(item => item.id === 'still_target'));
  assertProtectedSiblings(project, saved);
  assertTakeMediaRetained(project, saved);
  assert.equal(saved.generationAttempts.find(item => item.id === 'take_target').downstreamSourceStatus, 'packet_changed');
  assert.equal(saved.timelineVersions[0].entries[0].downstreamSourceStatus, 'packet_changed');
  assert.equal(saved.scenes[0].durationMs, 11000);
});

test('manual rows: image edits retain original sources and Takes and do not flatten a legacy multi-Shot Scene', async t => {
  const { service, repository, project } = await savedFixture(t, { media: true, siblings: true, mode: 'advanced' });
  await repository.mutateForActor(project.id, actor, draft => {
    delete draft.scenes[0].shots[0].manualStoryboard;
    draft.storyPlanVersions = [{ id: 'previous-plan', status: 'superseded', scenes: structuredClone(draft.scenes) }];
  });
  const before = await service.getProject(project.id, actor);
  const changed = await save(service, before, { imagePrompt: 'A cup on a different table.' });
  assert.equal(changed.scenes[0].shots[0].manualStoryboard, true);
  assert.equal(changed.scenes[0].shots[0].storyboardStatus, 'draft');
  assert.deepEqual(changed.scenes[0].shots[0].approvedStoryboardSource, before.scenes[0].shots[0].approvedStoryboardSource);
  assert.equal(changed.scenes[0].shots[0].approvedStoryboardAttemptId, 'still_target');
  assert.deepEqual(changed.storyPlanVersions, before.storyPlanVersions);
  assertProtectedSiblings(before, changed);
  assertTakeMediaRetained(before, changed);
});

for (const explicitCastMode of [false, true]) test(`manual rows: timeline-only Advanced conversion preserves approved still authority, explicitCastMode=${explicitCastMode}`, async t => {
  const { service, project } = await legacyAdvancedFixture(t, explicitCastMode);
  const scene = project.scenes[0], shot = scene.shots[0];
  assert.equal(shot.manualStoryboard, undefined);
  assert.equal(shot.manualStillAuthority, undefined);
  const before = storyboardKeyframeContractCompiler.compile({ project, scene, shot });
  const still = project.generationAttempts.find(item => item.id === shot.approvedStoryboardAttemptId);
  assert.equal(still.keyframeContractFingerprint, before.sourceFingerprint);
  const timeline = [{ startMs: 0, endMs: shot.durationMs, description: 'The character slowly turns toward the window.' }];
  const saved = await save(service, project, { videoActionTimeline: timeline });
  const savedShot = saved.scenes[0].shots[0];
  assert.equal(savedShot.manualStoryboard, true);
  assert.equal(savedShot.manualStillAuthority, false, 'Video-only editing must not take over legacy still authority');
  assert.deepEqual(savedShot.videoActionTimeline, timeline);
  const after = storyboardKeyframeContractCompiler.compile({ project: saved, scene: saved.scenes[0], shot: savedShot });
  assert.equal(after.sourceFingerprint, before.sourceFingerprint);
  assert.equal(after.providerIndependentPrompt, before.providerIndependentPrompt);
  assert.equal(savedShot.prompt, shot.prompt);
  assert.equal(savedShot.storyboardStatus, 'approved');
  assert.deepEqual(savedShot.approvedStoryboardSource, shot.approvedStoryboardSource);
  assert.deepEqual(saved.generationAttempts.find(item => item.id === still.id), still);
  assertTakeMediaRetained(project, saved);
  const context = await service.getStoryboardGenerationContext(saved.id, scene.id, shot.id, actor);
  assert.equal(context.cinematicManualStoryboard, false);
  assert.equal(context.keyframeContract.sourceFingerprint, before.sourceFingerprint);

  const edited = await save(service, saved, { imagePrompt: 'A new opening image: the character holds a closed book.' });
  assert.equal(edited.scenes[0].shots[0].manualStillAuthority, true);
  const editedContext = await service.getStoryboardGenerationContext(edited.id, scene.id, shot.id, actor);
  assert.equal(editedContext.cinematicManualStoryboard, true);
  assert.notEqual(editedContext.keyframeContract.sourceFingerprint, before.sourceFingerprint);
});

test('manual rows: Simple stage bypass preserves the Advanced current-plan approval gate', async t => {
  const { service, repository, project } = await fixture(t);
  let simple = project;
  for (const stage of ['storyboard', 'produce', 'finish']) simple = await service.setActiveStage(simple.id, stage, simple.version, actor);
  assert.equal(simple.activeStage, 'finish');
  assert.deepEqual(simple.storyPlanVersions, []);
  const advanced = await service.createProject({ ...setup, mode: 'advanced' }, actor);
  for (const stage of ['storyboard', 'produce', 'finish']) {
    await assert.rejects(service.setActiveStage(advanced.id, stage, advanced.version, actor), { code: 'cinematic_story_plan_approval_required', statusCode: 409 });
  }
  await repository.mutateForActor(advanced.id, actor, draft => {
    draft.storyPlanVersions = [{ id: 'approved-plan', status: 'approved', storySourceVersionId: draft.activeStorySourceVersionId }];
    draft.activeStoryPlanVersionId = 'approved-plan';
  });
  assert.equal((await service.setActiveStage(advanced.id, 'storyboard', advanced.version, actor)).activeStage, 'storyboard');
});

test('manual rows: saved image prompt and timeline are ready without hidden legacy direction fields', async t => {
  for (const cast of [false, true]) {
    const { service, project } = await savedFixture(t, { cast });
    const scene = project.scenes[0], shot = scene.shots[0];
    for (const field of ['visibleMoment', 'subjectAction', 'emotionalTarget', 'framing', 'performance', 'blocking']) assert.equal(shot[field], '');
    const still = await service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor);
    const video = await service.getProduceShotContext(project.id, scene.id, shot.id, actor, cast ? 'looks_only' : 'text_only');
    assert.equal(still.generationEligible, true, JSON.stringify({ reason: still.blockingReason, findings: still.keyframeContract.findings }));
    assert.equal(still.blockingReason, null);
    assert.equal(video.generationEligible, true, JSON.stringify({ reason: video.blockingReason, findings: video.videoPacket.findings }));
    assert.equal(video.blockingReason, null);
    const lineage = await service.getDataLineage(project.id, { sceneId: scene.id, shotId: shot.id }, actor);
    assert.equal(lineage.findings.some(item => ['cinematic_lineage_story_plan_missing', 'cinematic_lineage_scene_beat_missing',
      'cinematic_lineage_shot_visible_moment_missing', 'cinematic_lineage_shot_action_missing', 'cinematic_lineage_shot_emotion_missing'].includes(item.code)), false);
    const blank = await save(service, project, { imagePrompt: '' });
    assert.equal((await service.getStoryboardGenerationContext(blank.id, scene.id, shot.id, actor)).generationEligible, false);
  }
});

test('manual rows: readiness still rejects missing Cast, missing Look assets and unlocked Looks', async t => {
  const { service, repository, project } = await savedFixture(t, { cast: true });
  const scene = project.scenes[0], shot = scene.shots[0];
  assert.equal((await service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor)).generationEligible, true);
  const assetRepository = service.assetRepository;
  service.assetRepository = { findByIdForOwner: async () => null };
  assert.equal((await service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor)).blockingReason, 'cinematic_storyboard_look_asset_unavailable');
  service.assetRepository = assetRepository;
  await repository.mutateForActor(project.id, actor, draft => { draft.castAssignments[0].looks[0].locked = false; });
  assert.equal((await service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor)).blockingReason, 'cinematic_storyboard_look_not_ready');
  await repository.mutateForActor(project.id, actor, draft => { draft.castAssignments = []; });
  assert.equal((await service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor)).blockingReason, 'cinematic_storyboard_character_not_ready');
});

test('manual rows: exactly one explicit Look per selected Cast is required, without Scene Look inheritance', async t => {
  const { service, repository, project } = await savedFixture(t, { cast: true });
  const scene = project.scenes[0], shot = scene.shots[0];
  const originalLookId = shot.wardrobeLookIds[0];
  const empty = await save(service, project, { wardrobeLookIds: [] });
  assert.ok(empty.scenes[0].wardrobeLookIds.includes(originalLookId), 'The Scene still owns its original Look');
  const still = await service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor);
  assert.deepEqual(still.keyframeContract.lookAuthority, []);
  assert.equal(still.generationEligible, false);
  assert.ok(still.keyframeContract.findings.some(item => item.code === 'look_authority_not_ready' && item.fieldPath === 'shot.wardrobeLookIds'));
  assert.equal((await service.getProduceShotContext(project.id, scene.id, shot.id, actor, 'looks_only')).blockingReason, 'look_authority_not_ready');
  await repository.mutateForActor(project.id, actor, draft => {
    const looks = draft.castAssignments[0].looks;
    looks.push({ ...structuredClone(looks[0]), id: 'alternate_look' });
  });
  const multiple = await save(service, empty, { wardrobeLookIds: [originalLookId, 'alternate_look'] });
  assert.equal((await service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor)).generationEligible, false);
  assert.equal((await service.getProduceShotContext(project.id, scene.id, shot.id, actor, 'looks_only')).blockingReason, 'look_authority_not_ready');
  await save(service, multiple, { wardrobeLookIds: [originalLookId] });
  assert.equal((await service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor)).generationEligible, true);
  assert.equal((await service.getProduceShotContext(project.id, scene.id, shot.id, actor, 'looks_only')).generationEligible, true);
});

const stillVisualPrompt = [
  'STORYBOARD KEYFRAME CONTRACT cinematic-storyboard-keyframe-v2',
  'KEYFRAME MOMENT:\nOpening instant: Nara holds a cup; Mai stands frame left. No action has begun.',
  'SUBJECT AUTHORITY:\nNara and Mai; preserve authorized identity.',
  'VISIBLE PERFORMANCE:\nNara narrows her eyes toward Mai.',
  'CAMERA AND COMPOSITION:\nMedium wide, eye level; heads retain their authored orientation.'
].join('\n\n');

function stillRequest(patch = {}) {
  return {
    provider: 'modelark', mode: 'normal', generationMode: 'scene', generationSurface: 'cinematic',
    selections: {}, aspectRatio: '9:16', imageReferences: {}, cinematicContainsPeople: true,
    sceneBuilder: { authoringMode: 'manual', manualPromptText: stillVisualPrompt },
    referenceRoleManifest: [
      { index: 1, roles: ['template_baseline_reference'] },
      { index: 2, roles: ['character_reference'], castNames: ['Nara'] },
      { index: 3, roles: ['character_reference'], castNames: ['Mai'] }
    ], ...patch
  };
}

function storyboardBatchOperation(project, context) {
  const scene = project.scenes.find(item => item.id === context.sceneId);
  const shot = scene.shots.find(item => item.id === context.shotId);
  return {
    sceneId: scene.id, shotId: shot.id, expectedShotVersion: shot.version,
    keyframeContractFingerprint: context.keyframeContract.sourceFingerprint,
    generationRequest: stillRequest({
      submodel: 'offline_model', aspectRatio: project.aspectRatio, outputCount: 1,
      cinematicManualStoryboard: context.cinematicManualStoryboard, cinematicFaceless: context.cinematicFaceless,
      cinematicCastReferences: context.cinematicCastReferences, cinematicContainsPeople: context.cinematicContainsPeople,
      characterProfileContext: context.characterProfileContext, referenceRoleManifest: [],
      characterReferenceImageA: context.references?.character_reference,
      outfitReferenceImageFront: context.references?.outfit_front, outfitReferenceImageBack: context.references?.outfit_back,
      styleReferenceImageA: context.references?.style_reference,
      sceneBuilder: { authoringMode: 'manual', manualPromptText: context.keyframeContract.providerIndependentPrompt }
    })
  };
}

function longImagePrompt(length) {
  const tail = '; keep the cup handle pointed left and the door fully closed.';
  return 'Natural light falls across the dry tabletop. '.repeat(Math.ceil(length / 40)).slice(0, length - tail.length) + tail;
}

for (const cinematicFaceless of [false, true]) test(`manual still: complete 1700-character prompt survives compiler and normalized composition, faceless=${cinematicFaceless}`, async t => {
  const { service, project } = await savedFixture(t, { cast: true });
  const imagePrompt = longImagePrompt(1700);
  assert.equal(imagePrompt.length, 1700);
  let saved = await save(service, project, { imagePrompt });
  saved = await settings(service, saved, cinematicFaceless);
  const scene = saved.scenes[0], shot = scene.shots[0];
  assert.equal(shot.manualStillAuthority, true);
  const context = await service.getStoryboardGenerationContext(saved.id, scene.id, shot.id, actor);
  assert.equal(context.generationEligible, true);
  assert.equal(context.cinematicManualStoryboard, true);
  const direct = storyboardKeyframeContractCompiler.compile({ project: saved, scene, shot });
  for (const contract of [direct, context.keyframeContract]) {
    assert.equal(contract.authorDirection, imagePrompt);
    assert.equal(contract.providerIndependentPrompt.split(imagePrompt).length, 2, 'Full image text appears once, including its final instruction');
  }
  const { generationRequest } = storyboardBatchOperation(saved, context);
  const { context: normalized, compiledPrompt } = compileGenerationContext(generationRequest, actor);
  assert.equal(normalized.cinematicManualStoryboard, true);
  assert.equal(normalized.cinematicFaceless, cinematicFaceless);
  const composed = cinematicStoryboardPromptComposer.compose({ context: normalized, visualPrompt: context.keyframeContract.providerIndependentPrompt });
  for (const prompt of [composed, compiledPrompt]) {
    assert.equal(prompt.split(imagePrompt).length, 2, 'Neither the compiler nor composer may clip authored image authority');
    assert.ok(prompt.length <= 4700);
  }
  assert.equal((await service.getProject(saved.id, actor)).scenes[0].shots[0].prompt, imagePrompt);
});

test('manual still: normalization is opt-in and does not enable manual authority on other surfaces', () => {
  for (const cinematicManualStoryboard of [undefined, false, true]) {
    assert.equal(normalizeGenerationContext(stillRequest({ cinematicManualStoryboard }), actor).cinematicManualStoryboard, cinematicManualStoryboard === true);
  }
  for (const generationSurface of ['studio', 'playground']) {
    assert.equal(normalizeGenerationContext(stillRequest({ generationSurface, cinematicManualStoryboard: true }), actor).cinematicManualStoryboard, false);
  }
});

test('manual still: 4000-character image authority rejects explicitly before queue, credit or provider dispatch', async t => {
  const { service, project, projectsFile } = await savedFixture(t);
  const imagePrompt = longImagePrompt(4000);
  assert.equal(imagePrompt.length, 4000);
  const saved = await save(service, project, { imagePrompt });
  const scene = saved.scenes[0], shot = scene.shots[0];
  const context = await service.getStoryboardGenerationContext(saved.id, scene.id, shot.id, actor);
  assert.equal(context.cinematicManualStoryboard, true);
  assert.ok(context.keyframeContract.providerIndependentPrompt.includes(imagePrompt), 'Keep the text until an explicit budget rejection');
  const forbiddenCalls = [];
  const forbidden = new Proxy({}, { get: (_target, method) => () => {
    forbiddenCalls.push(String(method));
    throw new Error(`Offline test must not call ${String(method)}.`);
  } });
  const generation = new GenerationApplicationService({
    providerRegistry: { resolveSelection: () => ({ provider: { id: 'modelark' }, model: { id: 'offline_model', defaults: {} } }) },
    queueManager: new Proxy(forbidden, { get: (target, method) => method === 'subscribeLifecycle' ? undefined : target[method] }),
    creditService: forbidden, castingExportService: forbidden, templateCoreService: forbidden,
    generationGroupRepository: forbidden, promptRefinementService: forbidden,
    telemetry: { start: () => () => {} }
  });
  const before = await fs.readFile(projectsFile, 'utf8');
  for (const cinematicFaceless of [false, true]) {
    const request = { ...storyboardBatchOperation(saved, context).generationRequest, cinematicFaceless };
    const normalized = normalizeGenerationContext(request, actor);
    assert.equal(normalized.cinematicManualStoryboard, true);
    assert.throws(() => cinematicStoryboardPromptComposer.compose({ context: normalized, visualPrompt: context.keyframeContract.providerIndependentPrompt }), /prompt.*exceeds.*budget/i);
    assert.throws(() => compileGenerationContext(request, actor), /prompt.*exceeds.*budget/i);
    await assert.rejects(generation.submit({ body: request, actorContext: actor, userRole: actor.role, requestId: `offline-overflow-${cinematicFaceless}` }), /prompt.*exceeds.*budget/i);
  }
  assert.deepEqual(forbiddenCalls, []);
  assert.equal(await fs.readFile(projectsFile, 'utf8'), before);
});

function assertCompleteFacePrompt(prompt, hasReferences = true) {
  assert.match(prompt, /complete natural faces/);
  assert.match(prompt, /EACH person's own Look Sheet portrait/);
  if (hasReferences) assert.match(prompt, /Scene references control framing, geometry, body pose and head direction, never facial identity/);
  assert.match(prompt, /authored instant BEFORE action/);
  assert.doesNotMatch(prompt, /with BLANK FACES|Leave the ENTIRE face surface unrendered|ZERO eyes|Suppress ALL facial features|BLANK-FACE previs|faces? (?:stay|stays|remain) BLANK|face featureless|not facial identity/i);
  assert.ok(prompt.length <= 4700);
}

for (const named of [false, true]) {
  test(`faceless prompts: explicit OFF keeps complete own-Look faces and no contradictory blank instructions (${named ? 'named Looks' : 'role mappings'})`, () => {
    const context = stillRequest({ cinematicFaceless: false });
    if (!named) context.referenceRoleManifest = [
      { index: 1, roles: ['template_baseline_reference'] },
      { index: 2, roles: ['character_reference_a', 'character_reference_b'] },
      { index: 3, roles: ['face_reference_a', 'face_reference_b', 'face_reference'] },
      { index: 4, roles: ['outfit_front'] }
    ];
    const before = structuredClone(context);
    const prompt = cinematicStoryboardPromptComposer.compose({ context, visualPrompt: stillVisualPrompt });
    assertCompleteFacePrompt(prompt);
    assert.match(prompt, /VISIBLE PERFORMANCE:\nNara narrows her eyes toward Mai/);
    if (named) {
      assert.match(prompt, /Reference image 2.*facial identity and wardrobe ONLY for "Nara"/);
      assert.match(prompt, /Reference image 3.*facial identity and wardrobe ONLY for "Mai"/);
      assert.match(prompt, /their own assigned Look Sheet portrait is the exclusive facial identity authority/);
      assert.match(prompt, /Never swap or blend faces or outfits/);
    } else {
      assert.match(prompt, /Exact facial identity, realistic eyes, nose, lips and skin/);
      assert.match(prompt, /matching the authored head angle/);
      assert.match(prompt, /approved front garment silhouette/);
    }
    assert.deepEqual(context, before);
  });

  test(`faceless prompts: explicit ON stays blank with guides and photographic surroundings (${named ? 'named Looks' : 'role mappings'})`, () => {
    const context = stillRequest({ cinematicFaceless: true });
    if (!named) context.referenceRoleManifest = [{ index: 1, roles: ['character_reference', 'face_reference'] }];
    const prompt = cinematicStoryboardPromptComposer.compose({ context, visualPrompt: stillVisualPrompt });
    assert.match(prompt, /with BLANK FACES/);
    assert.match(prompt, /only two faint thin head-angle guide lines/);
    assert.match(prompt, /ZERO eyes, eyebrows, nose, mouth, lips or facial likeness/);
    assert.match(prompt, /Hair, bodies, wardrobe, props and the physical set stay photographic/);
    assert.doesNotMatch(prompt, /complete natural faces|exclusive facial identity authority|VISIBLE PERFORMANCE:|Nara narrows her eyes/);
    if (named) {
      assert.match(prompt, /Reference image 2.*body, hair and wardrobe ONLY for "Nara"/);
      assert.match(prompt, /Reference image 3.*body, hair and wardrobe ONLY for "Mai"/);
    }
    assert.ok(prompt.length <= 4700);
    assertCompleteFacePrompt(cinematicStoryboardPromptComposer.compose({
      context: { ...context, cinematicFaceless: false }, visualPrompt: stillVisualPrompt
    }));
  });
}

test('faceless prompts: normalized default/OFF/ON agree with final prompt and server-derived queue metadata', () => {
  for (const value of [undefined, false, true]) {
    const request = stillRequest({ storyboardRenderStyle: 'caller_cannot_choose_output_style' });
    if (value !== undefined) request.cinematicFaceless = value;
    const before = structuredClone(request);
    const normalized = normalizeGenerationContext(request, actor);
    assert.equal(normalized.cinematicFaceless, value === true);
    const prompt = compilePromptFromGenerationContext(normalized);
    const options = createQueueOptions(normalized, { modelConfig: { defaults: {} } });
    assert.equal(options.storyboardRenderStyle, value === true ? 'faceless_previs_v1' : 'photorealistic_storyboard_v1');
    assert.deepEqual(normalized.referenceRoleManifest, [], 'Caller-supplied mappings cannot fabricate reference authority');
    assert.deepEqual(options.referenceRoleManifest, normalized.referenceRoleManifest);
    if (value === true) assert.match(prompt, /with BLANK FACES/);
    else assertCompleteFacePrompt(prompt, false);
    assert.deepEqual(request, before);
  }
});

test('faceless prompts: non-Cinematic and non-scene metadata do not acquire a Storyboard style', () => {
  for (const patch of [{ generationSurface: 'studio' }, { generationSurface: 'playground' }, { generationMode: 'portrait' }]) {
    const normalized = normalizeGenerationContext(stillRequest({ cinematicFaceless: true, storyboardRenderStyle: 'faceless_previs_v1', ...patch }), actor);
    assert.equal(createQueueOptions(normalized, { modelConfig: { defaults: {} } }).storyboardRenderStyle, null);
    if (patch.generationSurface) assert.equal(normalized.cinematicFaceless, false);
  }
});

test('faceless flag: boolean validation and no-op requests preserve versions', async t => {
  const { service, project, projectsFile } = await savedFixture(t);
  const before = await fs.readFile(projectsFile, 'utf8');
  for (const value of [null, undefined, 0, 1, 'true', 'false', {}]) {
    await assert.rejects(async () => settings(service, project, value), { code: 'cinematic_storyboard_settings_invalid' });
  }
  assert.equal(await fs.readFile(projectsFile, 'utf8'), before);
  const noChange = await settings(service, project, false);
  assert.equal(noChange.version, project.version);
  assert.equal(noChange.scenes[0].shots[0].version, project.scenes[0].shots[0].version);
});

test('faceless flag: toggling affects future context only, not approved image, still fingerprint, Takes or siblings', async t => {
  const { service, project } = await savedFixture(t, { media: true, siblings: true });
  const scene = project.scenes[0], shot = scene.shots[0];
  const before = await service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor);
  let current = project;
  for (const value of [true, false]) {
    const changed = await settings(service, current, value);
    const context = await service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor);
    assert.equal(context.cinematicFaceless, value);
    assert.equal(context.keyframeContract.sourceFingerprint, before.keyframeContract.sourceFingerprint);
    assert.equal(changed.version, current.version + 1);
    // A future still preference uses Project concurrency, not authored Shot/video packet identity.
    assert.equal(changed.scenes[0].shots[0].version, current.scenes[0].shots[0].version);
    assert.deepEqual(changed.scenes[0].shots[0].approvedStoryboardSource, shot.approvedStoryboardSource);
    assert.equal(changed.scenes[0].shots[0].approvedStoryboardSource.storyboardRenderStyle, 'faceless_previs_v1');
    assert.equal(changed.scenes[0].shots[0].approvedStoryboardAttemptId, 'still_target');
    assert.equal(changed.scenes[0].shots[0].approvedVideoAttemptId, 'take_target');
    assert.deepEqual(changed.generationAttempts, project.generationAttempts);
    assert.deepEqual(changed.timelineVersions, project.timelineVersions);
    assertProtectedSiblings(project, changed);
    current = changed;
  }
});

test('faceless flag: future still preference must not invalidate the current approved video packet', async t => {
  const { service, project } = await savedFixture(t, { media: true });
  const scene = project.scenes[0], shot = scene.shots[0];
  const before = await service.getProduceShotContext(project.id, scene.id, shot.id, actor);
  await settings(service, project, true);
  const after = await service.getProduceShotContext(project.id, scene.id, shot.id, actor);
  assert.equal(after.videoPacket.providerIndependentPrompt, before.videoPacket.providerIndependentPrompt);
  assert.equal(after.videoPacket.keyframeContractFingerprint, before.videoPacket.keyframeContractFingerprint);
  assert.equal(after.videoPacket.approvedStoryboardSourceFingerprint, before.videoPacket.approvedStoryboardSourceFingerprint);
  assert.equal(after.videoPacket.packetFingerprint, before.videoPacket.packetFingerprint,
    'Changing a future still-generation preference must not make an unchanged approved video packet stale');
});

test('manual row API: routes call real facade/storage, bind actor context and return HTTP validation/conflict errors', async t => {
  const { service, project, projectsFile } = await fixture(t);
  const routes = routeFixture(service);
  const created = await routes.invoke('post', '/api/cinematic/projects/:projectId/simple-scenes', {
    params: { projectId: project.id }, body: { expectedVersion: 1, idempotencyKey: 'api-row', username: other.username, ownerUserId: other.userId }
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.ownerUserId, actor.userId);
  const scene = created.body.scenes[0], shot = scene.shots[0];
  const params = { projectId: project.id, sceneId: scene.id, shotId: shot.id };
  const saved = await routes.invoke('patch', `${rowRoute}manual-storyboard`, { params, body: inputFor(created.body) });
  assert.equal(saved.statusCode, 200);
  assert.deepEqual(saved.body.scenes[0].shots[0].videoActionTimeline, events);
  const flag = await routes.invoke('patch', `${rowRoute}storyboard-settings`, { params,
    body: { expectedVersion: saved.body.version, expectedShotVersion: saved.body.scenes[0].shots[0].version, storyboardFaceless: true } });
  assert.equal(flag.statusCode, 200);
  assert.equal(flag.body.scenes[0].shots[0].storyboardFaceless, true);
  const before = await fs.readFile(projectsFile, 'utf8');
  const unauthorized = await routes.invoke('patch', `${rowRoute}manual-storyboard`, { params, actorContext: other, body: inputFor(flag.body) });
  assert.equal(unauthorized.statusCode, 404);
  assert.equal(unauthorized.body.error.code, 'cinematic_project_not_found');
  const conflict = await routes.invoke('patch', `${rowRoute}manual-storyboard`, { params, body: inputFor(created.body) });
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.body.error.code, 'cinematic_version_conflict');
  const invalid = await routes.invoke('patch', `${rowRoute}manual-storyboard`, { params, body: inputFor(flag.body, { videoActionTimeline: [{ startMs: 2, endMs: 1, description: 'Invalid' }] }) });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.body.error.code, 'cinematic_manual_storyboard_invalid');
  assert.equal(await fs.readFile(projectsFile, 'utf8'), before);
});

test('manual row API: each new endpoint is registered exactly once', async t => {
  const { service } = await fixture(t);
  const { handlers } = routeFixture(service);
  for (const route of ['post /api/cinematic/projects/:projectId/simple-scenes', `patch ${rowRoute}manual-storyboard`, `patch ${rowRoute}storyboard-settings`]) {
    assert.equal(handlers.get(route)?.length, 1, route);
  }
});

test('manual row API: batch face-setting mismatches and stale Project versions reject before generation', async t => {
  const { service, project, projectsFile } = await savedFixture(t);
  let submissions = 0;
  const routes = routeFixture(service, { submitBatch: async () => {
    submissions += 1;
    return { groupId: 'offline_preflight_only' };
  } });
  let current = project;
  for (const cinematicFaceless of [true, false]) {
    const previousVersion = current.version;
    current = await settings(service, current, cinematicFaceless);
    const scene = current.scenes[0], shot = scene.shots[0];
    const context = await service.getStoryboardGenerationContext(current.id, scene.id, shot.id, actor);
    assert.equal(context.generationEligible, true);
    assert.equal(shot.version, project.scenes[0].shots[0].version);
    const operation = storyboardBatchOperation(current, context);
    const invoke = (value, expectedVersion = current.version) => routes.invoke('post', '/api/cinematic/projects/:projectId/storyboard-generation-batches', {
      params: { projectId: current.id }, body: { expectedVersion, idempotencyKey: `offline-${cinematicFaceless}`,
        operations: [{ ...operation, generationRequest: { ...operation.generationRequest, cinematicFaceless: value } }] }
    });
    const before = await fs.readFile(projectsFile, 'utf8');
    const beforeSubmissions = submissions;
    for (const value of cinematicFaceless ? [false, undefined] : [true]) {
      const mismatch = await invoke(value);
      assert.equal(mismatch.statusCode, 409);
      assert.equal(mismatch.body.error.code, 'cinematic_storyboard_settings_changed');
      assert.equal(submissions, beforeSubmissions, 'Reject mismatched preferences before the Generation facade');
    }
    const stale = await invoke(cinematicFaceless, previousVersion);
    assert.equal(stale.statusCode, 409);
    assert.equal(stale.body.error.code, 'cinematic_version_conflict');
    assert.equal(submissions, beforeSubmissions, 'Project version guards the unchanged Shot version');
    assert.equal(await fs.readFile(projectsFile, 'utf8'), before);

    // Matching settings reach only the offline stub, proving the other request fields are valid.
    const matched = await invoke(cinematicFaceless);
    assert.equal(matched.statusCode, 202);
    assert.equal(submissions, beforeSubmissions + 1);
    assert.equal(await fs.readFile(projectsFile, 'utf8'), before);
  }
});

for (const manualStill of [false, true]) test(`manual row API: batch manual-authority flag must match facade through normalized compilation, manualStill=${manualStill}`, async t => {
  const f = manualStill ? await savedFixture(t) : await legacyAdvancedFixture(t);
  const { service, projectsFile } = f;
  const project = manualStill ? f.project : await save(service, f.project, { videoActionTimeline: events });
  const scene = project.scenes[0], shot = scene.shots[0];
  assert.equal(shot.manualStoryboard, true);
  assert.equal(shot.manualStillAuthority, manualStill);
  const context = await service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor);
  assert.equal(context.generationEligible, true);
  assert.equal(context.cinematicManualStoryboard, manualStill);
  const compiled = [];
  const routes = routeFixture(service, { submitBatch: async ({ operations, actorContext }) => {
    assert.deepEqual(actorContext, actor);
    for (const operation of operations) {
      const result = compileGenerationContext(operation.body, actorContext);
      assert.equal(result.context.cinematicManualStoryboard, manualStill);
      compiled.push(result.compiledPrompt);
    }
    return { groupId: 'offline_compilation_only' };
  } });
  const operation = storyboardBatchOperation(project, context);
  const invoke = value => routes.invoke('post', '/api/cinematic/projects/:projectId/storyboard-generation-batches', {
    params: { projectId: project.id }, body: { expectedVersion: project.version, idempotencyKey: `offline-manual-${manualStill}`,
      operations: [{ ...operation, generationRequest: { ...operation.generationRequest, cinematicManualStoryboard: value } }] }
  });
  const before = await fs.readFile(projectsFile, 'utf8');
  for (const value of manualStill ? [false, undefined] : [true]) {
    const response = await invoke(value);
    assert.equal(response.statusCode, 409);
    assert.equal(response.body.error.code, 'cinematic_storyboard_settings_changed');
    assert.deepEqual(compiled, [], 'Mismatched authoring mode must not reach Generation');
  }
  const matched = await invoke(manualStill);
  assert.equal(matched.statusCode, 202);
  assert.equal(compiled.length, 1);
  assert.ok(compiled[0].includes(shot.prompt));
  assert.equal(await fs.readFile(projectsFile, 'utf8'), before);
});

function assertProtectedSiblings(before, after) {
  assert.deepEqual(after.scenes[0].shots[1], before.scenes[0].shots[1]);
  assert.deepEqual(after.scenes[1], before.scenes[1]);
  assert.deepEqual(after.scenes[0].shotOrder, before.scenes[0].shotOrder);
  assert.equal(after.scenes[0].title, before.scenes[0].title);
  assert.deepEqual(after.generationAttempts.find(item => item.id === 'sibling_take'), before.generationAttempts.find(item => item.id === 'sibling_take'));
  assert.deepEqual(after.timelineVersions[0]?.entries[1], before.timelineVersions[0]?.entries[1]);
}

function assertTakeMediaRetained(before, after) {
  assert.deepEqual(after.generationAttempts.map(item => item.id), before.generationAttempts.map(item => item.id));
  for (const attempt of before.generationAttempts) {
    const retained = after.generationAttempts.find(item => item.id === attempt.id);
    assert.deepEqual(retained.outputAsset, attempt.outputAsset);
    assert.equal(retained.status, attempt.status);
    assert.equal(retained.reviewDecision, attempt.reviewDecision);
  }
}

function routeFixture(service, generationApplicationService) {
  const handlers = new Map();
  const app = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map(method => [method, (route, handler) => {
    const key = `${method} ${route}`;
    handlers.set(key, [...(handlers.get(key) || []), handler]);
  }]));
  registerCinematicRoutes(app, { cinematicService: service, generationApplicationService });
  return { handlers, async invoke(method, route, request) {
    const res = { statusCode: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; },
      status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handlers.get(`${method} ${route}`)[0]({ actorContext: actor, ...request }, res);
    return res;
  } };
}
