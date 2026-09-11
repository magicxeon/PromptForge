import assert from 'node:assert/strict';
import test from 'node:test';
import { registerCinematicRoutes } from '../server/app/routes/cinematicRoutes.js';

const project = {
  id: 'cineproj_route', version: 4, aspectRatio: '9:16',
  scenes: [{ id: 'scene_1', shots: [{ id: 'shot_1', version: 2 }] }]
};
const context = {
  projectId: project.id, projectVersion: project.version,
  sceneId: 'scene_1', shotId: 'shot_1', shotVersion: 2,
  references: { outfit_front: null, outfit_back: null, style_reference: null },
  characterProfileContext: null,
  keyframeContract: {
    sourceFingerprint: 'keyframe_route_1',
    providerIndependentPrompt: 'STORYBOARD KEYFRAME CONTRACT cinematic-storyboard-keyframe-v1'
  },
  generationEligible: true,
  blockingReason: null
};

test('Cinematic Storyboard batch accepts the server keyframe fingerprint and preserves metadata', async () => {
  const { handler, generationApplicationService } = routeFixture();
  const response = responseFixture();
  await handler(requestFixture(), response);
  assert.equal(response.statusCode, 202);
  assert.equal(generationApplicationService.calls.length, 1);
  const submission = generationApplicationService.calls[0];
  assert.equal(submission.operations[0].metadata.keyframeContractFingerprint, 'keyframe_route_1');
  assert.deepEqual(submission.metadata.keyframeContractFingerprints, ['keyframe_route_1']);
});

test('Cinematic Storyboard batch preserves a direct Cast sheet without a Character Profile', async () => {
  const sheet = '/outputs/direct-cast-sheet.png';
  const contextValue = structuredClone(context);
  contextValue.references.character_reference = sheet;
  const fixture = routeFixture({ contextValue });
  const request = requestFixture();
  request.body.operations[0].generationRequest.characterReferenceImageA = sheet;
  const response = responseFixture();
  await fixture.handler(request, response);
  assert.equal(response.statusCode, 202);
  const submitted = fixture.generationApplicationService.calls[0].operations[0].body;
  assert.equal(submitted.characterReferenceImageA, sheet);
  assert.equal(submitted.characterProfileContext, null);
  assert.equal(submitted.outfitReferenceImageFront, null);
});

test('Cinematic Storyboard batch rejects missing, replaced or additional Cast sheet references', async () => {
  const sheet = '/outputs/direct-cast-sheet.png';
  const contextValue = structuredClone(context);
  contextValue.references.character_reference = sheet;
  for (const references of [
    {},
    { characterReferenceImageA: '/outputs/other-sheet.png' },
    { characterReferenceImageA: sheet, characterReferenceImageB: '/outputs/extra-sheet.png' }
  ]) {
    const fixture = routeFixture({ contextValue });
    const request = requestFixture();
    Object.assign(request.body.operations[0].generationRequest, references);
    const response = responseFixture();
    await fixture.handler(request, response);
    assert.equal(response.statusCode, 409);
    assert.equal(response.body.error.code, 'cinematic_storyboard_reference_authority_mismatch');
    assert.equal(fixture.generationApplicationService.calls.length, 0);
  }
});

test('Cinematic Storyboard batch binds named Cast order and rejects substituted, missing or extra identity references', async () => {
  const rows = ['a', 'b'].map(id => ({ castAssignmentId: id, displayName: id, sourceType: 'generated_sheet', generationId: `job_${id}`, contentHash: `hash_${id}` }));
  const contextValue = { ...structuredClone(context), cinematicCastReferences: rows, cinematicContainsPeople: true };
  for (const [patch, expected] of [
    [{ cinematicCastReferences: rows.map(row => Object.fromEntries(Object.entries(row).reverse())) }, 202],
    [{ cinematicCastReferences: [] }, 409],
    [{ cinematicCastReferences: [...rows].reverse() }, 409],
    [{ cinematicCastReferences: [rows[0], { ...rows[1], generationId: 'job_other' }] }, 409],
    [{ faceReferenceImageA: '/outputs/unrelated.png' }, 409],
    [{ styleReferenceImageB: '/outputs/unrelated.png' }, 409],
    [{ cinematicContainsPeople: false }, 409]
  ]) {
    const fixture = routeFixture({ contextValue });
    const request = requestFixture();
    Object.assign(request.body.operations[0].generationRequest, { cinematicCastReferences: rows, cinematicContainsPeople: true }, patch);
    const response = responseFixture();
    await fixture.handler(request, response);
    assert.equal(response.statusCode, expected);
    assert.equal(fixture.generationApplicationService.calls.length, expected === 202 ? 1 : 0);
  }
});

test('Cinematic Storyboard accepts a new candidate while an approved source remains authoritative', async () => {
  const approvedProject = structuredClone(project);
  approvedProject.scenes[0].shots[0].approvedStoryboardSource = {
    sourceFingerprint: 'approved_source_1'
  };
  const allowedFixture = routeFixture({ projectValue: approvedProject });
  const allowedResponse = responseFixture();
  await allowedFixture.handler(requestFixture(), allowedResponse);
  assert.equal(allowedResponse.statusCode, 202);
  assert.equal(allowedFixture.generationApplicationService.calls.length, 1);
});

test('Cinematic Storyboard batch rejects a stale keyframe fingerprint before Generation submission', async () => {
  const { handler, generationApplicationService } = routeFixture();
  const response = responseFixture();
  const request = requestFixture();
  request.body.operations[0].keyframeContractFingerprint = 'stale_keyframe';
  await handler(request, response);
  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error.code, 'cinematic_storyboard_contract_changed');
  assert.equal(generationApplicationService.calls.length, 0);
});

test('Cinematic Storyboard batch rejects browser prompt assembly before Generation submission', async () => {
  const { handler, generationApplicationService } = routeFixture();
  const response = responseFixture();
  const request = requestFixture();
  request.body.operations[0].generationRequest.sceneBuilder.manualPromptText = 'browser prompt override';
  await handler(request, response);
  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error.code, 'cinematic_storyboard_prompt_authority_mismatch');
  assert.equal(generationApplicationService.calls.length, 0);
});

test('Cinematic Storyboard batch rejects an unknown capture profile before Generation submission', async () => {
  const { handler, generationApplicationService } = routeFixture();
  const response = responseFixture();
  const request = requestFixture();
  request.body.operations[0].generationRequest.cinematicCaptureProfileId = 'unknown-profile';
  await handler(request, response);
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error.code, 'cinematic_capture_profile_invalid');
  assert.equal(generationApplicationService.calls.length, 0);
});

test('Cinematic Story Plan proposal route preserves unified workflow evidence', async () => {
  const { storyPlanHandler, cinematicService } = routeFixture();
  const response = responseFixture();
  const request = requestFixture();
  request.body = { mode: 'generate', sourceResolution: null };

  await storyPlanHandler(request, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.workflow.contractVersion, 'cinematic-story-plan-workflow-v1');
  assert.equal(response.body.workflow.stages.at(-1).id, 'storyboard_readiness');
  assert.deepEqual(cinematicService.storyPlanCalls[0].input, request.body);
});

test('Cinematic Story Plan proposal route streams real progress and the same final proposal', async () => {
  const { storyPlanHandler, cinematicService } = routeFixture();
  const response = streamResponseFixture();
  const request = requestFixture();
  request.body = { mode: 'generate', sourceResolution: null };
  request.headers = { accept: 'text/event-stream' };
  request.get = name => request.headers[String(name).toLowerCase()] || '';

  await storyPlanHandler(request, response);

  const stream = response.chunks.join('');
  assert.match(stream, /event: progress/);
  assert.match(stream, /"activeStageId":"plan_generation"/);
  assert.match(stream, /event: result/);
  assert.match(stream, /"proposalId":"proposal_route"/);
  assert.equal(response.ended, true);
  assert.equal(cinematicService.storyPlanCalls.length, 1);
});

function routeFixture({ projectValue = project, contextValue = context } = {}) {
  const handlers = new Map();
  const app = {};
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    app[method] = (route, handler) => handlers.set(`${method}:${route}`, handler);
  }
  const cinematicService = {
    storyPlanCalls: [],
    getProject: async () => structuredClone(projectValue),
    getStoryboardGenerationContext: async () => structuredClone(contextValue),
    registerStoryboardBatchAttempts: async () => structuredClone(project),
    async generateStoryPlan(projectId, input, actorContext, operation = {}) {
      this.storyPlanCalls.push({ projectId, input, actorContext });
      operation.onProgress?.({
        contractVersion: 'cinematic-story-plan-live-progress-v1',
        activeStageId: 'plan_generation',
        stages: [
          { id: 'source_preflight', status: 'completed', issueCount: 0, repairCount: 0 },
          { id: 'plan_generation', status: 'processing', issueCount: 0, repairCount: 0 },
          { id: 'director_review', status: 'queued', issueCount: 0, repairCount: 0 },
          { id: 'visual_validation', status: 'queued', issueCount: 0, repairCount: 0 },
          { id: 'visual_repair', status: 'queued', issueCount: 0, repairCount: 0 },
          { id: 'storyboard_readiness', status: 'queued', issueCount: 0, repairCount: 0 }
        ],
        updatedAt: '2026-09-04T00:00:00.000Z'
      });
      return {
        proposalId: 'proposal_route', operation: 'cinematic_story_plan_generate', mode: 'generate',
        status: 'proposal', expectedProjectVersion: project.version,
        storySourceVersionId: 'source_route', plan: null, filmReadiness: null, scriptPreview: [],
        workflow: {
          contractVersion: 'cinematic-story-plan-workflow-v1', status: 'ready',
          stages: [{ id: 'storyboard_readiness', status: 'completed', issueCount: 0, repairCount: 0 }],
          repairRoundCount: 0, initialFindings: [], repairs: [], repairRounds: [], remainingFindings: []
        },
        provenance: null, billingStatus: 'qualification_no_charge'
      };
    }
  };
  const generationApplicationService = {
    calls: [],
    async submitBatch(input) {
      this.calls.push(input);
      await input.beforeEnqueue({
        groupId: 'ggrp_route',
        children: input.operations.map(operation => ({
          jobId: 'job_route', sceneId: operation.sceneId, shotId: operation.shotId,
          expectedShotVersion: operation.expectedShotVersion, estimateId: operation.estimateId,
          metadata: operation.metadata
        }))
      });
      return {
        batchId: 'ggrp_route', groupId: 'ggrp_route', status: 'queued',
        requestedOutputCount: 1, acceptedCount: 1, failedCount: 0, children: []
      };
    }
  };
  registerCinematicRoutes(app, { cinematicService, generationApplicationService });
  return {
    handler: handlers.get('post:/api/cinematic/projects/:projectId/storyboard-generation-batches'),
    storyPlanHandler: handlers.get('post:/api/cinematic/projects/:projectId/story-plan/proposals'),
    cinematicService,
    generationApplicationService
  };
}

function requestFixture() {
  return {
    params: { projectId: project.id },
    actorContext: { userId: 'usr_alice', username: 'alice', role: 'user' },
    userRole: 'user',
    body: {
      expectedVersion: project.version,
      idempotencyKey: 'cinematic-route-batch-1',
      operations: [{
        operationId: 'shot_1', sceneId: 'scene_1', shotId: 'shot_1',
        expectedShotVersion: 2, estimateId: 'estimate_1',
        keyframeContractFingerprint: 'keyframe_route_1',
        generationRequest: {
          provider: 'gemini', submodel: 'image-model', imageResolution: '1K',
          aspectRatio: '9:16', outputCount: 1, generationSurface: 'cinematic',
          generationMode: 'scene', characterProfileContext: null,
          cinematicCaptureProfileId: 'photorealistic-cinematic',
          outfitReferenceImageFront: null, outfitReferenceImageBack: null,
          styleReferenceImageA: null,
          sceneBuilder: {
            authoringMode: 'manual',
            manualPromptText: context.keyframeContract.providerIndependentPrompt
          }
        }
      }]
    }
  };
}

function responseFixture() {
  return {
    statusCode: 200,
    body: null,
    set() { return this; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; }
  };
}

function streamResponseFixture() {
  return {
    statusCode: 200,
    chunks: [],
    ended: false,
    writableEnded: false,
    set() { return this; },
    status(value) { this.statusCode = value; return this; },
    flushHeaders() {},
    flush() {},
    on() { return this; },
    write(value) { this.chunks.push(String(value)); return true; },
    end() { this.ended = true; this.writableEnded = true; }
  };
}
