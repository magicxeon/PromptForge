import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProviderConfig, validateProviderConfig, ProviderConfigError } from '../server/providers/ProviderConfigLoader.js';
import { ProviderRegistry, ProviderSelectionError } from '../server/providers/ProviderRegistry.js';

function createConfig() {
  return {
    schemaVersion: 1,
    defaultProvider: 'alpha',
    providers: [
      {
        id: 'alpha',
        adapter: 'alpha-adapter',
        enabled: true,
        displayName: { en: 'Alpha', th: 'Alpha' },
        apiKeyEnv: 'ALPHA_KEY',
        streamingEnv: 'ALPHA_STREAM',
        defaultModel: 'alpha-image',
        models: [
          {
            id: 'alpha-image',
            enabled: true,
            displayName: { en: 'Alpha Image', th: 'Alpha Image' },
            capabilities: {
              imageGeneration: true,
              imageReferences: true,
              maxReferenceImages: 2,
              streaming: true,
              aspectRatios: ['1:1']
            },
            creditCost: 3
          }
        ]
      },
      {
        id: 'disabled',
        adapter: 'disabled-adapter',
        enabled: false,
        displayName: { en: 'Disabled', th: 'Disabled' },
        apiKeyEnv: 'DISABLED_KEY',
        defaultModel: 'disabled-image',
        models: [
          {
            id: 'disabled-image',
            enabled: true,
            displayName: { en: 'Disabled Image', th: 'Disabled Image' },
            capabilities: { imageGeneration: true }
          }
        ]
      }
    ]
  };
}

test('provider registry exposes only enabled providers with configured secrets', () => {
  const registry = new ProviderRegistry(validateProviderConfig(createConfig()), {
    ALPHA_KEY: 'secret',
    ALPHA_STREAM: 'false',
    DISABLED_KEY: 'secret'
  });
  const catalog = registry.getPublicCatalog();

  assert.equal(catalog.defaultProvider, 'alpha');
  assert.deepEqual(catalog.providers.map(provider => provider.id), ['alpha']);
  assert.equal(catalog.providers[0].models[0].estimatedCredits, 3);
  assert.equal('apiKeyEnv' in catalog.providers[0], false);
  assert.equal(registry.shouldStream(createConfig().providers[0], createConfig().providers[0].models[0]), false);
});

test('provider registry rejects unknown models and incompatible requests', () => {
  const registry = new ProviderRegistry(validateProviderConfig(createConfig()), { ALPHA_KEY: 'secret' });
  assert.throws(() => registry.resolveSelection('alpha', 'missing'), ProviderSelectionError);
  assert.throws(
    () => registry.validateRequest(createConfig().providers[0].models[0], { aspectRatio: '4:5', referenceCount: 0 }),
    /does not support aspect ratio/
  );
  assert.throws(
    () => registry.validateRequest(createConfig().providers[0].models[0], { aspectRatio: '1:1', referenceCount: 3 }),
    /supports up to 2/
  );
});

test('provider configuration rejects duplicate provider IDs', () => {
  const config = createConfig();
  config.providers.push({ ...config.providers[0] });
  assert.throws(() => validateProviderConfig(config), ProviderConfigError);
});

test('project provider configuration registers Grok with X_API_KEY', () => {
  const config = loadProviderConfig();
  const xai = config.providers.find(provider => provider.id === 'xai');

  assert.equal(xai.apiKeyEnv, 'X_API_KEY');
  assert.equal(xai.defaultModel, 'grok-imagine-image-quality');
  assert.deepEqual(xai.models.map(model => model.id), [
    'grok-imagine-image-quality',
    'grok-imagine-image'
  ]);
});

test('project catalog sorts each provider by the configured local price order', () => {
  const config = loadProviderConfig();
  const registry = new ProviderRegistry(config, {
    GEMINI_API_KEY: 'secret',
    OPENAI_API_KEY: 'secret',
    X_API_KEY: 'secret',
    'MODEL_ARK_API-KEY': 'secret'
  });
  const providers = new Map(registry.getPublicCatalog().providers.map(provider => [provider.id, provider]));

  assert.deepEqual(providers.get('gemini').models.map(model => model.id), [
    'gemini-3.1-flash-lite-image',
    'gemini-2.5-flash-image',
    'gemini-3.1-flash-image',
    'gemini-3-pro-image'
  ]);
  assert.deepEqual(providers.get('openai').models.map(model => model.id), [
    'gpt-image-1-mini',
    'gpt-image-1.5',
    'dall-e-3',
    'gpt-image-1',
    'gpt-image-2'
  ]);
  assert.deepEqual(providers.get('xai').models.map(model => model.id), [
    'grok-imagine-image',
    'grok-imagine-image-quality'
  ]);
  assert.deepEqual(providers.get('modelark').models.map(model => model.id), [
    'seedream-4-0-250828',
    'seedream-5-0-lite-260128',
    'seedream-4-5-251128',
    'dola-seedream-5-0-pro-260628'
  ]);
});

test('provider registry accepts ModelArk API key aliases', () => {
  const config = loadProviderConfig();
  const registry = new ProviderRegistry(config, {
    MODEL_ARK_API: 'secret'
  });

  const { provider, model } = registry.resolveSelection('modelark');
  assert.equal(provider.id, 'modelark');
  assert.equal(model.id, 'seedream-4-0-250828');
});
