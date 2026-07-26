import assert from 'node:assert/strict';
import test from 'node:test';
import { registerCommunityShareRoutes } from '../server/app/routes/communityShareRoutes.js';
import { registerSceneTemplateRoutes } from '../server/app/routes/sceneTemplateRoutes.js';
import { CommunityFeaturePolicyService } from '../server/domain/community/CommunityFeaturePolicyService.js';

const disabledFlags = {
  schemaVersion: 1,
  community: {
    enabled: false,
    shareEnabled: false,
    exploreEnabled: false,
    engagementEnabled: false,
    creatorProfilesEnabled: false,
    galleryEnabled: false,
    moderationEnabled: false,
    privateBeta: false
  },
  development: { mockActorSwitcherEnabled: false },
  routing: { automaticSimpleModeEnabled: false }
};

test('disabled Community write routes reject with stable code before service mutation', async () => {
  const routes = createRouteHarness();
  const policy = new CommunityFeaturePolicyService({
    configLoader: async () => structuredClone(disabledFlags)
  });
  let mutationCalls = 0;
  const shareService = {
    async createGeneratedShareDraft() {
      mutationCalls += 1;
      return {};
    }
  };

  registerCommunityShareRoutes(routes.app, {
    communityShareService: shareService,
    communityFeaturePolicyService: policy
  });
  const response = createResponse();
  await routes.get('POST', '/api/community/share-drafts')({
    body: { sourceGenerationId: 'job_1' },
    actorContext: { userId: 'usr_demo' }
  }, response);

  assert.equal(response.statusCode, 404);
  assert.equal(response.payload.error.code, 'community_feature_disabled');
  assert.equal(mutationCalls, 0);
});

test('disabled Scene Template writes preserve the stable feature-gate error contract', async () => {
  const routes = createRouteHarness();
  const policy = new CommunityFeaturePolicyService({
    configLoader: async () => structuredClone(disabledFlags)
  });
  let mutationCalls = 0;
  registerSceneTemplateRoutes(routes.app, {
    communityShareService: {
      async createGeneratedShareDraft() {
        mutationCalls += 1;
        return {};
      }
    },
    communityFeaturePolicyService: policy
  });
  const response = createResponse();
  await routes.get('POST', '/api/scene-templates/share-drafts')({
    body: { sourceGenerationId: 'job_1' },
    actorContext: { userId: 'usr_demo' }
  }, response);

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.payload.error, {
    code: 'community_feature_disabled',
    message: 'This Community feature is not available.'
  });
  assert.equal(mutationCalls, 0);
});

function createRouteHarness() {
  const handlers = new Map();
  const register = method => (route, handler) => handlers.set(`${method} ${route}`, handler);
  return {
    app: {
      get: register('GET'),
      post: register('POST'),
      patch: register('PATCH'),
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
    },
    sendFile() {
      throw new Error('sendFile should not be reached while feature is disabled.');
    }
  };
}
