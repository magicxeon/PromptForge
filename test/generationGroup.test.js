import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GenerationApplicationService,
  assertSupportedOutputCount
} from '../server/domain/generation/GenerationApplicationService.js';

test('Generation Group reserves once and enqueues one child Job per output', async () => {
  let nextJob = 0;
  let reserveCalls = 0;
  const enqueued = [];
  const groups = new Map();
  const service = new GenerationApplicationService({
    providerRegistry: {
      shouldStream: () => false,
      getConfigVersion: () => 1
    },
    queueManager: {
      createJobId: () => `job_${++nextJob}`,
      enqueue: (...args) => enqueued.push(args)
    },
    templateCoreService: {},
    creditService: {
      reserveGenerationGroup: async ({ children }) => {
        reserveCalls += 1;
        return {
          reservations: children.map((child, index) => ({
            jobId: child.jobId,
            reservationId: `reservation_${index}`,
            amountCredits: 10,
            pricingSnapshot: { estimatedCredits: 10 }
          }))
        };
      },
      refundForJob: async () => {}
    },
    generationGroupRepository: {
      findByRequest: async (actorUserId, requestId) => [...groups.values()].find(group =>
        group.actorUserId === actorUserId && group.requestId === requestId
      ) || null,
      create: async group => {
        groups.set(group.id, group);
        return group;
      },
      update: async (id, patch) => {
        const updated = { ...groups.get(id), ...patch };
        groups.set(id, updated);
        return updated;
      }
    },
    promptRefinementService: { persistAudit: async () => {} }
  });
  const operation = {
    providerId: 'gemini',
    modelId: 'image-model',
    estimateId: 'estimate_1',
    requestId: 'request_1',
    payerUserId: 'usr_1',
    payerUsername: 'owner',
    context: {
      outputCount: 3,
      imageReferences: {},
      aspectRatio: '6:8',
      selections: {}
    },
    compiledPrompt: 'Shared compiled prompt',
    modelConfig: { defaults: {} },
    providerConfig: {},
    generationRequest: { requestId: 'request_1', outputCount: 3 }
  };

  const first = await service.submitPreparedGroup(operation);
  const duplicate = await service.submitPreparedGroup(operation);

  assert.equal(first.requestedOutputCount, 3);
  assert.equal(first.childJobIds.length, 3);
  assert.equal(duplicate.groupId, first.groupId);
  assert.equal(reserveCalls, 1);
  assert.equal(enqueued.length, 3);
  assert.deepEqual(enqueued.map(call => call[2]), [
    'Shared compiled prompt',
    'Shared compiled prompt',
    'Shared compiled prompt'
  ]);
  assert.deepEqual(enqueued.map(call => call[3].outputIndex), [0, 1, 2]);
  assert.ok(enqueued.every(call => call[3].generationGroupId === first.groupId));
});

test('Generation Group status aggregates partial completion and enforces actor ownership', async () => {
  const group = {
    id: 'group_1',
    actorUserId: 'usr_1',
    actorUsername: 'owner',
    requestedOutputCount: 3,
    childJobIds: ['job_1', 'job_2', 'job_3'],
    enqueueFailures: [],
    completedCount: 0,
    failedCount: 0,
    status: 'running',
    estimateId: 'estimate_1',
    createdAt: new Date().toISOString()
  };
  const statuses = new Map([
    ['job_1', { status: 'completed', result: { imageUrl: '/outputs/1.png' } }],
    ['job_2', { status: 'failed', error: { code: 'provider_failed', message: 'Failed.' } }],
    ['job_3', { status: 'completed', result: { imageUrl: '/outputs/3.png' } }]
  ]);
  const service = new GenerationApplicationService({
    providerRegistry: {},
    queueManager: {
      getJobStatusForUser: async jobId => statuses.get(jobId)
    },
    templateCoreService: {},
    generationGroupRepository: {
      findById: async id => id === group.id ? group : null,
      update: async (_id, patch) => Object.assign(group, patch)
    }
  });

  const result = await service.getGroupStatusForActor(group.id, {
    userId: 'usr_1',
    username: 'owner'
  });
  assert.equal(result.status, 'partially_completed');
  assert.equal(result.completedCount, 2);
  assert.equal(result.failedCount, 1);
  assert.equal(await service.getGroupStatusForActor(group.id, {
    userId: 'usr_other',
    username: 'other'
  }), null);
});

test('Generation output count accepts only integers from one through four', () => {
  for (const outputCount of [1, 2, 3, 4]) {
    assert.doesNotThrow(() => assertSupportedOutputCount({ outputCount }));
  }
  for (const outputCount of [0, 1.5, 5]) {
    assert.throws(
      () => assertSupportedOutputCount({ outputCount }),
      error => error.code === 'generation_output_count_invalid'
    );
  }
});
