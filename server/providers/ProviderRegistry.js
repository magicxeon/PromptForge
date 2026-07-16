import { loadProviderConfig } from './ProviderConfigLoader.js';

export class ProviderSelectionError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ProviderSelectionError';
    this.statusCode = statusCode;
  }
}

function isConfiguredSecret(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  return !/^your_.+_here$/i.test(value.trim());
}

export function getConfiguredSecret(environment, provider) {
  const envNames = [
    provider?.apiKeyEnv,
    ...(Array.isArray(provider?.apiKeyEnvAliases) ? provider.apiKeyEnvAliases : [])
  ].filter(Boolean);
  for (const envName of envNames) {
    const value = environment[envName];
    if (isConfiguredSecret(value)) return value.trim();
  }
  return null;
}

function parseStrictBoolean(value, defaultValue) {
  if (value === undefined) return defaultValue;
  return String(value).trim().toLowerCase() === 'true';
}

export class ProviderRegistry {
  constructor(config, environment = process.env) {
    this.config = config;
    this.environment = environment;
    this.providers = new Map(config.providers.map(provider => [provider.id, provider]));
  }

  getConfigVersion() {
    return this.config.schemaVersion;
  }

  getProvider(providerId) {
    return this.providers.get(providerId) || null;
  }

  isProviderAvailable(provider) {
    return provider?.enabled !== false && Boolean(getConfiguredSecret(this.environment, provider));
  }

  getPublicCatalog() {
    const providers = this.config.providers
      .filter(provider => provider.enabled !== false && this.isProviderAvailable(provider))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map(provider => ({
        id: provider.id,
        displayName: provider.displayName,
        defaultModel: provider.defaultModel,
        models: provider.models
          .filter(model => model.enabled !== false)
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
          .map(model => ({
            id: model.id,
            displayName: model.displayName,
            capabilities: model.capabilities,
            defaults: model.defaults || {},
            estimatedCredits: Number(model.creditCost || 1)
          }))
      }))
      .filter(provider => provider.models.length > 0);

    const configuredDefault = providers.find(provider => provider.id === this.config.defaultProvider);
    return {
      schemaVersion: this.config.schemaVersion,
      defaultProvider: configuredDefault?.id || providers[0]?.id || null,
      providers
    };
  }

  resolveSelection(providerId, modelId) {
    const selectedProviderId = providerId || this.config.defaultProvider;
    const provider = this.getProvider(selectedProviderId);
    if (!provider || provider.enabled === false) throw new ProviderSelectionError(`Provider is disabled or unknown: ${selectedProviderId}`);
    if (!this.isProviderAvailable(provider)) throw new ProviderSelectionError(`${provider.displayName.en} API key is not configured on the server.`, 503);

    const selectedModelId = modelId || provider.defaultModel;
    const model = provider.models.find(entry => entry.id === selectedModelId);
    if (!model || model.enabled === false) throw new ProviderSelectionError(`Model is disabled or unknown for ${provider.id}: ${selectedModelId}`);
    return { provider, model };
  }

  shouldStream(provider, model, requested = true) {
    if (requested === false || model.capabilities?.streaming !== true) return false;
    if (!provider.streamingEnv) return true;
    return parseStrictBoolean(this.environment[provider.streamingEnv], true);
  }

  validateRequest(model, { aspectRatio, referenceCount = 0, imageResolution = null } = {}) {
    const capabilities = model.capabilities || {};
    if (referenceCount > 0 && capabilities.imageReferences !== true) {
      throw new ProviderSelectionError(`${model.displayName.en} does not support reference images.`);
    }
    if (referenceCount > Number(capabilities.maxReferenceImages || 0)) {
      throw new ProviderSelectionError(`${model.displayName.en} supports up to ${capabilities.maxReferenceImages || 0} unique reference images.`);
    }
    if (aspectRatio && Array.isArray(capabilities.aspectRatios) && !capabilities.aspectRatios.includes(aspectRatio)) {
      throw new ProviderSelectionError(`${model.displayName.en} does not support aspect ratio ${aspectRatio}.`);
    }
    if (imageResolution && Array.isArray(capabilities.resolutions) && !capabilities.resolutions.includes(imageResolution)) {
      throw new ProviderSelectionError(`${model.displayName.en} does not support resolution ${imageResolution}.`);
    }
  }
}

let registryInstance;

export function getProviderRegistry() {
  if (!registryInstance) registryInstance = new ProviderRegistry(loadProviderConfig());
  return registryInstance;
}

export function resetProviderRegistryForTests() {
  registryInstance = undefined;
}
