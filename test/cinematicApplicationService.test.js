import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { CinematicProjectRepository } from '../server/repositories/cinematic/CinematicProjectRepository.js';

const alice = { userId: 'usr_alice', username: 'user_alice', role: 'user' };

async function fixture(overrides = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-service-'));
  const repository = new CinematicProjectRepository({ projectsFile: path.join(directory, 'projects.json') });
  const storyboardAssetService = {
    approveGenerationResult: async ({ jobId }) => ({
      assetId: `ast_${jobId}`,
      assetVersionId: `ast_${jobId}`,
      sourceJobId: jobId,
      imageUrl: `/outputs/${jobId}.jpg`,
      thumbnailUrl: `/outputs/${jobId}.jpg`,
      contentHash: `hash_${jobId}`,
      sourceFingerprint: `fingerprint_${jobId}`,
      approvedAt: new Date().toISOString()
    })
  };
  const characterAuthorizationService = {
    validateGenerationContext: async context => ({
      ...context,
      displayNameSnapshot: context.characterProfileId,
      authorizedCharacterFaceReferenceUrl: `/api/character-profiles/${context.characterProfileId}/face`,
      identityPack: {
        status: 'identity_pack_ready', ageRange: { min: 20, max: 29 },
        presentationGender: 'female', characterType: 'reusable_model',
        outfitBehavior: 'replaceable', identityPolicyVersion: 'character-identity-pack-v2'
      },
      attribution: { ownerUserId: 'usr_alice', ownerUsername: 'user_alice' }
    })
  };
  const backofficePolicy = {
    assertCanAccessBackoffice: actor => {
      if (!['admin', 'support'].includes(actor?.role)) {
        const error = new Error('Admin or support access is required.');
        error.code = 'admin_access_forbidden'; error.statusCode = 403;
        throw error;
      }
      return actor;
    }
  };
  const wardrobeAuthorityService = {
    authorizeLook: async input => ({
      mode: input.mode || 'character_default',
      assets: (input.assetIds || []).map(id => ({ id, assetType: 'generation_reference', contentHash: `hash_${id}` }))
    })
  };
  return { directory, service: new CinematicApplicationService({ repository, storyboardAssetService, characterAuthorizationService, wardrobeAuthorityService, backofficePolicy, ...overrides }) };
}

const setup = {
  projectName: 'Platform Letter', platform: 'tiktok', durationSeconds: 30,
  storyBrief: 'Two people meet at a station.', creativeDirection: '',
  genre: 'drama', audienceFeeling: 'moved', pacing: 'balanced',
  endingIntent: 'resolved', mode: 'simple'
};

test('CinematicApplicationService creates, updates and archives a Project with optimistic versioning', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  assert.equal(project.title, 'Platform Letter');
  const staged = await service.setActiveStage(project.id, 'cast', 1, alice);
  assert.equal(staged.version, 2);
  assert.equal(staged.activeStage, 'cast');
  await assert.rejects(
    service.updateSetup(project.id, { ...setup, expectedVersion: 1 }, alice),
    error => error.code === 'cinematic_version_conflict' && error.statusCode === 409
  );
  const archived = await service.archiveProject(project.id, 2, alice);
  assert.deepEqual(archived, { success: true, projectId: project.id });
  assert.equal((await service.listProjects(alice)).items.length, 0);
});

test('CinematicApplicationService pins Cast versions and keeps one protagonist', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const first = await service.upsertCastAssignment(project.id, {
    expectedVersion: 1,
    characterProfileId: 'charprof_a',
    characterProfileVersionId: 'charver_a',
    displayName: 'Mira',
    storyImportance: 'protagonist',
    storyRoleSlotId: 'role_lead'
  }, alice);
  const second = await service.upsertCastAssignment(project.id, {
    expectedVersion: 2,
    characterProfileId: 'charprof_b',
    characterProfileVersionId: 'charver_b',
    displayName: 'Noah',
    storyImportance: 'protagonist'
  }, alice);
  assert.equal(second.castAssignments.length, 2);
  assert.equal(second.castAssignments.filter(item => item.storyImportance === 'protagonist').length, 1);
  assert.equal(second.castAssignments.find(item => item.displayName === 'Noah').storyImportance, 'protagonist');
  assert.equal(first.castAssignments[0].characterProfileVersionId, 'charver_a');
  assert.equal(first.castAssignments[0].storyRoleSlotId, 'role_lead');
  assert.equal(first.castAssignments[0].portraitUrl, '/api/character-profiles/charprof_a/face');
  assert.equal(first.castAssignments[0].identityReady, true);
});

test('CinematicApplicationService reconciles legacy false readiness from its authorized identity snapshot', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const cast = await service.upsertCastAssignment(project.id, {
    expectedVersion: project.version,
    assignmentId: 'cast_legacy_ready',
    characterProfileId: 'charprof_a',
    characterProfileVersionId: 'charver_a',
    storyRoleSlotId: 'role_lead'
  }, alice);
  await service.repository.mutateForActor(project.id, alice, draft => {
    draft.castAssignments[0].identityReady = false;
    return draft;
  });

  const reconciled = await service.getProject(project.id, alice);
  assert.equal(cast.castAssignments[0].identityReady, true);
  assert.equal(reconciled.castAssignments[0].identityReady, true);
});

test('CinematicApplicationService removes only an unused Project Cast Assignment', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject({
    ...setup,
    castPlanningMode: 'solo',
    storyRoleSlots: [{ id: 'role_lead', label: 'Lead', importance: 'required', storyFunction: '', relationshipHint: '' }]
  }, alice);
  const cast = await service.upsertCastAssignment(project.id, {
    expectedVersion: project.version,
    assignmentId: 'cast_mira',
    characterProfileId: 'charprof_a',
    characterProfileVersionId: 'charver_a',
    displayName: 'Mira',
    storyRole: 'Lead',
    storyRoleSlotId: 'role_lead'
  }, alice);
  const removed = await service.removeCastAssignment(project.id, 'cast_mira', { expectedVersion: cast.version }, alice);
  assert.equal(removed.castAssignments.length, 0);
  assert.equal(removed.setup.storyRoleSlots.length, 1);
  assert.equal(removed.setup.storyRoleSlots[0].id, 'role_lead');
});

test('CinematicApplicationService blocks Cast removal when Story Plan work references it', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const cast = await service.upsertCastAssignment(project.id, {
    expectedVersion: project.version,
    assignmentId: 'cast_mira',
    characterProfileId: 'charprof_a',
    characterProfileVersionId: 'charver_a',
    displayName: 'Mira'
  }, alice);
  const planned = await service.saveStoryPlan(project.id, {
    expectedVersion: cast.version,
    approved: true,
    scenes: [{
      id: 'scene_station', title: 'Station', castAssignmentIds: ['cast_mira'],
      shots: [{ id: 'shot_arrival', title: 'Arrival', durationMs: 2000, castAssignmentIds: ['cast_mira'] }]
    }]
  }, alice);
  await assert.rejects(
    service.removeCastAssignment(project.id, 'cast_mira', { expectedVersion: planned.version }, alice),
    error => error.code === 'cinematic_cast_assignment_in_use'
      && error.statusCode === 409
      && error.details.sceneIds.includes('scene_station')
      && error.details.shotIds.includes('shot_arrival')
  );
});

test('CinematicApplicationService safely replaces referenced Cast while preserving role membership', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const cast = await service.upsertCastAssignment(project.id, {
    expectedVersion: project.version,
    assignmentId: 'cast_lead',
    characterProfileId: 'charprof_a',
    characterProfileVersionId: 'charver_a',
    displayName: 'Mira',
    storyRole: 'Young Woman',
    storyRoleSlotId: 'role_lead',
    objective: 'Leave the platform',
    personalityTraits: ['watchful']
  }, alice);
  const withLook = await service.upsertWardrobeLook(project.id, 'cast_lead', {
    expectedVersion: cast.version,
    lookId: 'look_station',
    name: 'Station Look',
    mode: 'uploaded',
    assetIds: ['asset_station']
  }, alice);
  const planned = await service.saveStoryPlan(project.id, {
    expectedVersion: withLook.version,
    approved: true,
    scenes: [{
      id: 'scene_station', title: 'Station', castAssignmentIds: ['cast_lead'],
      wardrobeLookIds: ['look_station'],
      shots: [{
        id: 'shot_wait', title: 'Wait', durationMs: 2000,
        castAssignmentIds: ['cast_lead'], wardrobeLookIds: ['look_station']
      }]
    }]
  }, alice);
  const approval = await service.approveStoryboardSource(project.id, 'shot_wait', {
    expectedVersion: planned.version,
    expectedShotVersion: 1,
    jobId: 'job_old_character',
    idempotencyKey: 'approve-old-character'
  }, alice);

  const replaced = await service.upsertCastAssignment(project.id, {
    expectedVersion: approval.projectVersion,
    assignmentId: 'cast_lead',
    characterProfileId: 'charprof_b',
    characterProfileVersionId: 'charver_b',
    displayName: 'Nara',
    storyRole: 'Young Woman',
    storyRoleSlotId: 'role_lead'
  }, alice);

  assert.equal(replaced.castAssignments.length, 1);
  assert.equal(replaced.castAssignments[0].id, 'cast_lead');
  assert.equal(replaced.castAssignments[0].characterProfileId, 'charprof_b');
  assert.equal(replaced.castAssignments[0].portraitUrl, '/api/character-profiles/charprof_b/face');
  assert.equal(replaced.castAssignments[0].objective, 'Leave the platform');
  assert.deepEqual(replaced.castAssignments[0].personalityTraits, ['watchful']);
  assert.deepEqual(replaced.castAssignments[0].looks, []);
  assert.deepEqual(replaced.scenes[0].castAssignmentIds, ['cast_lead']);
  assert.deepEqual(replaced.scenes[0].wardrobeLookIds, []);
  assert.deepEqual(replaced.scenes[0].shots[0].castAssignmentIds, ['cast_lead']);
  assert.deepEqual(replaced.scenes[0].shots[0].wardrobeLookIds, []);
  assert.equal(replaced.scenes[0].shots[0].approvedStoryboardSource, undefined);
  assert.equal(replaced.scenes[0].shots[0].approvedStoryboardAttemptId, undefined);
  assert.equal(replaced.scenes[0].shots[0].storyboardStatus, 'draft');
  assert.equal(replaced.generationAttempts[0].downstreamSourceStatus, 'source_changed');
  assert.equal(replaced.status, 'planned');
});

test('Setup story edits create an immutable applied Story Source version', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const originalSourceId = project.activeStorySourceVersionId;
  const updated = await service.updateSetup(project.id, {
    ...setup,
    storyBrief: 'Two strangers find the same lost letter at a station.',
    expectedVersion: project.version
  }, alice);

  assert.notEqual(updated.activeStorySourceVersionId, originalSourceId);
  assert.equal(updated.storySourceVersions.length, 2);
  assert.equal(updated.storySourceVersions.find(item => item.id === originalSourceId).status, 'superseded');
  assert.equal(updated.storySourceVersions.at(-1).status, 'applied');
});

test('Setup persists bounded story role slots separately from Cast bindings', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject({
    ...setup,
    castPlanningMode: 'duo',
    storyRoleSlots: [
      {
        id: 'role_lead', label: 'Lead', importance: 'required', storyFunction: 'Makes the choice', relationshipHint: '',
        objective: 'Leave before the train arrives', emotionalArc: 'Guarded to hopeful',
        personalityTraits: ['restrained', 'observant'], performanceDirection: 'Show the decision through breath and gaze.'
      },
      { id: 'role_friend', label: 'Friend', importance: 'optional', storyFunction: 'Reveals the truth', relationshipHint: 'Old friend' }
    ]
  }, alice);
  assert.equal(project.setup.storyRoleSlots.length, 2);
  assert.equal(project.setup.storyRoleSlots[1].importance, 'optional');
  assert.equal(project.setup.storyRoleSlots[0].objective, 'Leave before the train arrives');
  assert.deepEqual(project.setup.storyRoleSlots[0].personalityTraits, ['restrained', 'observant']);
  assert.deepEqual(project.castAssignments, []);
});

test('Story enhancement delegates through the Generation text boundary', async t => {
  const storyEnhancementService = { enhance: async input => ({ enhancementId: 'cineenh_1', enhancedStoryBrief: `${input.storyBrief} Enhanced` }) };
  const { directory, service } = await fixture({ storyEnhancementService });
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const result = await service.enhanceStory(setup, alice);
  assert.equal(result.enhancementId, 'cineenh_1');
  assert.match(result.enhancedStoryBrief, /Enhanced$/);
});

test('Wardrobe Looks remain owned by a Cast Assignment and preserve authority snapshots', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const cast = await service.upsertCastAssignment(project.id, {
    expectedVersion: project.version,
    assignmentId: 'cast_mira',
    characterProfileId: 'charprof_a',
    characterProfileVersionId: 'charver_a',
    displayName: 'Mira',
    storyImportance: 'protagonist'
  }, alice);
  const updated = await service.upsertWardrobeLook(project.id, 'cast_mira', {
    expectedVersion: cast.version,
    lookId: 'look_arrival',
    name: 'Arrival Look',
    mode: 'uploaded',
    assetIds: ['asset_front', 'asset_back'],
    coverage: 'front_back',
    locked: true
  }, alice);

  assert.equal(updated.castAssignments[0].looks.length, 1);
  assert.deepEqual(updated.castAssignments[0].looks[0].assetIds, ['asset_front', 'asset_back']);
  assert.equal(updated.castAssignments[0].looks[0].authoritySnapshot[1].contentHash, 'hash_asset_back');
  const dossierUpdated = await service.upsertCastAssignment(project.id, {
    expectedVersion: updated.version,
    assignmentId: 'cast_mira',
    characterProfileId: 'charprof_a',
    characterProfileVersionId: 'charver_a',
    displayName: 'Mira',
    objective: 'Recover the letter'
  }, alice);
  assert.equal(dossierUpdated.castAssignments[0].objective, 'Recover the letter');
  assert.equal(dossierUpdated.castAssignments[0].looks.length, 1);
  assert.equal(dossierUpdated.castAssignments[0].portraitUrl, '/api/character-profiles/charprof_a/face');
});

test('Cinematic Cast binds an immutable approved Character Look version', async t => {
  const lookService = {
    resolveApprovedVersion: async () => ({
      look: { id: 'charlook_arrival', name: 'Arrival Look' },
      version: {
        id: 'charlookver_arrival_1',
        provenance: { kind: 'system_generated', generationResultId: 'job_look' },
        identityAssurance: {
          status: 'lineage_bound', characterProfileVersionId: 'charver_a',
          validationEvidenceId: null
        },
        approvedViewAssets: {
          front: { assetId: 'ast_front', contentHash: 'hash_front' },
          side: { assetId: 'ast_side', contentHash: 'hash_side' },
          back: { assetId: 'ast_back', contentHash: 'hash_back' }
        }
      }
    })
  };
  const { directory, service } = await fixture({ lookService });
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const cast = await service.upsertCastAssignment(project.id, {
    expectedVersion: project.version,
    assignmentId: 'cast_mira',
    characterProfileId: 'charprof_a',
    characterProfileVersionId: 'charver_a',
    displayName: 'Mira'
  }, alice);
  const bound = await service.upsertWardrobeLook(project.id, 'cast_mira', {
    expectedVersion: cast.version,
    lookId: 'cinelook_arrival',
    name: 'Arrival Look',
    mode: 'character_look',
    characterLookId: 'charlook_arrival',
    characterLookVersionId: 'charlookver_arrival_1',
    coverage: 'multi_view'
  }, alice);
  const look = bound.castAssignments[0].looks[0];
  assert.equal(look.characterLookId, 'charlook_arrival');
  assert.equal(look.characterLookVersionId, 'charlookver_arrival_1');
  assert.equal(look.characterLookProvenance.kind, 'system_generated');
  assert.equal(look.characterLookIdentityAssurance.status, 'lineage_bound');
  assert.deepEqual(look.assetIds, ['ast_front', 'ast_side', 'ast_back']);
});

test('CinematicApplicationService validates Setup and pinned Character requirements', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  assert.throws(
    () => service.createProject({ ...setup, storyBrief: '' }, alice),
    error => error.code === 'cinematic_story_brief_invalid'
  );
  const project = await service.createProject(setup, alice);
  await assert.rejects(
    service.upsertCastAssignment(project.id, { expectedVersion: 1, characterProfileId: 'charprof_a' }, alice),
    error => error.code === 'cinematic_character_version_required'
  );
});

test('CinematicApplicationService saves stable Scene and Shot structure with reconciled durations', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const planned = await service.saveStoryPlan(project.id, {
    expectedVersion: 1,
    objective: 'Reach the train before the doors close.',
    logline: 'A missed connection becomes a human connection.',
    approved: true,
    scenes: [{
      id: 'scene_station',
      title: 'Last Train',
      shots: [
        { id: 'shot_clock', title: 'Clock', durationMs: 1250 },
        { id: 'shot_run', title: 'Run', durationSeconds: 2.75 }
      ]
    }]
  }, alice);
  assert.equal(planned.scenes[0].durationMs, 4000);
  assert.deepEqual(planned.scenes[0].shotOrder, ['shot_clock', 'shot_run']);
  assert.equal(planned.storyPlanVersions[0].estimatedShotCount, 2);
  assert.equal(planned.activeStoryPlanVersionId, planned.storyPlanVersions[0].id);
});

test('Story Plan v2 keeps draft separate from approval and validates target duration', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject({ ...setup, durationSeconds: 20 }, alice);
  const beat = {
    id: 'beat_choice', title: 'Choice', type: 'decision',
    purpose: 'Force the protagonist to decide', storyChange: 'She chooses to leave the platform'
  };
  const scene = {
    id: 'scene_choice', beatId: 'beat_choice', title: 'Choice',
    purpose: 'Show the final decision', storyChange: 'Waiting becomes forward motion',
    shots: [{ id: 'shot_choice', title: 'Walk away', purpose: 'Reveal the choice through action', durationMs: 20_000 }]
  };
  const draft = await service.saveStoryPlan(project.id, {
    contractVersion: 'story-plan-v2', expectedVersion: project.version,
    approved: false, beats: [beat], scenes: [scene]
  }, alice);
  assert.equal(draft.activeStoryPlanVersionId, null);
  assert.equal(draft.storyPlanVersions.at(-1).status, 'draft');
  const approved = await service.saveStoryPlan(project.id, {
    contractVersion: 'story-plan-v2', expectedVersion: draft.version,
    approved: true, beats: [beat], scenes: [scene]
  }, alice);
  assert.equal(approved.storyPlanVersions.at(-1).status, 'approved');
  assert.equal(approved.activeStoryPlanVersionId, approved.storyPlanVersions.at(-1).id);

  await assert.rejects(service.saveStoryPlan(project.id, {
    contractVersion: 'story-plan-v2', expectedVersion: approved.version,
    approved: true, beats: [{ ...beat, purpose: '' }], scenes: [scene]
  }, alice), error => error.code === 'cinematic_story_plan_details_incomplete');

  await assert.rejects(service.saveStoryPlan(project.id, {
    contractVersion: 'story-plan-v2', expectedVersion: approved.version,
    approved: true, beats: [beat],
    scenes: [{ ...scene, shots: [{ id: 'shot_short', title: 'Too short', purpose: 'Hold the decision', durationMs: 4_000 }] }]
  }, alice), error => error.code === 'cinematic_story_plan_duration_mismatch');
});

test('Story Plan v3 keeps corrected drafts inactive and gates approval on Film Readiness', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const beat = {
    id: 'beat_choice', title: 'Choice', type: 'decision', purpose: 'Force a visible decision',
    storyChange: 'Waiting becomes movement', cause: 'The last train arrives.',
    consequence: 'She walks toward the exit.', emotionalStart: 'uncertain', emotionalTurn: 'she exhales',
    emotionalEnd: 'resolved', requiredElements: ['black phone']
  };
  const incompleteScene = {
    id: 'scene_choice', beatId: beat.id, title: 'Choice', purpose: 'Show the decision',
    storyChange: 'She leaves the platform.', entryState: 'She faces the tracks.',
    exitState: 'She moves toward the exit.', objective: 'Choose a direction.', pressure: 'The train is arriving.',
    transitionIntent: 'end', shots: [{
      id: 'shot_choice', title: 'Walk away', purpose: 'Reveal the choice', durationMs: 30_000,
      subjectAction: 'She pockets the phone and walks right.', emotionalTarget: 'quiet resolve',
      performanceCue: 'One exhale.', continuityEntry: 'Phone in right hand.',
      continuityExit: 'Phone in right pocket.', transitionToNext: 'end'
    }]
  };
  const draft = await service.saveStoryPlan(project.id, {
    contractVersion: 'story-plan-v3', expectedVersion: project.version,
    approved: false, directorOperation: 'manual', beats: [beat], scenes: [incompleteScene]
  }, alice);
  assert.equal(draft.activeStoryPlanVersionId, null);
  assert.equal(draft.status, 'planning');
  assert.equal(draft.storyPlanVersions.at(-1).filmReadiness.status, 'not_ready');

  await assert.rejects(service.saveStoryPlan(project.id, {
    contractVersion: 'story-plan-v3', expectedVersion: draft.version,
    approved: true, directorOperation: 'manual', beats: [beat], scenes: [incompleteScene]
  }, alice), error => error.code === 'cinematic_story_plan_film_not_ready');

  const readyScene = structuredClone(incompleteScene);
  readyScene.shots[0].visibleMoment = 'She lowers the phone and turns toward the warm exit.';
  const approved = await service.saveStoryPlan(project.id, {
    contractVersion: 'story-plan-v3', expectedVersion: draft.version,
    approved: true, directorOperation: 'manual', warningsAcknowledged: true,
    beats: [beat], scenes: [readyScene]
  }, alice);
  assert.equal(approved.storyPlanVersions.at(-1).filmReadiness.status, 'ready_with_warnings');
  assert.equal(approved.storyPlanVersions.at(-1).scriptPreview[0].visual, readyScene.shots[0].visibleMoment);
  assert.equal(approved.activeStoryPlanVersionId, approved.storyPlanVersions.at(-1).id);
});

test('Story Plan v2 rejects Cast and Look references outside Scene authority', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject({ ...setup, durationSeconds: 20 }, alice);
  const cast = await service.upsertCastAssignment(project.id, {
    expectedVersion: project.version,
    assignmentId: 'cast_mira',
    characterProfileId: 'charprof_a',
    characterProfileVersionId: 'charver_a',
    displayName: 'Mira'
  }, alice);
  const withLook = await service.upsertWardrobeLook(project.id, 'cast_mira', {
    expectedVersion: cast.version,
    lookId: 'look_arrival',
    name: 'Arrival Look',
    mode: 'uploaded',
    assetIds: ['asset_front']
  }, alice);
  const beat = {
    id: 'beat_choice', title: 'Choice', type: 'decision',
    purpose: 'Force a decision', storyChange: 'Waiting becomes forward motion',
    sceneIds: ['scene_choice']
  };
  const scene = {
    id: 'scene_choice', beatId: beat.id, title: 'Choice',
    purpose: 'Show the decision', storyChange: 'Mira walks away', durationMs: 20_000,
    castAssignmentIds: ['cast_mira'], wardrobeLookIds: ['look_arrival'],
    shots: [{
      id: 'shot_choice', title: 'Walk away', purpose: 'Reveal the choice', durationMs: 20_000,
      castAssignmentIds: ['cast_mira'], wardrobeLookIds: ['look_unknown']
    }]
  };

  await assert.rejects(service.saveStoryPlan(withLook.id, {
    contractVersion: 'story-plan-v2', expectedVersion: withLook.version,
    approved: true, beats: [beat], scenes: [scene]
  }, alice), error => error.code === 'cinematic_story_plan_cast_authority_invalid');
});

test('Story Plan generation and v2 approval require an approved multi-view Look for required Cast', async t => {
  const storyPlanService = { generatePlan: async () => ({ proposalId: 'proposal_ready' }) };
  const lookService = {
    resolveApprovedVersion: async () => ({
      look: { id: 'charlook_station', name: 'Station Look' },
      version: {
        id: 'charlookver_station_1',
        approvedViewAssets: {
          front: { assetId: 'ast_front', contentHash: 'hash_front' },
          side: { assetId: 'ast_side', contentHash: 'hash_side' },
          back: { assetId: 'ast_back', contentHash: 'hash_back' }
        }
      }
    })
  };
  const { directory, service } = await fixture({ storyPlanService, lookService });
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject({
    ...setup,
    castPlanningMode: 'solo',
    storyRoleSlots: [{ id: 'role_lead', label: 'Lead', importance: 'required', storyFunction: 'Makes the choice', relationshipHint: '' }]
  }, alice);
  const cast = await service.upsertCastAssignment(project.id, {
    expectedVersion: project.version, assignmentId: 'cast_mira',
    characterProfileId: 'charprof_a', characterProfileVersionId: 'charver_a',
    displayName: 'Mira', storyRole: 'Lead', storyRoleSlotId: 'role_lead'
  }, alice);

  await assert.rejects(
    service.generateStoryPlan(project.id, {}, alice),
    error => error.code === 'cinematic_required_cast_look_incomplete'
      && error.details.unreadyRoleIds.includes('role_lead')
  );
  await assert.rejects(service.saveStoryPlan(project.id, {
    contractVersion: 'story-plan-v2', expectedVersion: cast.version, approved: true,
    beats: [{ id: 'beat_choice', title: 'Choice', purpose: 'Force a choice', storyChange: 'Waiting becomes action', sceneIds: ['scene_choice'] }],
    scenes: [{
      id: 'scene_choice', beatId: 'beat_choice', title: 'Choice', purpose: 'Show the choice',
      storyChange: 'Mira leaves', castAssignmentIds: ['cast_mira'], durationMs: 30_000,
      shots: [{ id: 'shot_choice', title: 'Leave', purpose: 'Reveal the choice', durationMs: 30_000, castAssignmentIds: ['cast_mira'] }]
    }]
  }, alice), error => error.code === 'cinematic_required_cast_look_incomplete');

  await service.upsertWardrobeLook(project.id, 'cast_mira', {
    expectedVersion: cast.version, lookId: 'cinelook_station', name: 'Station Look',
    mode: 'character_look', characterLookId: 'charlook_station',
    characterLookVersionId: 'charlookver_station_1', coverage: 'multi_view', locked: true
  }, alice);
  assert.deepEqual(await service.generateStoryPlan(project.id, {}, alice), { proposalId: 'proposal_ready' });
});

test('Storyboard generation context resolves only actor-owned Look and prior approved Shot references', async t => {
  const assetRepository = {
    findByIdForOwner: async (assetId, ownerUserId) => ownerUserId === alice.userId
      ? { id: assetId, ownerUserId, status: 'active', publicUrl: `/outputs/${assetId}.webp` }
      : null
  };
  const { directory, service } = await fixture({ assetRepository });
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const cast = await service.upsertCastAssignment(project.id, {
    expectedVersion: project.version, assignmentId: 'cast_mira',
    characterProfileId: 'charprof_a', characterProfileVersionId: 'charver_a', displayName: 'Mira'
  }, alice);
  const withLook = await service.upsertWardrobeLook(project.id, 'cast_mira', {
    expectedVersion: cast.version, lookId: 'look_arrival', name: 'Arrival Look',
    mode: 'uploaded', assetIds: ['asset_front'], locked: true
  }, alice);
  const planned = await service.saveStoryPlan(project.id, {
    expectedVersion: withLook.version,
    scenes: [{
      id: 'scene_a', title: 'Scene A', castAssignmentIds: ['cast_mira'], wardrobeLookIds: ['look_arrival'],
      shots: [
        { id: 'shot_a', title: 'A', durationMs: 2000, castAssignmentIds: ['cast_mira'], wardrobeLookIds: ['look_arrival'] },
        { id: 'shot_b', title: 'B', durationMs: 2000, castAssignmentIds: ['cast_mira'], wardrobeLookIds: ['look_arrival'] }
      ]
    }]
  }, alice);
  await service.approveStoryboardSource(project.id, 'shot_a', {
    expectedVersion: planned.version, expectedShotVersion: 1,
    jobId: 'job_storyboard_a1', idempotencyKey: 'approve-context-a1'
  }, alice);
  const current = await service.getProject(project.id, alice);
  const context = await service.getStoryboardGenerationContext(project.id, 'scene_a', 'shot_b', alice);
  assert.equal(context.projectVersion, current.version);
  assert.equal(context.characterProfileContext.characterProfileId, 'charprof_a');
  assert.equal(context.references.outfit_front, '/outputs/asset_front.webp');
  assert.equal(context.references.style_reference, '/outputs/job_storyboard_a1.jpg');
  assert.equal(context.continuitySource.shotId, 'shot_a');
  assert.equal(context.generationEligible, true);
});

test('Storyboard batch registers resumable Shot attempts before approval and reuses the attempt on approval', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const planned = await service.saveStoryPlan(project.id, {
    expectedVersion: project.version,
    approved: true,
    scenes: [{
      id: 'scene_batch', title: 'Batch Scene', shots: [
        { id: 'shot_batch_a', title: 'A', durationMs: 2000 },
        { id: 'shot_batch_b', title: 'B', durationMs: 2000 }
      ]
    }]
  }, alice);
  const registered = await service.registerStoryboardBatchAttempts(project.id, {
    batchId: 'ggrp_storyboard_batch',
    expectedVersion: planned.version,
    children: [
      { jobId: 'job_batch_a', sceneId: 'scene_batch', shotId: 'shot_batch_a', expectedShotVersion: 1, estimateId: 'est_a' },
      { jobId: 'job_batch_b', sceneId: 'scene_batch', shotId: 'shot_batch_b', expectedShotVersion: 1, estimateId: 'est_b' }
    ]
  }, alice);
  assert.equal(registered.generationAttempts.length, 2);
  assert.deepEqual(registered.generationAttempts.map(item => item.generationJobId), ['job_batch_a', 'job_batch_b']);
  assert.equal(registered.scenes[0].shots[0].storyboardStatus, 'generating');
  assert.equal(registered.status, 'planned');

  const replay = await service.registerStoryboardBatchAttempts(project.id, {
    batchId: 'ggrp_storyboard_batch',
    expectedVersion: planned.version,
    children: [
      { jobId: 'job_batch_a', sceneId: 'scene_batch', shotId: 'shot_batch_a', expectedShotVersion: 1 },
      { jobId: 'job_batch_b', sceneId: 'scene_batch', shotId: 'shot_batch_b', expectedShotVersion: 1 }
    ]
  }, alice);
  assert.equal(replay.generationAttempts.length, 2);

  const firstApproval = await service.approveStoryboardSource(project.id, 'shot_batch_a', {
    expectedVersion: registered.version,
    expectedShotVersion: 1,
    jobId: 'job_batch_a',
    idempotencyKey: 'approve-batch-a'
  }, alice);
  const approved = await service.getProject(project.id, alice);
  assert.equal(approved.generationAttempts.length, 2);
  assert.equal(approved.generationAttempts.find(item => item.generationJobId === 'job_batch_a').status, 'approved');
  assert.equal(approved.status, 'planned');

  await service.approveStoryboardSource(project.id, 'shot_batch_b', {
    expectedVersion: firstApproval.projectVersion, expectedShotVersion: 1,
    jobId: 'job_batch_b', idempotencyKey: 'approve-batch-b'
  }, alice);
  const ready = await service.getProject(project.id, alice);
  assert.equal(ready.status, 'storyboard_ready');
});

test('Cinematic repository maps legacy storyboarding status to planned', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const projectsFile = path.join(directory, 'projects.json');
  const data = JSON.parse(await fs.readFile(projectsFile, 'utf8'));
  data.projects[0].status = 'storyboarding';
  await fs.writeFile(projectsFile, JSON.stringify(data, null, 2));

  const recovered = await service.getProject(project.id, alice);
  assert.equal(recovered.status, 'planned');
});

test('Storyboard source approval is idempotent and replacement stales only dependent work', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const planned = await service.saveStoryPlan(project.id, {
    expectedVersion: 1,
    approved: true,
    scenes: [{
      id: 'scene_a', title: 'Scene A', shots: [
        { id: 'shot_a', title: 'A', durationMs: 2000 },
        { id: 'shot_b', title: 'B', durationMs: 2000 }
      ]
    }]
  }, alice);
  const first = await service.approveStoryboardSource(project.id, 'shot_a', {
    expectedVersion: planned.version,
    expectedShotVersion: 1,
    jobId: 'job_storyboard_a1',
    idempotencyKey: 'approve-a1'
  }, alice);
  assert.equal(first.generationEligible, true);
  const replay = await service.approveStoryboardSource(project.id, 'shot_a', {
    expectedVersion: 1,
    expectedShotVersion: 1,
    jobId: 'job_storyboard_a1',
    idempotencyKey: 'approve-a1'
  }, alice);
  assert.deepEqual(replay, first);

  await service.repository.mutateForActor(project.id, alice, draft => {
    draft.generationAttempts.push({
      id: 'video_a1', shotId: 'shot_a', operation: 'cinematic_draft_clip',
      status: 'approved', sourceFingerprint: 'fingerprint_job_storyboard_a1'
    }, {
      id: 'video_b1', shotId: 'shot_b', operation: 'cinematic_draft_clip',
      status: 'approved', sourceFingerprint: 'fingerprint_job_storyboard_b1'
    });
    draft.timelineVersions.push({
      id: 'timeline_1', status: 'approved', entries: [
        { shotId: 'shot_a', sourceFingerprint: 'fingerprint_job_storyboard_a1' },
        { shotId: 'shot_b', sourceFingerprint: 'fingerprint_job_storyboard_b1' }
      ]
    });
    return draft;
  });
  const current = await service.getProject(project.id, alice);
  const replaced = await service.approveStoryboardSource(project.id, 'shot_a', {
    expectedVersion: current.version,
    expectedShotVersion: 2,
    jobId: 'job_storyboard_a2',
    idempotencyKey: 'approve-a2'
  }, alice);
  assert.equal(replaced.videoAttempts[0].downstreamSourceStatus, 'source_changed');
  const stored = await service.getProject(project.id, alice);
  assert.equal(stored.generationAttempts.find(item => item.id === 'video_a1').downstreamSourceStatus, 'source_changed');
  assert.equal(stored.generationAttempts.find(item => item.id === 'video_b1').downstreamSourceStatus, undefined);
  assert.equal(stored.timelineVersions[0].entries[0].downstreamSourceStatus, 'source_changed');
  assert.equal(stored.timelineVersions[0].entries[1].downstreamSourceStatus, undefined);
});

test('Produce context blocks a Shot without an approved immutable Storyboard source', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const planned = await service.saveStoryPlan(project.id, {
    expectedVersion: 1,
    scenes: [{ id: 'scene_a', title: 'A', transitionIntent: 'cut on movement', shots: [{
      id: 'shot_a', title: 'A', durationMs: 1000,
      visibleMoment: 'Nara looks toward the door.', subjectAction: 'She takes one step.',
      emotionalTarget: 'resolved', performanceCue: 'A quiet exhale.',
      continuityEntry: 'Feet planted.', continuityExit: 'Right foot forward.',
      transitionToNext: 'cut on the step', dialogueCues: [{
        speakerCastAssignmentId: '', offscreenVoiceRole: 'father', text: 'Tomorrow.', delivery: 'memory',
        startOffsetMs: 0, estimatedDurationMs: 500, speakerVisible: false
      }], audioCues: [{ kind: 'ambience', source: 'rain', description: 'Soft rain', startOffsetMs: 0, durationMs: 1000 }]
    }] }]
  }, alice);
  const context = await service.getProduceShotContext(planned.id, 'scene_a', 'shot_a', alice);
  assert.equal(context.generationEligible, false);
  assert.equal(context.blockingReason, 'cinematic_storyboard_source_required');
  assert.equal(context.directingContract.visibleMoment, 'Nara looks toward the door.');
  assert.equal(context.directingContract.dialogueCues[0].text, 'Tomorrow.');
  assert.equal(context.directingContract.audioCues[0].description, 'Soft rain');
});

test('Cinematic video attempt uses the approved Storyboard source and can be approved only after capture', async t => {
  const calls = [];
  const outputAsset = { id: 'video_asset_1', publicUrl: '/outputs/cinematic/clip.mp4', posterUrl: null };
  const videoGenerationService = {
    async quote(request, actor, workflow) {
      calls.push(['quote', request, actor, workflow]);
      return { estimate: { estimateId: 'vest_cinematic', estimatedCredits: 40 }, account: { availableCredits: 100, canAfford: true } };
    },
    async submit(request, actor, workflow) {
      calls.push(['submit', request, actor, workflow]);
      return {
        id: 'videotask_cinematic', status: 'provider_queued', providerId: request.providerId,
        modelId: request.modelId, providerTaskId: 'provider_task_1', reservationId: 'rsv_cinematic',
        estimateId: request.estimateId
      };
    },
    async getAndPoll() {
      return { id: 'videotask_cinematic', status: 'completed', billingStatus: 'captured', outputAsset };
    }
  };
  const { directory, service } = await fixture({ videoGenerationService });
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const created = await service.createProject(setup, alice);
  const planned = await service.saveStoryPlan(created.id, {
    expectedVersion: created.version,
    scenes: [{ id: 'scene_a', title: 'A', shots: [{ id: 'shot_a', title: 'A', durationMs: 4000, prompt: 'Slow push in.' }] }]
  }, alice);
  await service.approveStoryboardSource(created.id, 'shot_a', {
    expectedVersion: planned.version, expectedShotVersion: 1,
    jobId: 'job_storyboard_video', idempotencyKey: 'approve-video-source'
  }, alice);
  const approved = await service.getProject(created.id, alice);
  const shot = approved.scenes[0].shots[0];
  const input = {
    expectedVersion: approved.version, expectedShotVersion: shot.version,
    sourceFingerprint: shot.approvedStoryboardSource.sourceFingerprint,
    providerId: 'modelark', modelId: 'seedance-test', prompt: 'Slow push in.',
    aspectRatio: '9:16', resolution: '720p', durationSeconds: 4, audioMode: 'none'
  };
  const quote = await service.quoteVideoAttempt(created.id, 'scene_a', 'shot_a', input, alice);
  assert.equal(quote.sourceFingerprint, shot.approvedStoryboardSource.sourceFingerprint);
  assert.equal(calls[0][1].operation, 'image_to_video');
  assert.equal(calls[0][1].plannedDurationSeconds, 4);
  assert.equal(calls[0][1].referenceImageUrl, shot.approvedStoryboardSource.imageUrl);
  const submitted = await service.createVideoAttempt(created.id, 'scene_a', 'shot_a', {
    ...input, estimateId: quote.estimate.estimateId, idempotencyKey: 'cinematic-attempt-one'
  }, alice);
  assert.equal(submitted.task.id, 'videotask_cinematic');
  assert.equal(calls[1][3].generationMode, 'cinematic_video');
  assert.equal(calls[1][3].shotId, 'shot_a');
  const afterSubmit = await service.getProject(created.id, alice);
  const context = await service.approveVideoAttempt(
    created.id, 'scene_a', 'shot_a', submitted.attemptId,
    { expectedVersion: afterSubmit.version }, alice
  );
  assert.equal(context.videoAttempts[0].status, 'approved');
  const stored = await service.getProject(created.id, alice);
  assert.equal(stored.scenes[0].shots[0].approvedVideoAttemptId, submitted.attemptId);
  assert.equal(stored.generationAttempts.find(item => item.id === submitted.attemptId).outputAsset.publicUrl, outputAsset.publicUrl);
});

test('Cinematic video quote rejects stale Storyboard lineage before pricing', async t => {
  let quoteCalls = 0;
  const { directory, service } = await fixture({
    videoGenerationService: {
      getCatalog: () => ({ models: [] }),
      async quote() { quoteCalls += 1; throw new Error('must not price stale source'); }
    }
  });
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const created = await service.createProject(setup, alice);
  const planned = await service.saveStoryPlan(created.id, {
    expectedVersion: created.version,
    scenes: [{ id: 'scene_a', title: 'A', shots: [{ id: 'shot_a', title: 'A', durationMs: 4000, prompt: 'Hold.' }] }]
  }, alice);
  await service.approveStoryboardSource(created.id, 'shot_a', {
    expectedVersion: planned.version, expectedShotVersion: 1,
    jobId: 'job_storyboard_stale', idempotencyKey: 'approve-stale-source'
  }, alice);
  const approved = await service.getProject(created.id, alice);
  const shot = approved.scenes[0].shots[0];
  await assert.rejects(
    service.quoteVideoAttempt(created.id, 'scene_a', 'shot_a', {
      expectedVersion: approved.version,
      expectedShotVersion: shot.version,
      sourceFingerprint: 'fingerprint_old',
      providerId: 'modelark', modelId: 'seedance-test', prompt: 'Hold.',
      aspectRatio: '9:16', resolution: '720p', durationSeconds: 4, audioMode: 'none'
    }, alice),
    error => error.code === 'cinematic_storyboard_source_changed' && error.statusCode === 409
  );
  assert.equal(quoteCalls, 0);
});

test('Shot direction edits stale only that Shot source while reorder preserves identity', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const planned = await service.saveStoryPlan(project.id, {
    expectedVersion: 1,
    scenes: [{ id: 'scene_a', title: 'A', shots: [
      { id: 'shot_a', title: 'A', durationMs: 1000, prompt: 'First direction' },
      { id: 'shot_b', title: 'B', durationMs: 2000, prompt: 'Second direction' }
    ] }]
  }, alice);
  await service.approveStoryboardSource(project.id, 'shot_a', {
    expectedVersion: planned.version, expectedShotVersion: 1,
    jobId: 'job_storyboard_edit', idempotencyKey: 'approve-edit-source'
  }, alice);
  const approved = await service.getProject(project.id, alice);
  const edited = await service.updateShotDirection(project.id, 'scene_a', 'shot_a', {
    expectedVersion: approved.version,
    expectedShotVersion: approved.scenes[0].shots[0].version,
    prompt: 'Revised direction'
  }, alice);
  assert.equal(edited.scenes[0].shots[0].prompt, 'Revised direction');
  assert.equal(edited.scenes[0].shots[0].approvedStoryboardSource, undefined);
  assert.equal(edited.scenes[0].shots[1].prompt, 'Second direction');
  const reordered = await service.reorderSceneShots(project.id, 'scene_a', {
    expectedVersion: edited.version,
    shotIds: ['shot_b', 'shot_a']
  }, alice);
  assert.deepEqual(reordered.scenes[0].shotOrder, ['shot_b', 'shot_a']);
  assert.deepEqual(reordered.scenes[0].shots.map(shot => shot.id), ['shot_b', 'shot_a']);
  assert.equal(reordered.scenes[0].durationMs, 3000);
});

test('Timeline export requires current approved video attempts and returns a gated assembly manifest', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  const planned = await service.saveStoryPlan(project.id, {
    expectedVersion: 1,
    scenes: [{ id: 'scene_a', title: 'A', shots: [{ id: 'shot_a', title: 'A', durationMs: 4000 }] }]
  }, alice);
  await service.approveStoryboardSource(project.id, 'shot_a', {
    expectedVersion: planned.version, expectedShotVersion: 1,
    jobId: 'job_storyboard_a1', idempotencyKey: 'approve-timeline-source'
  }, alice);
  await service.repository.mutateForActor(project.id, alice, draft => {
    const shot = draft.scenes[0].shots[0];
    shot.approvedVideoAttemptId = 'video_a1';
    shot.approvedVideoSourceFingerprint = shot.approvedStoryboardSource.sourceFingerprint;
    draft.generationAttempts.push({
      id: 'video_a1', shotId: 'shot_a', sceneId: 'scene_a',
      operation: 'cinematic_draft_clip', status: 'approved',
      sourceFingerprint: shot.approvedStoryboardSource.sourceFingerprint
    });
    return draft;
  });
  const current = await service.getProject(project.id, alice);
  const saved = await service.saveTimeline(project.id, {
    expectedVersion: current.version,
    entries: [{ shotId: 'shot_a', trimInMs: 250, trimOutMs: 3750, transition: 'cut' }]
  }, alice);
  assert.equal(saved.timelineVersions[0].exportEligible, true);
  assert.equal(saved.timelineVersions[0].durationMs, 3500);
  const manifest = await service.getExportManifest(project.id, alice);
  assert.equal(manifest.assemblyStatus, 'qualification_blocked');
  assert.equal(manifest.entries[0].approvedVideoAttemptId, 'video_a1');
});

test('Admin and Support can search sanitized Cinematic lineage while a user cannot', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await service.createProject(setup, alice);
  assert.throws(
    () => service.listOperationalProjects({ search: project.id }, alice),
    error => error.code === 'admin_access_forbidden'
  );
  const support = { userId: 'usr_support', username: 'support', role: 'support' };
  const page = await service.listOperationalProjects({ search: project.id }, support);
  assert.equal(page.items[0].projectId, project.id);
  const detail = await service.getOperationalProject(project.id, support);
  assert.equal(detail.ownerUserId, alice.userId);
  assert.equal('setup' in detail, false);
});
