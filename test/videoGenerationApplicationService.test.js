import assert from 'node:assert/strict';
import test from 'node:test';
import { VideoGenerationApplicationService } from '../server/domain/generation/VideoGenerationApplicationService.js';

const actor = { userId: 'usr_video', username: 'video_user', role: 'user' };
const input = {
  providerId: 'gemini', modelId: 'veo-3.1-lite-generate-preview', operation: 'text_to_video',
  prompt: 'A clean fashion walk with a slow camera push.', aspectRatio: '9:16',
  resolution: '720p', durationSeconds: 4, audioMode: 'generated'
};

test('video quote delegates locked provider pricing to Credits with matching inputs', async () => {
  let quoted = null;
  const service = createService({
    creditService: {
      async estimateVideo(value) { quoted = value; return { estimateId: 'vest_1', estimatedCredits: 80 }; },
      async getAccount() { return { availableCredits: 100, reservedCredits: 0 }; }
    }
  });
  const result = await service.quote(input, actor);
  assert.equal(quoted.userId, actor.userId);
  assert.equal(quoted.request.durationSeconds, 4);
  assert.equal(quoted.request.operation, 'text_to_video');
  assert.equal(result.account.canAfford, true);
});

test('video quote rejects an empty prompt before pricing', async () => {
  const service = createService();
  await assert.rejects(
    service.quote({ ...input, prompt: '   ' }, actor),
    error => error.code === 'video_prompt_required'
  );
});

test('production catalog does not request internal testing models', () => {
  let catalogOptions = null;
  const service = new VideoGenerationApplicationService({
    capabilityRegistry: {
      getPublicCatalog(options) { catalogOptions = options; return { models: [] }; }
    },
    creditService: {},
    characterService: {},
    taskRepository: repositoryStub(new Map()),
    providerTaskService: {},
    testingEnabled: false
  });
  service.getCatalog();
  assert.deepEqual(catalogOptions, { includeTesting: false });
});

test('video submit reserves the exact quote before provider dispatch', async () => {
  const calls = [];
  const tasks = new Map();
  const repository = repositoryStub(tasks);
  const service = createService({
    taskRepository: repository,
    creditService: {
      async validateAndReserveForRequest(value) {
        calls.push(['reserve', value]);
        return {
          estimate: { estimateId: 'vest_1', estimatedCredits: 80 },
          reservation: { reservationId: 'rsv_1' }
        };
      },
      async refundForJob() { throw new Error('refund should not run'); }
    },
    providerTaskService: {
      async submitTask(request) {
        calls.push(['dispatch', request]);
        const task = { id: request.id, status: 'provider_queued', reservationId: request.reservationId };
        tasks.set(task.id, task);
        return task;
      }
    }
  });
  const task = await service.submit({ ...input, estimateId: 'vest_1', idempotencyKey: 'video-test-key-1' }, actor);
  assert.equal(calls[0][0], 'reserve');
  assert.equal(calls[1][0], 'dispatch');
  assert.equal(calls[0][1].generationRequest.operation, 'text_to_video');
  assert.equal(calls[0][1].generationRequest.durationSeconds, 4);
  assert.equal(task.billingStatus, 'reserved');
});

test('completed durable video captures its reservation once', async () => {
  const tasks = new Map([['videotask_done', {
    id: 'videotask_done', ownerUserId: actor.userId, status: 'provider_processing',
    reservationId: 'rsv_done', billingStatus: 'reserved'
  }]]);
  let captures = 0;
  const repository = repositoryStub(tasks);
  const service = createService({
    taskRepository: repository,
    creditService: { async captureForJob() { captures += 1; } },
    providerTaskService: {
      async pollTask() {
        const task = { ...tasks.get('videotask_done'), status: 'completed', outputAsset: { publicUrl: '/outputs/video.mp4' }, providerUsage: { outputSeconds: 4 } };
        tasks.set(task.id, task);
        return task;
      }
    }
  });
  const completed = await service.getAndPoll('videotask_done', actor);
  assert.equal(completed.billingStatus, 'captured');
  assert.equal(captures, 1);
  await service.getAndPoll('videotask_done', actor);
  assert.equal(captures, 1);
});

test('recent video tasks are actor-scoped and projected without private request data', async () => {
  const service = createService({
    taskRepository: {
      async listForActor(context, options) {
        assert.equal(context.userId, actor.userId);
        assert.equal(options.limit, 4);
        return [{
          id: 'videotask_recent', status: 'completed', ownerUserId: actor.userId,
          prompt: 'private prompt', createdAt: '2026-08-18T00:00:00.000Z',
          submittedRequest: { operation: 'text_to_video', durationSeconds: 4 },
          outputAsset: { publicUrl: '/outputs/video.mp4' }
        }];
      }
    }
  });
  const result = await service.listRecent(actor, { limit: 4 });
  assert.equal(result.items[0].id, 'videotask_recent');
  assert.equal(result.items[0].durationSeconds, 4);
  assert.equal('prompt' in result.items[0], false);
  assert.equal('ownerUserId' in result.items[0], false);
});

function createService(overrides = {}) {
  const model = { providerId: input.providerId, modelId: input.modelId, testingRoutingEnabled: true };
  return new VideoGenerationApplicationService({
    capabilityRegistry: {
      getPublicCatalog: () => ({ schemaVersion: 1, catalogVersion: 'test', models: [model] }),
      validateRequest: () => model
    },
    creditService: overrides.creditService || {},
    characterService: overrides.characterService || {},
    taskRepository: overrides.taskRepository || repositoryStub(new Map()),
    providerTaskService: overrides.providerTaskService || {},
    testingEnabled: true
  });
}

function repositoryStub(tasks) {
  return {
    async findByIdempotencyKey() { return null; },
    async findForActor(id, context) {
      const task = tasks.get(id);
      return task?.ownerUserId === context.userId ? { ...task } : null;
    },
    async update(id, operation) {
      const draft = { ...(tasks.get(id) || { id, ownerUserId: actor.userId }) };
      const result = await operation(draft);
      tasks.set(id, draft);
      return result === undefined ? { ...draft } : result;
    }
  };
}
