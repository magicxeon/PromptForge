import assert from 'node:assert/strict';
import test from 'node:test';
import { registerCommunityEngagementRoutes } from '../server/app/routes/communityEngagementRoutes.js';

test('Community-12 routes gate mutations before engagement state changes', async () => {
  const routes = createRouteHarness();
  let mutationCalls = 0;
  registerCommunityEngagementRoutes(routes.app, {
    engagementService: {
      async setReaction() {
        mutationCalls += 1;
        return {};
      }
    },
    rankingService: {},
    moderationService: {},
    communityFeaturePolicyService: {
      async assertEnabled() {
        const error = new Error('This Community feature is not available.');
        error.code = 'community_feature_disabled';
        error.statusCode = 404;
        throw error;
      }
    }
  });

  const response = createResponse();
  await routes.get('PUT', '/api/community/posts/:postId/reactions/like')({
    params: { postId: 'post_1' },
    actorContext: { userId: 'usr_bob' },
    body: {}
  }, response);

  assert.equal(response.statusCode, 404);
  assert.equal(response.payload.error.code, 'community_feature_disabled');
  assert.equal(mutationCalls, 0);
});

test('Community-12 reaction routes pass canonical actor context to the service', async () => {
  const routes = createRouteHarness();
  const actor = { userId: 'usr_bob', username: 'user_bob', role: 'user' };
  let received = null;
  registerCommunityEngagementRoutes(routes.app, {
    engagementService: {
      async setReaction(...args) {
        received = args;
        return { active: true };
      }
    },
    rankingService: {},
    moderationService: {},
    communityFeaturePolicyService: {
      async assertEnabled() {
        return true;
      }
    }
  });

  const response = createResponse();
  await routes.get('PUT', '/api/community/posts/:postId/reactions/save')({
    params: { postId: 'post_1' },
    actorContext: actor,
    requestId: 'req_1',
    body: {}
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.active, true);
  assert.equal(received[0], 'post_1');
  assert.equal(received[1], 'save');
  assert.equal(received[2], true);
  assert.equal(received[3], actor);
});

function createRouteHarness() {
  const handlers = new Map();
  const register = method => (route, handler) => handlers.set(`${method} ${route}`, handler);
  return {
    app: {
      get: register('GET'),
      post: register('POST'),
      put: register('PUT'),
      delete: register('DELETE')
    },
    get(method, route) {
      const handler = handlers.get(`${method} ${route}`);
      assert.equal(typeof handler, 'function', `Missing route ${method} ${route}`);
      return handler;
    }
  };
}

function createResponse() {
  return {
    statusCode: 200,
    payload: null,
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
