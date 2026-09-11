import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { CinematicGeneratedCastService } from '../server/domain/cinematic/CinematicGeneratedCastService.js';
import { CinematicVideoReferencePlanService } from '../server/domain/cinematic/CinematicVideoReferencePlanService.js';
import { createSingleCharacterCinematicProject } from './fixtures/cinematic/cinematicProjectFixtures.js';
import { registerCharacterProfileRoutes } from '../server/app/routes/characterProfileRoutes.js';

const actor = { userId: 'owner', username: 'owner', role: 'user' };
function fixture() {
  let project = createSingleCharacterCinematicProject();
  project.castAssignments = []; project.scenes = []; project.setup.storyRoleSlots = [];
  const state = { revoked: false, hash: 'original', describes: 0, category: 'look-sheet' };
  const sourceService = new CinematicGeneratedCastService({
    trustedSources: { async describeOwnedImage(id, caller, options = {}) {
      state.describes++;
      if (options.requireLookSheet && state.category !== 'look-sheet') throw Object.assign(new Error('Sheet required'), { code: 'video_trusted_source_unavailable' });
      if (caller.userId !== actor.userId || state.revoked || !['sheet1', 'sheet2'].includes(id)) {
        throw Object.assign(new Error('Source unavailable'), { code: 'video_trusted_source_unavailable' });
      }
      return { id, contentHash: state.hash, publicUrl: `/outputs/${id}.png`, modelId: 'seedream-5-0-pro',
        expiresAt: new Date(Date.now() + 86400000).toISOString() };
    } },
    assetAuthority: { async importGeneratedSheet(source) { return { id: `asset_${source.id}` }; } }
  });
  const service = new CinematicApplicationService({ generatedCastService: sourceService,
    repository: {
      async findForActor(_id, caller) { return caller.userId === actor.userId ? structuredClone(project) : null; },
      async mutateForActor(_id, caller, update) {
        assert.equal(caller.userId, actor.userId); project = update(structuredClone(project)); return structuredClone(project);
      }
    },
    characterAuthorizationService: { validateGenerationContext() { assert.fail('No Character required'); } },
    assetRepository: { findByIdForOwner: async id => ({ id, publicUrl: `/outputs/${id.replace('asset_', '')}.png` }) }
  });
  const add = (overrides = {}) => service.upsertCastAssignment(project.id, {
    expectedVersion: project.version, sourceType: 'generated_sheet', generationId: 'sheet1', sheetConfirmed: true,
    assignmentId: 'cast1', displayName: 'Mira', storyImportance: 'protagonist', ...overrides
  }, actor);
  return { service, sourceService, state, add, get project() { return project; }, set project(value) { project = value; } };
}

test('direct sheets create distinct Cast members without any Character, deduplicate retry and retain direction edits', async () => {
  const f = fixture();
  await f.add();
  await f.add({ assignmentId: 'retry' });
  assert.equal(f.project.castAssignments.length, 1);
  const first = f.project.castAssignments[0];
  assert.equal(first.characterProfileId, null); assert.equal(first.characterProfileVersionId, null);
  assert.equal(first.sourceType, 'generated_sheet'); assert.equal(first.identityReady, true);
  assert.equal(first.looks[0].mode, 'generated_sheet'); assert.equal(first.looks[0].characterLookId, undefined);
  await f.add({ generationId: 'sheet2', assignmentId: 'cast2', displayName: 'Noah', storyImportance: 'supporting' });
  assert.equal(f.project.castAssignments.length, 2);
  await f.add({ sheetConfirmed: undefined, objective: 'Protect the garden' });
  assert.equal(f.project.castAssignments[0].objective, 'Protect the garden');
  assert.deepEqual(f.project.castAssignments[0].looks, first.looks);
  await assert.rejects(f.service.upsertWardrobeLook(f.project.id, 'cast1', { mode: 'uploaded' }, actor),
    { code: 'cinematic_generated_cast_look_locked' });
});

test('new Cast requires sheet metadata while legacy pinned Cast remains editable and resolvable', async () => {
  const f = fixture();
  f.state.category = 'image';
  await assert.rejects(f.add(), { code: 'video_trusted_source_unavailable' });
  f.state.category = 'look-sheet';
  await f.add();
  f.state.category = 'image';
  await f.add({ objective: 'Retain legacy direction' });
  assert.equal(f.project.castAssignments[0].objective, 'Retain legacy direction');
  await f.sourceService.resolve(f.project.castAssignments[0], actor);
  await assert.rejects(f.add({ generationId: 'sheet2' }), { code: 'video_trusted_source_unavailable' });
});

test('mixed source, unconfirmed sheet, unauthorized project, stale version and changed source are rejected', async () => {
  const f = fixture();
  for (const patch of [{ characterProfileId: 'character' }, { characterProfileVersionId: 'version' },
    { looks: [] }, { displayName: '' }, { sheetConfirmed: false }]) {
    await assert.rejects(f.add(patch), { code: 'cinematic_generated_cast_unavailable' });
  }
  await assert.rejects(f.service.upsertCastAssignment(f.project.id,
    { sourceType: 'generated_sheet' }, { userId: 'other' }), { code: 'cinematic_project_not_found' });
  await f.add();
  f.state.hash = 'changed';
  await assert.rejects(f.add(), { code: 'cinematic_generated_cast_unavailable' });
  await assert.rejects(f.sourceService.resolve(f.project.castAssignments[0], actor), { code: 'cinematic_generated_cast_unavailable' });
  f.state.hash = 'original'; f.state.revoked = true;
  await assert.rejects(f.add(), { code: 'video_trusted_source_unavailable' });
});

test('Storyboard carries one whole identity sheet, no Profile context, and expiry prevents reuse without hiding the project', async () => {
  const f = fixture(); await f.add();
  const original = createSingleCharacterCinematicProject();
  const assignment = f.project.castAssignments[0];
  original.castAssignments = [assignment];
  const scene = original.scenes[0], shot = scene.shots[0];
  scene.castAssignmentIds = shot.castAssignmentIds = [assignment.id];
  scene.wardrobeLookIds = shot.wardrobeLookIds = [assignment.looks[0].id];
  f.project = original;
  const context = await f.service.getStoryboardGenerationContext(original.id, scene.id, shot.id, actor);
  assert.equal(context.characterProfileContext, null);
  assert.equal(context.references.character_reference, '/outputs/sheet1.png');
  assert.equal(context.references.outfit_front, null); assert.equal(context.references.outfit_back, null);
  assert.deepEqual(context.keyframeContract.referencePlan.characterProfileVersionIds, []);
  assert.equal(context.cast[0].identityReady, true);
  assert.equal(context.generationEligible, true, context.blockingReason);
  assignment.generatedSheet.expiresAt = '2000-01-01T00:00:00Z';
  assert.equal((await f.service.getProject(original.id, actor)).castAssignments[0].identityReady, false);
  f.state.revoked = true;
  await assert.rejects(f.service.getStoryboardGenerationContext(original.id, scene.id, shot.id, actor),
    { code: 'video_trusted_source_unavailable' });
});

test('Storyboard resolves multiple named Cast sheets and explicit empty coverage without singular identity fallback', async () => {
  const f = fixture(); await f.add(); await f.add({ generationId: 'sheet2', assignmentId: 'cast2', displayName: 'Noah' });
  const project = createSingleCharacterCinematicProject();
  project.castAssignments = f.project.castAssignments;
  const scene = project.scenes[0], shot = scene.shots[0];
  scene.castAssignmentIds = ['cast1', 'cast2'];
  shot.castMode = 'selected'; shot.castAssignmentIds = ['cast2', 'cast1'];
  scene.wardrobeLookIds = shot.wardrobeLookIds = ['cast1_sheet', 'cast2_sheet'];
  f.project = project;
  const context = await f.service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor);
  assert.equal(context.generationEligible, true, context.blockingReason);
  assert.equal(context.characterProfileContext, null);
  assert.equal(context.references.character_reference ?? null, null);
  assert.equal(context.references.outfit_front, null);
  assert.equal(context.cinematicContainsPeople, true);
  assert.deepEqual(context.cinematicCastReferences.map(row => row.generationId), ['sheet2', 'sheet1']);
  assert.deepEqual(context.cinematicCastReferences.map(row => row.displayName), ['Noah', 'Mira']);
  assert.ok(context.cinematicCastReferences.every(row => !row.referenceValue));
  shot.castMode = 'none';
  const empty = await f.service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor);
  assert.equal(empty.generationEligible, true, empty.blockingReason);
  assert.equal(empty.cinematicContainsPeople, false);
  assert.deepEqual(empty.cinematicCastReferences, []);
  assert.equal(empty.references.character_reference ?? null, null);
  assert.equal(empty.references.outfit_front, null);
});

test('Produce resolves each direct sheet by Shot order with no Character Look and rechecks source on every preparation', async () => {
  const f = fixture(); await f.add(); await f.add({ generationId: 'sheet2', assignmentId: 'cast2', displayName: 'Noah' });
  const resolver = new CinematicVideoReferencePlanService({ generatedCastService: f.sourceService,
    lookService: { resolveApprovedSheetReference() { assert.fail('No Character Look required'); } } });
  const input = { project: f.project, scene: { castAssignmentIds: ['cast1', 'cast2'], wardrobeLookIds: ['cast1_sheet', 'cast2_sheet'] },
    shot: { castAssignmentIds: ['cast2', 'cast1'] }, actorContext: actor, mode: 'storyboard_and_looks',
    source: { assetId: 'board', assetVersionId: 'board', sourceFingerprint: 'board-hash', imageUrl: '/outputs/board.png' },
    model: { supportsCinematicLookReferences: true, inputModes: ['multimodal_reference'], referenceImageLimit: 3 } };
  const plan = await resolver.prepare(input);
  assert.equal(plan.references.length, 3);
  assert.deepEqual(plan.references.slice(1).map(item => item.trustedGenerationId), ['sheet2', 'sheet1']);
  assert.deepEqual(plan.references.slice(1).map(item => item.characterName), ['Noah', 'Mira']);
  assert.ok(plan.references.slice(1).every(item => item.purpose === 'generated_look' && !item.characterProfileId));
  f.state.revoked = true;
  await assert.rejects(resolver.prepare(input), { code: 'video_trusted_source_unavailable' });
});

test('replacement preserves Cast ID and invalidates dependent Storyboard instead of deleting historical work', async () => {
  const f = fixture(); await f.add();
  const before = createSingleCharacterCinematicProject();
  f.project.scenes = before.scenes;
  const scene = f.project.scenes[0], shot = scene.shots[0];
  scene.castAssignmentIds = shot.castAssignmentIds = ['cast1'];
  scene.wardrobeLookIds = shot.wardrobeLookIds = ['cast1_sheet'];
  await f.add({ generationId: 'sheet2' });
  assert.equal(f.project.castAssignments[0].id, 'cast1');
  assert.equal(f.project.castAssignments[0].generatedSheet.generationId, 'sheet2');
  assert.equal(f.project.scenes[0].shots[0].approvedStoryboardSource, undefined);
  assert.deepEqual(f.project.scenes[0].wardrobeLookIds, []);
});

test('retired Character-bound import route returns 410 without calling an import or deleting records', async () => {
  let handler;
  const app = { use() {}, get() {}, put() {}, patch() {}, delete() {},
    post(route, fn) { if (route.endsWith('/looks/import-generated')) handler = fn; } };
  registerCharacterProfileRoutes(app, { lookService: { importGeneratedSheet() { assert.fail('No new imports'); } } });
  let status, body;
  const res = { status(value) { status = value; return res; }, json(value) { body = value; } };
  await handler({ actorContext: actor }, res);
  assert.equal(status, 410); assert.equal(body.error.code, 'character_generated_import_retired');
});
