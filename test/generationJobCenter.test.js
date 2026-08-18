import assert from 'node:assert/strict';
import test from 'node:test';
import { GenerationJobCenterService } from '../server/domain/generation/GenerationJobCenterService.js';
import { registerGenerationJobCenterRoutes } from '../server/app/routes/generationJobCenterRoutes.js';
import { QueueManager } from '../server/domain/generation/QueueManager.js';
import { GenerationApplicationService } from '../server/domain/generation/GenerationApplicationService.js';

test('Generation Job Center merges bounded actor-owned work without duplicate group children', async () => {
  const service = new GenerationJobCenterService({
    queueManager: {
      listActiveJobSnapshotsForUser(username) {
        assert.equal(username, 'user_alice');
        return [
          activeImage('job_group_child', { generationGroupId: 'group_1' }),
          activeImage('job_single')
        ];
      }
    },
    generationGroupRepository: {
      async listForActor(userId) {
        assert.equal(userId, 'usr_alice');
        return [{
          id: 'group_1',
          actorUserId: 'usr_alice',
          status: 'running',
          childJobIds: ['job_group_child'],
          requestedOutputCount: 2,
          completedCount: 1,
          failedCount: 0,
          createdAt: '2026-08-18T10:00:00.000Z',
          updatedAt: '2026-08-18T10:00:02.000Z'
        }];
      }
    },
    historyRepository: {
      async listPage({ username, limit }) {
        assert.equal(username, 'user_alice');
        assert.ok(limit <= 50);
        return {
          items: [{
            id: 'job_done',
            username: 'user_alice',
            imageUrl: '/outputs/job_done.jpg',
            thumbnailUrl: '/outputs/thumbnails/job_done.webp',
            timestamp: Date.parse('2026-08-18T09:00:00.000Z'),
            prompt: 'must not leak',
            references: ['must not leak']
          }]
        };
      }
    },
    videoGenerationService: {
      async listRecent(actor) {
        assert.equal(actor.userId, 'usr_alice');
        return { items: [{
          id: 'video_1',
          status: 'provider_queued',
          createdAt: '2026-08-18T10:00:03.000Z',
          updatedAt: '2026-08-18T10:00:03.000Z',
          providerId: 'modelark',
          modelId: 'seedance-2-5'
        }] };
      }
    }
  });

  const result = await service.list({ userId: 'usr_alice', username: 'user_alice' }, { limit: 10 });
  assert.deepEqual(result.items.map(item => item.id), ['video_1', 'group_1', 'job_single', 'job_done']);
  assert.equal(result.activeCount, 3);
  assert.equal(result.terminalCount, 1);
  assert.equal(JSON.stringify(result).includes('must not leak'), false);
});

test('Generation Job Center supports active and recent scopes', async () => {
  const service = fixtureService();
  const actor = { userId: 'usr_alice', username: 'user_alice' };
  const active = await service.list(actor, { scope: 'active' });
  const recent = await service.list(actor, { scope: 'recent' });
  assert.deepEqual(active.items.map(item => item.id), ['job_active']);
  assert.deepEqual(recent.items.map(item => item.id), ['job_complete']);
});

test('Generation Job Center rejects invalid scope and missing actor', async () => {
  const service = fixtureService();
  await assert.rejects(() => service.list(null), error => error.code === 'actor_required');
  await assert.rejects(
    () => service.list({ userId: 'usr_alice', username: 'user_alice' }, { scope: 'foreign' }),
    error => error.code === 'generation_job_center_scope_invalid'
  );
});

test('Generation Job Center route is private no-store and delegates actor scope', async () => {
  let routeHandler;
  registerGenerationJobCenterRoutes({
    get(path, handler) {
      assert.equal(path, '/api/generation/job-center');
      routeHandler = handler;
    }
  }, {
    generationJobCenterService: {
      async list(actor, options) {
        assert.equal(actor.userId, 'usr_alice');
        assert.deepEqual(options, { scope: 'active', limit: '8' });
        return { items: [], activeCount: 0, terminalCount: 0, polledAt: 'now' };
      }
    }
  });
  const headers = new Map();
  let body;
  await routeHandler({
    actorContext: { userId: 'usr_alice', username: 'user_alice' },
    query: { scope: 'active', limit: '8' }
  }, {
    set(name, value) { headers.set(name, value); },
    json(value) { body = value; return value; },
    status() { throw new Error('Unexpected error response.'); }
  });
  assert.equal(headers.get('Cache-Control'), 'private, no-store');
  assert.equal(body.activeCount, 0);
});

test('Queue active snapshots enforce ownership and exclude private execution inputs', () => {
  const manager = new QueueManager();
  manager.jobs.set('job_alice', {
    id: 'job_alice', status: 'processing', provider: 'gemini', submodel: 'image',
    prompt: 'private prompt', created: Date.now(), timings: {},
    options: { username: 'user_alice', imageReferences: { private: 'base64' } }
  });
  manager.jobs.set('job_bob', {
    id: 'job_bob', status: 'queued', provider: 'gemini', submodel: 'image',
    prompt: 'bob prompt', created: Date.now(), timings: {}, options: { username: 'user_bob' }
  });
  const snapshots = manager.listActiveJobSnapshotsForUser('user_alice');
  assert.deepEqual(snapshots.map(item => item.id), ['job_alice']);
  assert.equal(JSON.stringify(snapshots).includes('private prompt'), false);
  assert.equal(JSON.stringify(snapshots).includes('base64'), false);
});

test('stale durable Image group becomes terminal instead of spinning after restart', async () => {
  let persistedPatch = null;
  const group = {
    id: 'group_orphan', actorUserId: 'usr_alice', actorUsername: 'user_alice',
    status: 'queued', requestedOutputCount: 1, completedCount: 0, failedCount: 0,
    childJobIds: ['job_missing'], children: [{ jobId: 'job_missing', outputIndex: 0, status: 'queued' }],
    createdAt: '2026-08-18T00:00:00.000Z', updatedAt: '2026-08-18T00:00:00.000Z'
  };
  const application = new GenerationApplicationService({
    providerRegistry: {}, templateCoreService: {}, creditService: {},
    queueManager: {
      subscribeLifecycle() {},
      async getJobStatusForUser() { return null; }
    },
    generationGroupRepository: {
      async findById() { return group; },
      async update(id, patch) { persistedPatch = { id, ...patch }; return { ...group, ...patch }; }
    }
  });
  const result = await application.getGroupStatusForActor('group_orphan', {
    userId: 'usr_alice', username: 'user_alice'
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.children[0].error.code, 'generation_job_reconciliation_required');
  assert.equal(persistedPatch.status, 'failed');
});

function fixtureService() {
  return new GenerationJobCenterService({
    queueManager: { listActiveJobSnapshotsForUser: () => [activeImage('job_active')] },
    generationGroupRepository: { listForActor: async () => [] },
    historyRepository: {
      listPage: async () => ({
        items: [{
          id: 'job_complete',
          imageUrl: '/outputs/job_complete.jpg',
          timestamp: Date.parse('2026-08-18T09:00:00.000Z')
        }]
      })
    },
    videoGenerationService: { listRecent: async () => ({ items: [] }) }
  });
}

function activeImage(id, overrides = {}) {
  return {
    id,
    status: 'processing',
    providerId: 'gemini',
    modelId: 'image-model',
    createdAt: '2026-08-18T10:00:01.000Z',
    updatedAt: '2026-08-18T10:00:01.000Z',
    generationSurface: 'playground',
    generationMode: 'playground',
    estimatedCredits: 10,
    ...overrides
  };
}
