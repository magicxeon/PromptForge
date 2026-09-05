import assert from 'node:assert/strict';
import test from 'node:test';
import { ProviderAvailabilityPolicyService } from '../server/domain/admin-configuration/ProviderAvailabilityPolicyService.js';
import { CinematicTextProviderRouter } from '../server/domain/generation/CinematicTextProviderRouter.js';
import { VideoCapabilityRegistry } from '../server/domain/generation/VideoCapabilityRegistry.js';
import { ProviderRegistry } from '../server/providers/ProviderRegistry.js';

test('one provider master disable blocks image, video and AI text consumers', async () => {
  const availabilityPolicy = new ProviderAvailabilityPolicyService({
    initialState: {
      schemaVersion: 1,
      version: 1,
      updatedAt: '2026-09-05T00:00:00.000Z',
      providers: {
        gemini: {
          enabled: false,
          reason: 'Cross-workflow maintenance',
          updatedAt: '2026-09-05T00:00:00.000Z'
        }
      },
      models: {},
      workflows: {},
      history: []
    }
  });
  const imageRegistry = new ProviderRegistry(imageConfig(), {
    NODE_ENV: 'test',
    GEMINI_API_KEY: 'test-key'
  }, availabilityPolicy);
  const videoRegistry = new VideoCapabilityRegistry({
    runtimeEnvironment: 'test',
    availabilityPolicy
  });
  let textCalls = 0;
  const textRouter = new CinematicTextProviderRouter({
    provider: 'gemini',
    model: 'text-test',
    apiKey: 'test-key',
    fallback: { enabled: false }
  }, {
    availabilityPolicy,
    primaryProviderFactory: () => ({
      generateCinematicStoryPlan: async () => {
        textCalls += 1;
        return {};
      }
    })
  });

  assert.equal(imageRegistry.getPublicCatalog({
    generationSurface: 'playground', generationMode: 'playground'
  }).providers.length, 0);
  assert.equal(videoRegistry.getPublicCatalog({
    includeResearch: true, workflow: 'playground.video'
  }).models.some(model => model.providerId === 'gemini'), false);
  await assert.rejects(() => textRouter.generateCinematicStoryPlan({
    model: 'text-test'
  }), error => error.code === 'provider_runtime_disabled'
    && error.details.scope === 'provider');
  assert.equal(textCalls, 0);
});

function imageConfig() {
  return {
    schemaVersion: 1,
    defaultProvider: 'gemini',
    providers: [{
      id: 'gemini',
      displayName: { en: 'Gemini' },
      enabled: true,
      catalogVisible: true,
      apiKeyEnv: 'GEMINI_API_KEY',
      defaultModel: 'image-test',
      models: [{
        id: 'image-test',
        displayName: { en: 'Image Test' },
        enabled: true,
        paidRoutingEnabled: true,
        capabilities: { imageGeneration: true }
      }]
    }]
  };
}
