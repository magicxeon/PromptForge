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

function routeFixture() {
  const handlers = new Map();
  const app = {};
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    app[method] = (route, handler) => handlers.set(`${method}:${route}`, handler);
  }
  const cinematicService = {
    storyPlanCalls: [],
    getProject: async () => structuredClone(project),
    getStoryboardGenerationContext: async () => structuredClone(context),
    registerStoryboardBatchAttempts: async () => structuredClone(project),
    async generateStoryPlan(projectId, input, actorContext) {
      this.storyPlanCalls.push({ projectId, input, actorContext });
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
