import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { VideoProviderTaskRepository } from '../server/repositories/generation/VideoProviderTaskRepository.js';
import { VideoProviderTaskService } from '../server/domain/generation/VideoProviderTaskService.js';

const actor = { userId: 'usr_alice', username: 'user_alice', role: 'user' };
const request = {
  operation: 'cinematic_motion_preview', projectId: 'cineproj_1', sceneId: 'scene_1', shotId: 'shot_1',
  generationAttemptId: 'attempt_1', providerId: 'gemini', modelId: 'veo-3.1-lite-generate-preview',
  aspectRatio: '9:16', resolution: '720p', durationSeconds: 4, audioMode: 'generated',
  referenceImageCount: 0, pricingFingerprint: 'pricing_fixture_v1', correlationId: 'corr_1',
  idempotencyKey: 'video:test:shot_1'
};

async function fixture(script) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'video-task-service-'));
  const repository = new VideoProviderTaskRepository({ tasksFile: path.join(directory, 'tasks.json') });
  let pollIndex = 0;
  const adapter = {
    submit: async () => ({ providerTaskId: 'provider_task_1', providerOperationId: 'provider_operation_1' }),
    poll: async () => script[Math.min(pollIndex++, script.length - 1)]
  };
  const mediaPersister = {
    persistVideoOutput: async ({ task, output }) => ({ assetId: `asset_${task.id}`, uri: output.temporaryProviderUrl, mimeType: output.mimeType })
  };
  return { directory, repository, service: new VideoProviderTaskService({ repository, adapter, mediaPersister }) };
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
  const { directory, service } = await fixture([
    { providerStatus: 'provider_succeeded', output: { temporaryProviderUrl: 'fixture://video.mp4', mimeType: 'video/mp4' } }
  ]);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const submitted = await service.submitResearchTask({ ...request, idempotencyKey: 'video:test:reconcile' }, actor);
  const terminal = await service.pollTask(submitted.id);
  assert.equal(terminal.status, 'reconciliation_required');
  assert.equal(terminal.outputAsset.mimeType, 'video/mp4');
});

test('paid routing remains unavailable through the research task service contract', async t => {
  const { directory, service } = await fixture([{ providerStatus: 'provider_processing' }]);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await assert.rejects(
    service.submitResearchTask({ ...request, modelId: 'unknown-paid-model', idempotencyKey: 'video:test:unknown' }, actor),
    error => error.code === 'video_model_unknown'
  );
});
