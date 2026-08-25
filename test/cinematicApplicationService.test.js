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
    storyImportance: 'protagonist'
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
    scenes: [{ id: 'scene_a', title: 'A', shots: [{ id: 'shot_a', title: 'A', durationMs: 1000 }] }]
  }, alice);
  const context = await service.getProduceShotContext(planned.id, 'scene_a', 'shot_a', alice);
  assert.equal(context.generationEligible, false);
  assert.equal(context.blockingReason, 'cinematic_storyboard_source_required');
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
