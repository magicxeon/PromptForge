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

test('heterogeneous Generation batch records child Jobs before canonical submission', async () => {
  let nextJob = 0;
  const groups = new Map();
  const submissions = [];
  const registrations = [];
  const repository = {
    findByRequest: async (actorUserId, requestId) => [...groups.values()].find(group =>
      group.actorUserId === actorUserId && group.requestId === requestId
    ) || null,
    findById: async id => groups.get(id) || null,
    create: async group => {
      groups.set(group.id, structuredClone(group));
      return group;
    },
    update: async (id, patch) => {
      const updated = { ...groups.get(id), ...structuredClone(patch) };
      groups.set(id, updated);
      return updated;
    },
    recordChildStatus: async (id, childStatus) => {
      const group = groups.get(id);
      group.children = group.children.map(child =>
        child.jobId === childStatus.jobId ? { ...child, ...childStatus } : child
      );
      groups.set(id, group);
      return group;
    }
  };
  const service = new GenerationApplicationService({
    providerRegistry: {},
    queueManager: { createJobId: () => `job_batch_${++nextJob}` },
    templateCoreService: {},
    generationGroupRepository: repository
  });
  service.submit = async input => {
    const persisted = [...groups.values()][0];
    assert.ok(persisted, 'batch must be persisted before child submission');
    assert.ok(persisted.childJobIds.includes(input.internalJobId));
    assert.ok(registrations.length > 0, 'batch bindings must be registered before child submission');
    submissions.push(input);
    return { jobId: input.internalJobId, status: 'queued' };
  };
  const input = {
    operations: [
      {
        operationId: 'shot_1', sceneId: 'scene_1', shotId: 'shot_1', expectedShotVersion: 3,
        estimateId: 'est_1', body: { prompt: 'one' }, metadata: { keyframeContractFingerprint: 'keyframe_1' }
      },
      { operationId: 'shot_2', sceneId: 'scene_1', shotId: 'shot_2', expectedShotVersion: 4, estimateId: 'est_2', body: { prompt: 'two' } }
    ],
    actorContext: { userId: 'usr_1', username: 'owner' },
    userRole: 'user',
    requestId: 'batch_request_1',
    generationSurface: 'cinematic',
    generationMode: 'scene',
    metadata: { projectId: 'cineproj_1' },
    beforeEnqueue: async binding => registrations.push(binding)
  };

  const first = await service.submitBatch(input);
  const replay = await service.submitBatch(input);

  assert.equal(first.batchId, replay.batchId);
  assert.equal(first.requestedOutputCount, 2);
  assert.equal(submissions.length, 2);
  assert.equal(registrations.length, 2, 'idempotent replay revalidates the persisted bindings');
  assert.deepEqual(registrations[0].children.map(child => child.expectedShotVersion), [3, 4]);
  assert.equal(registrations[0].children[0].metadata.keyframeContractFingerprint, 'keyframe_1');
  assert.deepEqual(submissions.map(item => item.internalJobId), ['job_batch_1', 'job_batch_2']);
  assert.deepEqual(submissions.map(item => item.internalGroupContext.outputIndex), [0, 1]);
  assert.deepEqual(submissions.map(item => item.body.estimateId), ['est_1', 'est_2']);
  assert.equal(submissions[0].internalReservationMetadata.keyframeContractFingerprint, 'keyframe_1');
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
