import assert from 'node:assert/strict';
import test from 'node:test';
import { registerVideoGenerationRoutes } from '../server/app/routes/videoGenerationRoutes.js';

function harness() {
  const handlers = new Map();
  return {
    app: {
      get(route, handler) {
        handlers.set(`GET ${route}`, handler);
      },
      post(route, handler) {
        handlers.set(`POST ${route}`, handler);
      }
    },
    handler(route, method = 'GET') {
      const key = `${method} ${route}`;
      const handler = handlers.get(key);
      assert.equal(typeof handler, 'function', `Missing route ${key}`);
      return handler;
    }
  };
}

function response() {
  return {
    statusCode: 200,
    payload: null,
    headers: {},
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

test('video capability route exposes only the paid catalog and exact comparison bounds', async () => {
  const routes = harness();
  registerVideoGenerationRoutes(routes.app, {
    videoGenerationService: {
      getCatalog() {
        return { schemaVersion: 1, catalogVersion: 'test', models: [] };
      }
    },
    communityFeaturePolicyService: {
      async assertEnabled() {},
      async isEnabled(key) {
        return key === 'cinematic.videoComparisonEnabled';
      }
    }
  });
  const res = response();
  await routes.handler('/api/generation/video/capabilities')({}, res);
  assert.equal(res.payload.launchStatus, 'qualification_blocked');
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
  assert.deepEqual(res.payload.comparison, {
    enabled: true,
    minimumSlots: 2,
    maximumSlots: 2
  });
});

test('trusted source route uses the authenticated actor and forwards only bounded filters', async () => {
  const routes = harness();
  registerVideoGenerationRoutes(routes.app, {
    videoGenerationService: {
      async listTrustedSources(actor, options) {
        assert.equal(actor.userId, 'usr_alice');
        assert.deepEqual(options, { cursor: 'next-page', eligibleOnly: true });
        return { items: [], hasMore: false };
      }
    },
    communityFeaturePolicyService: {
      async assertEnabled(key) { assert.equal(key, 'cinematic.playgroundVideoEnabled'); }
    }
  });
  const res = response();
  await routes.handler('/api/generation/video/trusted-sources')({
    actorContext: { userId: 'usr_alice' },
    query: { cursor: 'next-page', eligibleOnly: 'true', userId: 'usr_bob', limit: 999 }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
  assert.deepEqual(res.payload, { items: [], hasMore: false });
});

test('video task reads are actor-scoped and private no-store', async () => {
  const routes = harness();
  registerVideoGenerationRoutes(routes.app, {
    videoGenerationService: {
      getCatalog: () => ({ models: [] }),
      async getAndPoll(taskId, actor) {
        if (taskId === 'task_1' && actor.userId === 'usr_alice') {
          return { id: taskId, status: 'completed' };
        }
        throw Object.assign(new Error('Video task not found.'), {
          code: 'video_task_not_found',
          statusCode: 404
        });
      }
    },
    communityFeaturePolicyService: {
      async assertEnabled() {},
      async isEnabled() { return false; }
    }
  });
  const res = response();
  await routes.handler('/api/generation/video/tasks/:taskId')({
    params: { taskId: 'task_1' },
    actorContext: { userId: 'usr_alice' }
  }, res);
  assert.equal(res.payload.status, 'completed');
  assert.equal(res.headers['Cache-Control'], 'private, no-store');

  const denied = response();
  await routes.handler('/api/generation/video/tasks/:taskId')({
    params: { taskId: 'task_1' },
    actorContext: { userId: 'usr_bob' }
  }, denied);
  assert.equal(denied.statusCode, 404);
  assert.equal(denied.payload.error.code, 'video_task_not_found');
});

test('recent video tasks use the actor-scoped application contract', async () => {
  const routes = harness();
  let receivedActor = null;
  registerVideoGenerationRoutes(routes.app, {
    videoGenerationService: {
      getCatalog: () => ({ models: [] }),
      async listRecent(actor, options) {
        receivedActor = actor;
        assert.equal(options.limit, '4');
        return { items: [{ id: 'videotask_recent', status: 'completed' }], hasMore: false };
      }
    },
    communityFeaturePolicyService: {
      async assertEnabled() {},
      async isEnabled() { return false; }
    }
  });
  const res = response();
  await routes.handler('/api/generation/video/tasks')({
    query: { limit: '4' },
    actorContext: { userId: 'usr_alice' }
  }, res);
  assert.equal(receivedActor.userId, 'usr_alice');
  assert.equal(res.payload.items[0].id, 'videotask_recent');
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
});

test('an immediate provider rejection returns the durable terminal task instead of Bad Gateway', async () => {
  const routes = harness();
  registerVideoGenerationRoutes(routes.app, {
    videoGenerationService: {
      getCatalog: () => ({ models: [] }),
      async submit() {
        return {
          id: 'videotask_failed',
          status: 'failed',
          billingStatus: 'refunded',
          providerError: {
            code: 'ModelNotOpen',
            category: 'provider',
            retryable: false,
            providerBillableState: 'not_billable'
          }
        };
      }
    },
    communityFeaturePolicyService: {
      async assertEnabled() {},
      async isEnabled() { return false; }
    }
  });

  const res = response();
  await routes.handler('/api/generation/video/tasks', 'POST')({
    body: { modelId: 'seedance-1-0-pro-fast-251015' },
    actorContext: { userId: 'usr_alice' }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.status, 'failed');
  assert.equal(res.payload.providerError.code, 'ModelNotOpen');
  assert.equal(res.payload.billingStatus, 'refunded');
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
});
