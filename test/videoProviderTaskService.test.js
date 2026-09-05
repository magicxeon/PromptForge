import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { VideoProviderTaskRepository } from '../server/repositories/generation/VideoProviderTaskRepository.js';
import { VideoProviderTaskService } from '../server/domain/generation/VideoProviderTaskService.js';
import { VideoProviderAdapterRegistry } from '../server/providers/VideoProviderAdapterRegistry.js';

const actor = { userId: 'usr_alice', username: 'user_alice', role: 'user' };
const request = {
  operation: 'image_to_video', commercialOperation: 'cinematic_motion_preview', inputMode: 'image_to_video',
  projectId: 'cineproj_1', sceneId: 'scene_1', shotId: 'shot_1',
  generationAttemptId: 'attempt_1', providerId: 'gemini', modelId: 'veo-3.1-lite-generate-preview',
  aspectRatio: '9:16', resolution: '720p', durationSeconds: 8, audioMode: 'generated',
  referenceImageCount: 1, referencePlanFingerprint: 'reference_plan_fixture_v1',
  references: [{
    role: 'first_frame', assetId: 'asset_storyboard_1', assetVersionId: 'assetver_storyboard_1',
    sourceFingerprint: 'source_storyboard_1', referenceImageUrl: 'https://private.example/reference.png'
  }],
  pricingFingerprint: 'pricing_fixture_v1', correlationId: 'corr_1',
  providerReferenceRegistrations: [{
    id: 'pareg_storyboard_1', providerId: 'modelark',
    providerAssetId: 'Asset-20260905-approved01', providerAssetGroupId: 'group-20260905-aigc01',
    sourceAssetId: 'asset_storyboard_1', sourceContentHash: 'a'.repeat(64),
    status: 'active', activatedAt: '2026-09-05T00:00:00.000Z',
    signedUrl: 'https://must-not-persist.example/private'
  }],
  characterAttributions: [{
    characterProfileId: 'charprof_1',
    characterProfileVersionId: 'charver_1',
    role: 'Lead',
    privateIdentityPack: 'must-not-persist'
  }],
  idempotencyKey: 'video:test:shot_1'
};

async function fixture(script) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'video-task-service-'));
  const repository = new VideoProviderTaskRepository({ tasksFile: path.join(directory, 'tasks.json') });
  let pollIndex = 0;
  const cleanedOutputs = [];
  const adapter = {
    submit: async () => ({ providerTaskId: 'provider_task_1', providerOperationId: 'provider_operation_1' }),
    poll: async () => script[Math.min(pollIndex++, script.length - 1)],
    cleanupOutput: async output => { cleanedOutputs.push(output); }
  };
  const mediaPersister = {
    persistVideoOutput: async ({ task, output }) => ({ assetId: `asset_${task.id}`, uri: output.temporaryProviderUrl, mimeType: output.mimeType })
  };
  return { directory, repository, service: new VideoProviderTaskService({ repository, adapter, mediaPersister }), cleanedOutputs };
}

test('research video task is idempotent, survives repository restart and completes after durable media', async t => {
  const { directory, repository, service } = await fixture([
    { providerStatus: 'provider_processing' },
    { providerStatus: 'provider_succeeded', output: { temporaryProviderUrl: 'fixture://video.mp4', mimeType: 'video/mp4' }, usage: { billingMetric: 'output_second', outputSeconds: 4 } }
  ]);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const submitted = await service.submitResearchTask(request, actor);
  const replay = await service.submitResearchTask(request, actor);
  assert.equal(replay.id, submitted.id);
  assert.deepEqual(submitted.submittedRequest.characterAttributions, [{
    characterProfileId: 'charprof_1',
    characterProfileVersionId: 'charver_1',
    role: 'Lead'
  }]);
  assert.equal(submitted.commercialOperation, 'cinematic_motion_preview');
  assert.equal(submitted.inputMode, 'image_to_video');
  assert.equal(submitted.submittedRequest.referencePlanFingerprint, 'reference_plan_fixture_v1');
  assert.deepEqual(submitted.submittedRequest.references, [{
    role: 'first_frame',
    assetId: 'asset_storyboard_1',
    assetVersionId: 'assetver_storyboard_1',
    sourceFingerprint: 'source_storyboard_1'
  }]);
  assert.deepEqual(submitted.submittedRequest.providerReferenceRegistrations, [{
    id: 'pareg_storyboard_1', providerId: 'modelark',
    providerAssetId: 'Asset-20260905-approved01', providerAssetGroupId: 'group-20260905-aigc01',
    sourceAssetId: 'asset_storyboard_1', sourceContentHash: 'a'.repeat(64),
    status: 'active', activatedAt: '2026-09-05T00:00:00.000Z'
  }]);
  assert.equal(JSON.stringify(submitted.submittedRequest).includes('private.example'), false);
  assert.equal((await service.pollTask(submitted.id)).status, 'provider_processing');
  const restartedRepository = new VideoProviderTaskRepository({ tasksFile: repository.tasksFile });
  const restarted = new VideoProviderTaskService({
    repository: restartedRepository,
    adapter: service.adapter,
    mediaPersister: service.mediaPersister
  });
  const [completed] = await restarted.resumeRecoverable();
  assert.equal(completed.status, 'completed');
  assert.equal(completed.outputAsset.mimeType, 'video/mp4');
  assert.equal((await restarted.resumeRecoverable()).length, 0);
});

test('successful provider response without usage stops in reconciliation', async t => {
  const { directory, service, cleanedOutputs } = await fixture([
    { providerStatus: 'provider_succeeded', output: { temporaryProviderUrl: 'fixture://video.mp4', mimeType: 'video/mp4' } }
  ]);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const submitted = await service.submitResearchTask({ ...request, idempotencyKey: 'video:test:reconcile' }, actor);
  const terminal = await service.pollTask(submitted.id);
  assert.equal(terminal.status, 'reconciliation_required');
  assert.equal(terminal.outputAsset.mimeType, 'video/mp4');
  assert.equal(cleanedOutputs.length, 1);
});

test('retryable poster failure retains partial Video lineage and repairs the same provider task', async t => {
  const { directory, service } = await fixture([{
    providerStatus: 'provider_succeeded',
    output: { temporaryProviderUrl: 'fixture://video.mp4', mimeType: 'video/mp4' },
    usage: { billingMetric: 'output_second', outputSeconds: 4 }
  }]);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  service.mediaPersister.persistVideoOutput = async () => {
    throw Object.assign(new Error('poster failed'), {
      code: 'video_poster_extraction_failed',
      category: 'media',
      retryable: true,
      outputAsset: { assetId: 'asset_partial', publicUrl: '/outputs/partial.mp4', posterUrl: null }
    });
  };
  const submitted = await service.submitResearchTask({ ...request, idempotencyKey: 'video:test:partial-poster' }, actor);
  const pendingRepair = await service.pollTask(submitted.id);
  assert.equal(pendingRepair.status, 'media_retry_pending');
  assert.equal(pendingRepair.providerError.code, 'video_poster_extraction_failed');
  assert.equal(pendingRepair.outputAsset.assetId, 'asset_partial');
  assert.equal(pendingRepair.providerUsage.outputSeconds, 4);
  let repairedTasks = 0;
  service.mediaPersister.persistVideoOutput = async ({ task: recoveredTask }) => {
    repairedTasks += 1;
    return {
      assetId: 'asset_partial', publicUrl: '/outputs/partial.mp4', posterUrl: '/outputs/partial.poster.webp',
      technicalProbe: { status: 'passed', durationSeconds: 4, width: 720, height: 1280, fps: 24 },
      sourceJobId: recoveredTask.id
    };
  };
  const [repaired] = await service.resumeRecoverable();
  assert.equal(repaired.status, 'completed');
  assert.equal(repaired.outputAsset.assetId, 'asset_partial');
  assert.equal(repairedTasks, 1);
});

test('operational Video task listing supports search and cursor pagination without requiring Cinematic IDs', async t => {
  const { directory, repository } = await fixture([]);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await repository.createAccepted({
    ...request, id: 'videotask_playground_1', ownerUserId: actor.userId,
    ownerUsername: actor.username, projectId: null, sceneId: null, shotId: null,
    providerId: 'modelark', modelId: 'seedance-1-0-pro-fast-251015',
    idempotencyKey: 'video:test:operational:1'
  });
  await repository.createAccepted({
    ...request, id: 'videotask_playground_2', ownerUserId: actor.userId,
    ownerUsername: actor.username, projectId: null, sceneId: null, shotId: null,
    providerId: 'gemini', modelId: 'veo-3.1-lite-generate-preview',
    idempotencyKey: 'video:test:operational:2'
  });

  const first = await repository.listOperationalPage({ limit: 1, search: 'playground' });
  assert.equal(first.items.length, 1);
  assert.equal(first.hasMore, true);
  assert.ok(first.nextCursor);
  const second = await repository.listOperationalPage({ limit: 1, search: 'playground', cursor: first.nextCursor });
  assert.equal(second.items.length, 1);
  assert.notEqual(second.items[0].id, first.items[0].id);
  const modelark = await repository.listOperationalPage({ search: 'seedance' });
  assert.deepEqual(modelark.items.map(item => item.id), ['videotask_playground_1']);
});

test('unknown provider status stops polling in reconciliation', async t => {
  const { directory, service } = await fixture([{ providerStatus: null }]);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const submitted = await service.submitResearchTask({ ...request, idempotencyKey: 'video:test:unknown-status' }, actor);
  const terminal = await service.pollTask(submitted.id);
  assert.equal(terminal.status, 'reconciliation_required');
  assert.equal(terminal.providerError.code, 'video_provider_status_unknown');
  assert.equal(terminal.providerError.providerBillableState, 'unknown');
});

test('startup recovery never resubmits an ambiguous task without a provider task ID', async t => {
  const { directory, repository, service } = await fixture([]);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await repository.createAccepted({
    ...request,
    id: 'videotask_ambiguous',
    ownerUserId: actor.userId,
    ownerUsername: actor.username,
    providerTaskId: null,
    status: 'provider_submitting',
    idempotencyKey: 'video:test:ambiguous'
  });
  let submissions = 0;
  service.adapter.submit = async () => { submissions += 1; return { providerTaskId: 'must_not_exist' }; };
  const [recovered] = await service.resumeRecoverable();
  assert.equal(recovered.status, 'reconciliation_required');
  assert.equal(recovered.providerError.code, 'video_provider_submission_state_unknown');
  assert.equal(submissions, 0);
});

test('retryable provider poll failure remains recoverable', async t => {
  const { directory, service } = await fixture([]);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const submitted = await service.submitResearchTask({ ...request, idempotencyKey: 'video:test:retryable-poll' }, actor);
  service.adapter.poll = async () => {
    throw Object.assign(new Error('provider timeout'), {
      code: 'video_provider_timeout', category: 'provider', retryable: true,
      providerBillableState: 'unknown'
    });
  };
  const recovered = await service.pollTask(submitted.id);
  assert.equal(recovered.status, 'provider_queued');
  assert.equal(recovered.providerError.code, 'video_provider_timeout');
  assert.equal(recovered.pollCount, 1);
});

test('ambiguous provider submit failure enters reconciliation instead of a retryable resubmit state', async t => {
  const { directory, service } = await fixture([]);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  service.adapter.submit = async () => {
    throw Object.assign(new Error('upstream unavailable'), {
      code: 'video_provider_unreachable', category: 'provider', retryable: true,
      providerBillableState: 'unknown'
    });
  };
  const submitted = await service.submitResearchTask({
    ...request, idempotencyKey: 'video:test:ambiguous-submit'
  }, actor);
  assert.equal(submitted.status, 'reconciliation_required');
  assert.equal(submitted.providerTaskId, null);
  assert.equal(submitted.providerError.providerBillableState, 'unknown');
  assert.equal((await service.resumeRecoverable()).length, 0);
});

test('paid routing remains unavailable through the research task service contract', async t => {
  const { directory, service } = await fixture([{ providerStatus: 'provider_processing' }]);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await assert.rejects(
    service.submitResearchTask({ ...request, modelId: 'unknown-paid-model', idempotencyKey: 'video:test:unknown' }, actor),
    error => error.code === 'video_model_unknown'
  );
});

test('rejected URL submission keeps safe support IDs and never resubmits or stores the signed URL', async t => {
  const { directory, service } = await fixture([]);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  let submits = 0;
  service.adapter.submit = async () => {
    submits += 1;
    throw Object.assign(new Error('private URL must not persist'), {
      code: 'video_provider_input_image_rejected', category: 'provider', retryable: false,
      providerCode: 'InputImageSensitiveContentDetected.PrivacyInformation',
      providerRequestId: 'provider-request-123', providerBillableState: 'not_billable'
    });
  };
  const input = { ...request, referenceImage: 'https://storage.example/image?signature=SECRET',
    referenceTransport: { mode: 'gcs_url', fallbackCode: null, secret: 'SECRET' },
    idempotencyKey: 'video:test:gcs-rejection' };
  const result = await service.submitResearchTask(input, actor);
  await service.submitResearchTask(input, actor);
  assert.equal(submits, 1);
  assert.equal(result.status, 'failed');
  assert.equal(result.providerError.providerRequestId, 'provider-request-123');
  assert.equal(result.providerError.providerCode, 'InputImageSensitiveContentDetected.PrivacyInformation');
  assert.deepEqual(result.submittedRequest.referenceTransport, { mode: 'gcs_url', fallbackCode: null });
  assert.doesNotMatch(JSON.stringify(result), /SECRET|private URL must not persist/);
});

test('persisted tasks resolve their own provider adapter for submission and polling', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'video-provider-registry-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const repository = new VideoProviderTaskRepository({ tasksFile: path.join(directory, 'tasks.json') });
  const calls = [];
  const adapters = new VideoProviderAdapterRegistry({
    adapters: {
      gemini: scriptedAdapter('gemini', calls),
      modelark: scriptedAdapter('modelark', calls)
    },
    modelAdapters: {
      'gemini/gemini-omni-flash-preview': scriptedAdapter('gemini-omni', calls)
    }
  });
  const capabilityRegistry = {
    validateRequest(input) { return { providerId: input.providerId, modelId: input.modelId }; }
  };
  const service = new VideoProviderTaskService({ repository, capabilityRegistry, adapterRegistry: adapters });
  const gemini = await service.submitResearchTask({ ...request, id: 'videotask_gemini', idempotencyKey: 'video:registry:gemini' }, actor);
  const modelark = await service.submitResearchTask({
    ...request,
    id: 'videotask_modelark',
    providerId: 'modelark',
    modelId: 'dreamina-seedance-2-5-260628',
    idempotencyKey: 'video:registry:modelark'
  }, actor);
  const omni = await service.submitResearchTask({
    ...request,
    id: 'videotask_omni',
    modelId: 'gemini-omni-flash-preview',
    idempotencyKey: 'video:registry:omni'
  }, actor);
  await service.pollTask(gemini.id);
  await service.pollTask(modelark.id);
  await service.pollTask(omni.id);
  assert.deepEqual(calls, [
    'gemini:submit',
    'modelark:submit',
    'gemini-omni:submit',
    'gemini:poll',
    'modelark:poll',
    'gemini-omni:poll'
  ]);
});

function scriptedAdapter(name, calls) {
  return {
    async submit() {
      calls.push(`${name}:submit`);
      return { providerTaskId: `${name}_task` };
    },
    async poll() {
      calls.push(`${name}:poll`);
      return { providerStatus: 'provider_processing' };
    }
  };
}
