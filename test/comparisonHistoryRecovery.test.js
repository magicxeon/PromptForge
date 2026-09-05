import test from 'node:test';
import assert from 'node:assert/strict';
import { ComparisonOrchestrator } from '../server/domain/comparisons/ComparisonOrchestrator.js';

test('comparison reconciliation restores a missing job binding from history metadata', async () => {
  const persistedRun = {
    id: 'run_1',
    payerUserId: 'usr_demo',
    status: 'queued',
    actualTotalCredit: 0,
    slots: [{
      id: 'slot_1',
      jobId: null,
      reservationId: 'reservation_1',
      status: 'queued',
      actualCredit: 0,
      result: null,
      error: null
    }]
  };
  const repository = {
    init: async () => {},
    readHistory: async () => [{
      id: 'job_1',
      comparisonSetId: 'set_1',
      comparisonRunId: 'run_1',
      comparisonSlotId: 'slot_1',
      imageUrl: '/outputs/job_1.png',
      thumbnailUrl: '/outputs/thumbnails/job_1.webp',
      mimeType: 'image/png',
      generationDuration: '4.2',
      width: 1024,
      height: 1536
    }],
    updateRun: async (_setId, _runId, updater) => {
      await updater(persistedRun);
      return structuredClone(persistedRun);
    }
  };
  const orchestrator = new ComparisonOrchestrator({
    providerRegistry: {},
    queueManager: {
      subscribeLifecycle: () => () => {},
      getJobStatus: () => null
    },
    creditManager: {
      getNetJobCosts: async () => new Map()
    },
    creditReservation: {
      refundForJob: async () => {}
    },
    repository
  });

  await orchestrator.reconcileRun('set_1', structuredClone(persistedRun));

  assert.equal(persistedRun.slots[0].jobId, 'job_1');
  assert.equal(persistedRun.slots[0].status, 'completed');
  assert.equal(persistedRun.slots[0].result.imageUrl, '/outputs/job_1.png');
  assert.equal(persistedRun.slots[0].result.mimeType, 'image/png');
  assert.equal(persistedRun.slots[0].result.generationDuration, '4.2');
  assert.equal(persistedRun.slots[0].result.width, 1024);
  assert.equal(persistedRun.slots[0].result.height, 1536);
  assert.equal(persistedRun.slots[0].thumbnailUrl, '/outputs/thumbnails/job_1.webp');
  assert.equal(persistedRun.status, 'completed');
});
