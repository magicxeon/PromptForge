import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { CinematicProjectRepository } from '../server/repositories/cinematic/CinematicProjectRepository.js';
import { CharacterLookService } from '../server/domain/character-profiles/CharacterLookService.js';
import { CinematicGeneratedCastService } from '../server/domain/cinematic/CinematicGeneratedCastService.js';
import { CinematicVideoReferencePlanService } from '../server/domain/cinematic/CinematicVideoReferencePlanService.js';
import { resolveShotLookIds } from '../server/domain/cinematic/CinematicCastCoverage.js';
import { registerCinematicRoutes } from '../server/app/routes/cinematicRoutes.js';

const alice = { userId: 'alice', username: 'alice', role: 'user' };
const bob = { userId: 'bob', username: 'bob', role: 'user' };
const setup = { title: 'Letter', storyBrief: 'A letter arrives.', durationSeconds: 30 };
const source = id => ({ assetId: `asset_${id}`, assetVersionId: `asset_${id}`,
  imageUrl: `/outputs/${id}.png`, contentHash: `hash_${id}`, sourceFingerprint: `source_${id}` });

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-look-references-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const repository = new CinematicProjectRepository({ projectsFile: path.join(directory, 'projects.json') });
  const records = ['arrival', 'evening', 'offscreen', 'foreign', 'wrong-character', 'draft'].map(id => ({
    id, ownerUserId: id === 'foreign' ? bob.userId : alice.userId,
    characterProfileId: ['offscreen', 'wrong-character'].includes(id) ? 'profile_b' : 'profile_a',
    sourceCharacterProfileVersionId: 'profile_version', lifecycleStatus: 'active',
    versions: [{ id: `${id}_v1`, status: id === 'draft' ? 'draft' : 'approved',
      approvedViewAssets: { front: { assetId: `asset_${id}`, contentHash: `hash_${id}` } } }]
  }));
  const authorityCalls = [];
  const lookService = new CharacterLookService({
    repository: { findForOwner: async (id, actor) => records.find(item => item.id === id && item.ownerUserId === actor.userId) },
    characterAuthorizationService: { validateGenerationContext: async (context, actor) => {
      authorityCalls.push({ context, actor });
      assert.equal(actor.userId, alice.userId);
      return { identityPack: { characterProfileVersionId: 'profile_version' } };
    } }
  });
  const compiled = [];
  const service = new CinematicApplicationService({ repository, lookService,
    assetRepository: { findByIdForOwner: async id => ({ id, publicUrl: `/outputs/${id}.png` }) },
    videoGenerationService: { getStoredTaskSummaries: async () => [] },
    keyframeContractCompiler: { compile: value => {
      compiled.push(structuredClone(value));
      return { findings: [], sourceFingerprint: 'keyframe', providerIndependentPrompt: 'A letter.' };
    } },
    videoPacketCompiler: { compile: value => {
      compiled.push(structuredClone(value));
      return { findings: [], packetFingerprint: 'packet', providerIndependentPrompt: 'A letter.' };
    } },
    storyboardAssetService: { approveGenerationResult: async ({ jobId }) => ({ ...source(jobId), sourceJobId: jobId }) }
  });
  const root = await service.createProject({ ...setup, format: 'mini-series' }, alice);
  const child = await service.createProject(setup, alice);
  const sibling = await service.createProject(setup, alice);
  await repository.mutateSeriesWorkspaceForActor(alice, data => {
    const story = data.projects.find(item => item.id === root.id);
    story.castAssignments = ['a', 'b'].map(id => ({ id: `cast_${id}`, sourceType: 'character',
      characterProfileId: `profile_${id}`, characterProfileVersionId: 'profile_version',
      displayName: id, storyRole: 'Lead', identityReady: true, active: true, looks: [] }));
    for (const [index, id] of [child.id, sibling.id].entries()) {
      const project = data.projects.find(item => item.id === id);
      project.seriesMembership = { ...story.seriesMembership, chapterNumber: index + 2 };
      project.chapterOrigin = { projectId: root.id, projectVersion: root.version, copiedCast: false };
      project.chapterCharacterIds = ['cast_a', 'cast_b'];
      project.castAssignments = structuredClone(story.castAssignments);
      project.scenes = [{ id: 'scene', version: 1, castAssignmentIds: ['cast_a'], wardrobeLookIds: [],
        shotOrder: ['inherit', 'override', 'empty', 'manual'], shots: [
          { id: 'inherit', castMode: 'inherit', wardrobeLookIds: [] },
          { id: 'override', castMode: 'selected', castAssignmentIds: ['cast_a'], wardrobeLookIds: ['binding_arrival'] },
          { id: 'empty', castMode: 'none', wardrobeLookIds: [] },
          { id: 'manual', castMode: 'selected', castAssignmentIds: ['cast_a'], manualStoryboard: true, wardrobeLookIds: [] }
        ].map(shot => ({ ...shot, version: 1, durationMs: 4000, approvedStoryboardSource: source(shot.id),
          storyboardStatus: 'approved', approvedVideoAttemptId: `take_${shot.id}`, approvedVideoSourceFingerprint: `source_${shot.id}` })) }];
      project.generationAttempts = project.scenes[0].shots.map(shot => ({ id: `take_${shot.id}`, shotId: shot.id,
        operation: 'cinematic_draft_clip', status: 'approved', sourceFingerprint: `source_${shot.id}`,
        downstreamSourceStatus: 'current', outputAssetIds: [`video_${shot.id}`],
        outputAsset: { id: `video_${shot.id}`, videoUrl: `/outputs/${shot.id}.mp4` },
        referenceSnapshot: { wardrobeLookIds: ['binding_arrival'] } }));
      project.timelineVersions = [{ id: 'timeline', status: 'active', exportEligible: true,
        entries: [{ shotId: 'inherit', sourceFingerprint: 'source_inherit', assetId: 'video_inherit' }] }];
      project.commandReceipts = [{ operation: 'old_media', result: { assetId: 'historical' } }];
    }
    return story;
  });
  const bind = async (id, assignmentId = 'cast_a', extra = {}) => {
    const current = await service.getProject(root.id, alice);
    return service.upsertWardrobeLook(root.id, assignmentId, { expectedVersion: current.version,
      lookId: `binding_${id}`, mode: 'character_look', characterLookId: id,
      characterLookVersionId: `${id}_v1`, name: id, ...extra }, alice);
  };
  const select = async (ids, extra = {}, actor = alice) => {
    const current = await service.getProject(child.id, alice);
    return service.updateSceneLooks(child.id, 'scene', { expectedVersion: current.version,
      expectedSceneVersion: current.scenes[0].version, wardrobeLookIds: ids, ...extra }, actor);
  };
  return { service, repository, root, child, sibling, records, authorityCalls, compiled, bind, select };
}

test('project Look removal clears affected inherited selections but keeps original library and historical Takes', async t => {
  const f = await fixture(t);
  await f.bind('arrival'); await f.bind('evening'); await f.select(['binding_arrival']);
  const before = await f.service.getProject(f.child.id, alice);
  const impact = await f.service.getWardrobeLookRemovalImpact(f.root.id, 'cast_a', 'binding_arrival', alice);
  assert.ok(impact.items.some(item => item.projectId === f.child.id && item.shotIds.includes('inherit')));
  await assert.rejects(f.service.removeWardrobeLook(f.root.id, 'cast_a', 'binding_arrival',
    { expectedVersion: impact.projectVersion, impactFingerprint: 'old' }, alice), error => error.code === 'cinematic_look_removal_changed');
  await assert.rejects(f.service.getWardrobeLookRemovalImpact(f.root.id, 'cast_a', 'binding_arrival', bob));
  await assert.rejects(f.service.getWardrobeLookRemovalImpact(f.child.id, 'cast_a', 'binding_arrival', alice),
    error => error.code === 'cinematic_shared_character_root_required');
  await f.service.removeWardrobeLook(f.root.id, 'cast_a', 'binding_arrival',
    { expectedVersion: impact.projectVersion, impactFingerprint: impact.fingerprint }, alice);
  const after = await f.service.getProject(f.child.id, alice);
  assert.deepEqual(after.castAssignments[0].looks.map(item => item.id), ['binding_evening']);
  assert.deepEqual(after.scenes[0].wardrobeLookIds, []);
  assert.deepEqual(after.scenes[0].shots.find(item => item.id === 'override').wardrobeLookIds, []);
  assert.equal(after.scenes[0].shots.find(item => item.id === 'inherit').approvedStoryboardSource, undefined);
  assert.equal(after.scenes[0].shots.find(item => item.id === 'empty').approvedStoryboardSource.assetId, 'asset_empty');
  assert.deepEqual(after.generationAttempts.map(item => item.outputAsset), before.generationAttempts.map(item => item.outputAsset));
  assert.deepEqual(after.commandReceipts, before.commandReceipts);
  assert.equal(f.records.find(item => item.id === 'arrival').versions[0].status, 'approved');
});

test('root binding persists canonically across Chapters without rewriting pinned selections or media', async t => {
  const f = await fixture(t);
  await f.bind('arrival');
  await f.select(['binding_arrival']);
  const before = await f.service.getProject(f.child.id, alice);
  const oldLook = before.castAssignments[0].looks[0];
  await f.bind('evening');
  const reloaded = new CinematicApplicationService({ repository: f.repository, videoGenerationService: { getStoredTaskSummaries: async () => [] } });
  for (const id of [f.child.id, f.sibling.id]) {
    const projected = await reloaded.getProject(id, alice);
    assert.deepEqual(projected.castAssignments[0].looks.map(look => look.id), ['binding_arrival', 'binding_evening']);
    const stored = await f.repository.findForActor(id, alice);
    assert.deepEqual(stored.castAssignments[0].looks, []);
  }
  const after = await reloaded.getProject(f.child.id, alice);
  assert.deepEqual(after.castAssignments[0].looks[0], oldLook);
  assert.deepEqual(after.scenes, before.scenes);
  assert.deepEqual(after.generationAttempts, before.generationAttempts);
  assert.deepEqual(after.timelineVersions, before.timelineVersions);
  assert.deepEqual(after.commandReceipts, before.commandReceipts);
  assert.equal(after.version, before.version + 1);
  await assert.rejects(f.bind('evening', 'cast_a', { lookId: 'binding_arrival' }), { code: 'cinematic_wardrobe_look_pinned' });
  await assert.rejects(f.select(['binding_evening'], { expectedVersion: before.version }), { code: 'cinematic_version_conflict' });
});

test('Look unlink rejects changed Chapter impact and leaves another Project binding untouched', async t => {
  const f = await fixture(t);
  await f.bind('arrival'); await f.select(['binding_arrival']);
  const separate = await f.service.createProject({ ...setup, title: 'Separate story' }, alice);
  const child = await f.service.getProject(f.child.id, alice);
  await f.repository.mutateSeriesWorkspaceForActor(alice, data => {
    const target = data.projects.find(item => item.id === separate.id);
    target.castAssignments = structuredClone(child.castAssignments);
    target.scenes = structuredClone(child.scenes);
    return target;
  });
  const isolatedBefore = await f.service.getProject(separate.id, alice);
  const old = await f.service.getWardrobeLookRemovalImpact(f.root.id, 'cast_a', 'binding_arrival', alice);
  await f.repository.mutateSeriesWorkspaceForActor(alice, data => {
    const target = data.projects.find(item => item.id === f.child.id); target.version += 1; return target;
  });
  await assert.rejects(f.service.removeWardrobeLook(f.root.id, 'cast_a', 'binding_arrival',
    { expectedVersion: old.projectVersion, impactFingerprint: old.fingerprint }, alice), error => error.code === 'cinematic_look_removal_changed');
  const current = await f.service.getWardrobeLookRemovalImpact(f.root.id, 'cast_a', 'binding_arrival', alice);
  await f.service.removeWardrobeLook(f.root.id, 'cast_a', 'binding_arrival',
    { expectedVersion: current.projectVersion, impactFingerprint: current.fingerprint }, alice);
  assert.deepEqual(await f.service.getProject(separate.id, alice), isolatedBefore);
});

test('Scene selects canonical Looks, clears independently and preserves explicit Shots and historical media', async t => {
  const f = await fixture(t);
  await f.bind('arrival');
  await f.bind('evening');
  await f.select(['binding_arrival']);
  const before = await f.service.getProject(f.child.id, alice);
  const { project, scene } = await f.select(['binding_evening']);
  assert.deepEqual(scene.castAssignmentIds, before.scenes[0].castAssignmentIds);
  assert.deepEqual(scene.wardrobeLookIds, ['binding_evening']);
  assert.deepEqual(resolveShotLookIds(scene, scene.shots[0]), ['binding_evening']);
  assert.deepEqual(resolveShotLookIds(scene, scene.shots[1]), ['binding_arrival']);
  assert.deepEqual(scene.shots.slice(1), before.scenes[0].shots.slice(1));
  assert.deepEqual(scene.shots[0].approvedStoryboardSource, before.scenes[0].shots[0].approvedStoryboardSource);
  assert.equal(scene.shots[0].storyboardStatus, 'draft');
  assert.equal(scene.shots[0].version, before.scenes[0].shots[0].version + 1);
  assert.equal(project.version, before.version + 1);
  assert.equal(scene.version, before.scenes[0].version + 1);
  assert.equal(project.generationAttempts[0].downstreamSourceStatus, 'packet_changed');
  assert.deepEqual(project.generationAttempts.map(item => item.outputAsset), before.generationAttempts.map(item => item.outputAsset));
  assert.deepEqual(project.generationAttempts.map(item => item.referenceSnapshot), before.generationAttempts.map(item => item.referenceSnapshot));
  assert.deepEqual(project.commandReceipts, before.commandReceipts);
  assert.equal(project.timelineVersions[0].status, 'stale');
  assert.equal(project.timelineVersions[0].entries[0].assetId, 'video_inherit');
  const noOp = await f.select(['binding_evening']);
  assert.equal(noOp.project.version, project.version);
  const cleared = await f.select([]);
  assert.deepEqual(resolveShotLookIds(cleared.scene, cleared.scene.shots[0]), []);
  assert.deepEqual(resolveShotLookIds(cleared.scene, cleared.scene.shots[1]), ['binding_arrival']);
  assert.deepEqual((await f.service.getProject(f.sibling.id, alice)).scenes[0].wardrobeLookIds, []);
});

test('Scene guards versions, membership, duplicate Character Looks and malformed inputs atomically', async t => {
  const f = await fixture(t);
  await f.bind('arrival');
  await f.bind('evening');
  await f.bind('offscreen', 'cast_b');
  const before = await f.repository.findForActor(f.child.id, alice);
  for (const [ids, extra, code] of [
    [['binding_arrival'], { expectedVersion: 0 }, 'cinematic_version_conflict'],
    [['binding_arrival'], { expectedSceneVersion: 0 }, 'cinematic_scene_version_conflict'],
    [['unknown'], {}, 'cinematic_scene_look_invalid'],
    [['binding_offscreen'], {}, 'cinematic_scene_look_invalid'],
    [['binding_arrival', 'binding_evening'], {}, 'cinematic_scene_look_invalid'],
    [['binding_arrival', 'binding_arrival'], {}, 'cinematic_scene_looks_invalid'],
    [null, {}, 'cinematic_scene_looks_invalid'],
    ['binding_arrival', {}, 'cinematic_scene_looks_invalid'],
    [[{}], {}, 'cinematic_scene_looks_invalid'],
    [Array.from({ length: 13 }, (_, i) => String(i)), {}, 'cinematic_scene_looks_invalid']
  ]) await assert.rejects(f.select(ids, extra), { code });
  assert.deepEqual(await f.repository.findForActor(f.child.id, alice), before);
});

test('existing approved Look authority rejects foreign, wrong Character, draft and revoked selections', async t => {
  const f = await fixture(t);
  for (const id of ['foreign', 'wrong-character', 'draft', 'missing']) {
    await assert.rejects(f.bind(id), { code: 'character_look_version_unavailable' });
  }
  await f.bind('arrival');
  const before = await f.repository.findForActor(f.child.id, alice);
  f.records.find(item => item.id === 'arrival').lifecycleStatus = 'retired';
  await assert.rejects(f.select(['binding_arrival']), { code: 'character_look_version_unavailable' });
  assert.deepEqual(await f.repository.findForActor(f.child.id, alice), before);
  assert.ok(f.authorityCalls.length);
});

test('actor isolation and root-only shared writes reject without changing either owner', async t => {
  const f = await fixture(t);
  await f.bind('arrival');
  const current = await f.service.getProject(f.child.id, alice);
  await assert.rejects(f.select([], {}, bob), { code: 'cinematic_project_not_found' });
  await assert.rejects(f.service.upsertWardrobeLook(f.root.id, 'cast_a', { expectedVersion: 1 }, bob), { code: 'cinematic_project_not_found' });
  await assert.rejects(f.service.upsertWardrobeLook(f.child.id, 'cast_a', { expectedVersion: current.version,
    lookId: 'local', mode: 'character_look', characterLookId: 'arrival', characterLookVersionId: 'arrival_v1' }, alice),
  { code: 'cinematic_shared_character_root_required' });
  assert.deepEqual(await f.service.getProject(f.child.id, alice), current);
});

test('concurrent Scene writes serialize and stale root binding writes do not mutate shared Cast', async t => {
  const f = await fixture(t);
  await f.bind('arrival');
  await f.bind('evening');
  const current = await f.service.getProject(f.child.id, alice);
  const results = await Promise.allSettled(['binding_arrival', 'binding_evening'].map(id =>
    f.service.updateSceneLooks(f.child.id, 'scene', { expectedVersion: current.version,
      expectedSceneVersion: current.scenes[0].version, wardrobeLookIds: [id] }, alice)));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'cinematic_version_conflict');
  const root = await f.repository.findForActor(f.root.id, alice);
  await assert.rejects(f.bind('arrival', 'cast_a', { expectedVersion: root.version - 1 }), { code: 'cinematic_version_conflict' });
  assert.deepEqual(await f.repository.findForActor(f.root.id, alice), root);
});

test('Scene rechecks stored Look authority instead of trusting legacy or tampered binding IDs', async t => {
  const f = await fixture(t);
  await f.bind('arrival');
  for (const patch of [
    { locked: false }, { mode: 'uploaded' },
    { characterLookId: 'foreign', characterLookVersionId: 'foreign_v1' },
    { characterLookId: 'wrong-character', characterLookVersionId: 'wrong-character_v1' }
  ]) {
    await f.repository.mutateForActor(f.root.id, alice, project => {
      Object.assign(project.castAssignments[0].looks[0], { locked: true, mode: 'character_look',
        characterLookId: 'arrival', characterLookVersionId: 'arrival_v1' }, patch);
      return project;
    });
    await assert.rejects(f.select(['binding_arrival']), { code: patch.characterLookId
      ? 'character_look_version_unavailable' : 'cinematic_scene_look_unapproved' });
  }
});

test('First Frame preparation, approval compilation and Video references use canonical Cast, not stale local copies', async t => {
  const f = await fixture(t);
  await f.bind('arrival');
  await f.bind('evening');
  const selected = await f.select(['binding_evening']);
  const context = await f.service.getStoryboardGenerationContext(f.child.id, 'scene', 'inherit', alice);
  assert.deepEqual(context.looks.map(look => look.lookId), ['binding_evening']);
  assert.equal(context.references.outfit_front, '/outputs/asset_evening.png');
  assert.deepEqual(f.compiled.at(-1).referencePlan.lookAssetIds, ['asset_evening']);
  await f.service.approveStoryboardSource(f.child.id, 'inherit', { expectedVersion: selected.project.version,
    expectedShotVersion: selected.scene.shots[0].version, jobId: 'new_frame', idempotencyKey: 'approve_new_frame' }, alice);
  assert.deepEqual(f.compiled.at(-1).project.castAssignments[0].looks.map(look => look.id), ['binding_arrival', 'binding_evening']);
  assert.deepEqual((await f.repository.findForActor(f.child.id, alice)).castAssignments[0].looks, []);
  const referenceService = new CinematicVideoReferencePlanService({ lookService: {
    resolveApprovedSheetReference: async (profile, look, version, actor) => {
      const approved = await f.service.lookService.resolveApprovedVersion(profile, look, version, actor);
      return { characterProfileVersionId: approved.look.sourceCharacterProfileVersionId,
        asset: { id: `asset_${look}`, publicUrl: `/outputs/${look}.png`, contentHash: `hash_${look}` }, sourceFingerprint: look };
    }
  } });
  const project = await f.service.getProject(f.child.id, alice);
  const scene = project.scenes[0];
  for (const [index, expected] of [[0, 'evening'], [1, 'arrival']]) {
    const plan = await referenceService.prepare({ project, scene, shot: scene.shots[index], mode: 'looks_only',
      model: { supportsCinematicLookReferences: true, inputModes: ['multimodal_reference'], referenceImageLimit: 6 }, actorContext: alice });
    assert.deepEqual(plan.references.map(item => item.characterLookId), [expected]);
  }
});

test('Scene Look route delegates only body and authenticated actor, returning the project/scene envelope', async () => {
  const routes = new Map();
  const app = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map(method => [method,
    (route, handler) => routes.set(`${method} ${route}`, handler)]));
  const calls = [];
  registerCinematicRoutes(app, { cinematicService: { updateSceneLooks: async (...args) => {
    calls.push(args);
    return { project: { id: 'project' }, scene: { id: 'scene', wardrobeLookIds: [] } };
  } } });
  const handler = routes.get('patch /api/cinematic/projects/:projectId/scenes/:sceneId/looks');
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  const body = { expectedVersion: 2, expectedSceneVersion: 1, wardrobeLookIds: [], username: 'bob' };
  await handler({ params: { projectId: 'project', sceneId: 'scene' }, body, actorContext: alice }, response);
  assert.deepEqual(calls, [['project', 'scene', body, alice]]);
  assert.deepEqual(response.body, { project: { id: 'project' }, scene: { id: 'scene', wardrobeLookIds: [] } });
});

test('quote reference summary forwards exact optional provenance in prepared order without changing historical Takes', async t => {
  const f = await fixture(t);
  await f.bind('arrival');
  const selected = await f.select(['binding_arrival']);
  const references = [
    { role: 'reference_image', purpose: 'character_look', assetId: 'asset_arrival',
      characterName: 'Authored name', referenceSource: 'uploaded', selectionScope: 'scene', characterLookVersionId: 'arrival_v1' },
    { role: 'reference_image', purpose: 'character_look', assetId: 'asset_other',
      characterName: 'Other name', referenceSource: 'generated', selectionScope: 'shot', characterLookVersionId: 'other_v2' },
    { role: 'reference_image', purpose: 'character_look', assetId: 'asset_library', referenceSource: 'library' },
    { role: 'reference_image', purpose: 'character_look', assetId: 'asset_legacy' }
  ];
  for (const reference of references) reference.referenceImageUrl = `/outputs/${reference.assetId}.png`;
  f.service.videoCapabilities = { resolve: () => null };
  f.service.videoReferencePlanService = { prepare: async () => ({ mode: 'looks_only', inputMode: 'multimodal_reference', references }) };
  f.service.videoGenerationService.quote = async () => ({ estimate: { estimateId: 'isolated_quote' } });
  const before = await f.repository.findForActor(f.child.id, alice);
  const quote = await f.service.quoteVideoAttempt(f.child.id, 'scene', 'inherit', {
    expectedVersion: selected.project.version, expectedShotVersion: selected.scene.shots[0].version,
    sourceFingerprint: null, referenceMode: 'looks_only', videoPacketFingerprint: 'packet', prompt: 'A letter.'
  }, alice);
  assert.deepEqual(quote.referenceSummary.map(item => item.imageNumber), [1, 2, 3, 4]);
  for (const [index, reference] of references.entries()) {
    assert.equal(quote.referenceSummary[index].assetId, reference.assetId);
    for (const key of ['characterName', 'referenceSource', 'selectionScope', 'characterLookVersionId']) {
      assert.equal(Object.hasOwn(quote.referenceSummary[index], key), Object.hasOwn(reference, key));
      assert.equal(quote.referenceSummary[index][key], reference[key]);
    }
  }
  assert.deepEqual(await f.repository.findForActor(f.child.id, alice), before);
});

async function generatedFixture(t) {
  const f = await fixture(t);
  const state = { owner: alice.userId, contentHash: 'generated_hash', publicUrl: '/outputs/generated.png', revoked: false, calls: [] };
  f.service.generatedCastService = new CinematicGeneratedCastService({
    trustedSources: { describeOwnedImage: async (id, actor) => {
      state.calls.push({ id, actor });
      if (state.revoked || state.owner !== actor.userId) {
        throw Object.assign(new Error('Source unavailable.'), { code: 'video_trusted_source_unavailable', statusCode: 409 });
      }
      return { id, contentHash: state.contentHash, publicUrl: state.publicUrl };
    } },
    assetAuthority: { importGeneratedSheet: async () => ({ id: 'asset_generated' }) }
  });
  const sheet = await f.service.generatedCastService.prepare({ generationId: 'generated', displayName: 'Lead', sheetConfirmed: true }, alice);
  await f.repository.mutateForActor(f.root.id, alice, project => {
    Object.assign(project.castAssignments[0], { sourceType: 'generated_sheet', generatedSheet: sheet,
      characterProfileId: null, characterProfileVersionId: null,
      looks: [{ id: 'binding_generated', mode: 'generated_sheet', locked: true,
        trustedGenerationId: sheet.generationId, contentHash: sheet.contentHash, assetIds: [sheet.assetId] }] });
    return project;
  });
  state.calls = [];
  return { ...f, state };
}

test('Scene selects and clears canonical generated Cast sheets through the existing authority without deleting media', async t => {
  const f = await generatedFixture(t);
  const before = await f.service.getProject(f.child.id, alice);
  const selected = await f.select(['binding_generated']);
  assert.deepEqual(selected.scene.wardrobeLookIds, ['binding_generated']);
  assert.deepEqual(f.state.calls, [{ id: 'generated', actor: alice }]);
  assert.deepEqual(selected.scene.shots.slice(1), before.scenes[0].shots.slice(1));
  assert.deepEqual(selected.scene.shots[0].approvedStoryboardSource, before.scenes[0].shots[0].approvedStoryboardSource);
  assert.deepEqual(selected.project.generationAttempts.map(item => item.outputAsset), before.generationAttempts.map(item => item.outputAsset));
  assert.equal(f.authorityCalls.length, 0);
  const resolver = new CinematicVideoReferencePlanService({ generatedCastService: f.service.generatedCastService });
  const plan = await resolver.prepare({ project: selected.project, scene: selected.scene, shot: selected.scene.shots[0],
    mode: 'looks_only', model: { supportsCinematicLookReferences: true, inputModes: ['multimodal_reference'], referenceImageLimit: 6 }, actorContext: alice });
  assert.equal(plan.references[0].assetId, 'asset_generated');
  assert.equal(plan.references[0].referenceSource, 'generated');
  assert.equal(plan.references[0].selectionScope, 'scene');
  const cleared = await f.select([]);
  assert.deepEqual(cleared.scene.wardrobeLookIds, []);
  assert.deepEqual(cleared.scene.shots[1], before.scenes[0].shots[1]);
  assert.deepEqual((await f.repository.findForActor(f.child.id, alice)).castAssignments[0].looks, []);
});

test('Scene rejects unlocked or mismatched generated Look bindings without changing selections or media', async t => {
  const f = await generatedFixture(t);
  const root = await f.repository.findForActor(f.root.id, alice);
  const original = root.castAssignments[0].looks[0];
  const before = await f.repository.findForActor(f.child.id, alice);
  for (const patch of [{ locked: false }, { mode: 'character_look' }, { trustedGenerationId: 'foreign' },
    { contentHash: 'changed' }, { assetIds: ['other_asset'] }, { assetIds: [] }]) {
    await f.repository.mutateForActor(f.root.id, alice, project => {
      project.castAssignments[0].looks = [{ ...original, ...patch }];
      return project;
    });
    await assert.rejects(f.select(['binding_generated']), { code: patch.locked === false || patch.mode
      ? 'cinematic_scene_look_unapproved' : 'cinematic_generated_cast_unavailable' });
    assert.deepEqual(await f.repository.findForActor(f.child.id, alice), before);
  }
});

test('Scene reauthorizes generated sheet ownership, revocation and pinned content even on repeated selection', async t => {
  const f = await generatedFixture(t);
  await f.select(['binding_generated']);
  const before = await f.repository.findForActor(f.child.id, alice);
  for (const patch of [{ owner: bob.userId }, { revoked: true }, { contentHash: 'replaced' }, { publicUrl: '/outputs/replaced.png' }]) {
    Object.assign(f.state, { owner: alice.userId, revoked: false, contentHash: 'generated_hash', publicUrl: '/outputs/generated.png' }, patch);
    await assert.rejects(f.select(['binding_generated']), { code: patch.owner || patch.revoked
      ? 'video_trusted_source_unavailable' : 'cinematic_generated_cast_unavailable' });
    assert.deepEqual(await f.repository.findForActor(f.child.id, alice), before);
  }
  await assert.rejects(f.select([], {}, bob), { code: 'cinematic_project_not_found' });
  await f.select([]);
});

for (const replacement of [{ characterProfileId: 'profile_b', characterProfileVersionId: 'profile_version' },
  { characterProfileId: 'profile_a', characterProfileVersionId: 'profile_version_2' }]) {
  test(`shared identity replacement ${replacement.characterProfileId}/${replacement.characterProfileVersionId} clears incompatible selections, not media`, async t => {
    const f = await fixture(t);
    await f.bind('arrival');
    await f.select(['binding_arrival']);
    for (const id of [f.child.id, f.sibling.id]) {
      await f.repository.mutateForActor(id, alice, project => {
        project.generationAttempts.push(...project.scenes[0].shots.map(shot => ({
          id: `still_${shot.id}`, shotId: shot.id, operation: 'cinematic_storyboard_still', status: 'approved',
          outputAssetIds: [shot.approvedStoryboardSource.assetId], outputAsset: structuredClone(shot.approvedStoryboardSource)
        })));
        return project;
      });
    }
    f.service.characterAuthorizationService = { validateGenerationContext: async context => ({
      identityPack: { characterProfileId: context.characterProfileId,
        characterProfileVersionId: context.characterProfileVersionId, status: 'identity_pack_ready' },
      authorizedCharacterFaceReferenceUrl: '/outputs/new_identity.png'
    }) };
    const before = await f.service.getProject(f.child.id, alice);
    const sibling = await f.service.getProject(f.sibling.id, alice);
    const root = await f.service.getProject(f.root.id, alice);
    const result = await f.service.upsertSharedCharacterDossier(f.child.id, {
      expectedProjectVersion: before.version, expectedStoryProjectVersion: root.version,
      assignmentId: 'cast_a', sourceType: 'character', displayName: 'Replacement', ...replacement
    }, alice);
    assert.deepEqual(result.storyProject.castAssignments[0].looks, []);
    assert.equal(result.storyProject.castAssignments[0].characterProfileId, replacement.characterProfileId);
    assert.equal(result.storyProject.castAssignments[0].characterProfileVersionId, replacement.characterProfileVersionId);
    for (const [id, previous] of [[f.child.id, before], [f.sibling.id, sibling]]) {
      const project = await f.service.getProject(id, alice);
      assert.deepEqual(project.castAssignments[0].looks, []);
      assert.equal(project.version, previous.version + 1);
      assert.deepEqual(project.scenes[0].wardrobeLookIds, []);
      assert.deepEqual(project.scenes[0].shots[1].wardrobeLookIds, []);
      assert.equal(project.scenes[0].shots[0].storyboardStatus, 'draft');
      assert.equal(project.scenes[0].shots[0].approvedStoryboardSource, undefined);
      assert.equal(project.scenes[0].shots[1].approvedStoryboardSource, undefined);
      assert.deepEqual(project.scenes[0].shots[2], previous.scenes[0].shots[2]);
      assert.deepEqual(project.generationAttempts.map(item => [item.id, item.status, item.outputAsset, item.referenceSnapshot]),
        previous.generationAttempts.map(item => [item.id, item.status, item.outputAsset, item.referenceSnapshot]));
      assert.equal(project.generationAttempts[0].downstreamSourceStatus, 'source_changed');
      assert.deepEqual(project.commandReceipts, previous.commandReceipts);
      assert.equal(project.timelineVersions[0].status, 'stale');
      const context = await f.service.getStoryboardGenerationContext(id, 'scene', 'inherit', alice);
      assert.equal(context.generationEligible, false);
      assert.equal(context.blockingReason, 'cinematic_storyboard_look_not_ready');
      assert.equal(context.references.outfit_front, null);
    }
    await assert.rejects(f.select(['binding_arrival']), { code: 'cinematic_scene_look_invalid' });
  });
}

test('same-identity shared dossier edits preserve Look selections and existing media authority', async t => {
  const f = await fixture(t);
  await f.bind('arrival');
  await f.select(['binding_arrival']);
  f.service.characterAuthorizationService = { validateGenerationContext: async context => ({
    identityPack: { characterProfileId: context.characterProfileId,
      characterProfileVersionId: context.characterProfileVersionId, status: 'identity_pack_ready' }
  }) };
  const before = await f.service.getProject(f.child.id, alice);
  const root = await f.service.getProject(f.root.id, alice);
  const result = await f.service.upsertSharedCharacterDossier(f.child.id, {
    expectedProjectVersion: before.version, expectedStoryProjectVersion: root.version,
    assignmentId: 'cast_a', sourceType: 'character', characterProfileId: 'profile_a',
    characterProfileVersionId: 'profile_version', displayName: 'Revised name', objective: 'Read the letter'
  }, alice);
  assert.deepEqual(result.storyProject.castAssignments[0].looks, root.castAssignments[0].looks);
  assert.deepEqual(result.project.scenes, before.scenes);
  assert.deepEqual(result.project.generationAttempts, before.generationAttempts);
});

test('binding, Scene and single-Cast First Frame reject old-version approved Looks using canonical authority', async t => {
  const f = await fixture(t);
  await f.bind('arrival');
  await f.select(['binding_arrival']);
  await f.repository.mutateForActor(f.root.id, alice, project => {
    project.castAssignments[0].characterProfileVersionId = 'profile_version_2';
    // Forged local metadata cannot override the Character Look owner's source version.
    project.castAssignments[0].looks[0].characterLookIdentityAssurance = { characterProfileVersionId: 'profile_version_2' };
    return project;
  });
  const root = await f.repository.findForActor(f.root.id, alice);
  const child = await f.repository.findForActor(f.child.id, alice);
  await assert.rejects(f.bind('evening'), { code: 'cinematic_look_identity_version_mismatch' });
  await assert.rejects(f.bind('arrival'), { code: 'cinematic_look_identity_version_mismatch' });
  await assert.rejects(f.select(['binding_arrival']), { code: 'cinematic_look_identity_version_mismatch' });
  for (const shot of ['inherit', 'override']) {
    await assert.rejects(f.service.getStoryboardGenerationContext(f.child.id, 'scene', shot, alice),
      { code: 'cinematic_look_identity_version_mismatch' });
  }
  assert.deepEqual(await f.repository.findForActor(f.root.id, alice), root);
  assert.deepEqual(await f.repository.findForActor(f.child.id, alice), child);
  f.records.find(item => item.id === 'evening').sourceCharacterProfileVersionId = 'profile_version_2';
  await f.bind('evening');
  await f.select(['binding_evening']);
  const context = await f.service.getStoryboardGenerationContext(f.child.id, 'scene', 'inherit', alice);
  assert.equal(context.generationEligible, true);
  assert.equal(context.references.outfit_front, '/outputs/asset_evening.png');
});

test('single-Cast First Frame rejects an approved Look belonging to the replaced Profile', async t => {
  const f = await fixture(t);
  await f.bind('arrival');
  await f.select(['binding_arrival']);
  await f.repository.mutateForActor(f.root.id, alice, project => {
    project.castAssignments[0].characterProfileId = 'profile_b';
    return project;
  });
  await assert.rejects(f.service.getStoryboardGenerationContext(f.child.id, 'scene', 'inherit', alice),
    { code: 'character_look_version_unavailable' });
});

test('Video reference preparation rejects missing/mismatched canonical identity versions without changing historical Takes', async t => {
  const f = await fixture(t);
  await f.bind('arrival');
  const selected = await f.select(['binding_arrival']);
  const before = await f.repository.findForActor(f.child.id, alice);
  const resolver = new CinematicVideoReferencePlanService({ lookService: {
    resolveApprovedSheetReference: async () => ({ characterProfileVersionId: 'old_identity',
      asset: { id: 'asset_arrival', publicUrl: '/outputs/arrival.png', contentHash: 'hash_arrival' } })
  } });
  const input = { project: selected.project, scene: selected.scene, shot: selected.scene.shots[0],
    mode: 'looks_only', model: { supportsCinematicLookReferences: true, inputModes: ['multimodal_reference'], referenceImageLimit: 6 }, actorContext: alice };
  await assert.rejects(resolver.prepare(input), { code: 'cinematic_look_identity_version_mismatch' });
  delete input.project.castAssignments[0].characterProfileVersionId;
  await assert.rejects(resolver.prepare(input), { code: 'cinematic_look_identity_version_mismatch' });
  assert.deepEqual(await f.repository.findForActor(f.child.id, alice), before);
});
