import { loadProviderConfig } from './ProviderConfigLoader.js';
import { generatedReferencePolicy } from '../config/generatedReferencePolicy.js';
import {
  providerAvailabilityPolicyService,
  resolveImageProviderWorkflow
} from '../domain/admin-configuration/ProviderAvailabilityPolicyService.js';

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
  constructor(config, environment = process.env, availabilityPolicy = providerAvailabilityPolicyService) {
    this.config = config;
    this.environment = environment;
    this.availabilityPolicy = availabilityPolicy;
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

  isModelTestingAvailable(provider, model) {
    return provider.enabled !== false
      && model.testingRoutingEnabled === true
      && model.qualificationStatus === 'internal_testing'
      && model.pricingStatus === 'priced'
      && ['development', 'test'].includes(this.environment.NODE_ENV || 'development');
  }

  getPublicCatalog({
    generationSurface = null,
    generationMode = null,
    workflow = null
  } = {}) {
    const resolvedWorkflow = resolveImageProviderWorkflow({
      generationSurface,
      generationMode,
      workflow
    });
    const providers = this.config.providers
      .filter(provider => (
        provider.catalogVisible === true || provider.enabled !== false
      ) && Boolean(getConfiguredSecret(this.environment, provider))
        && this.availabilityPolicy.evaluate({ providerId: provider.id }).enabled)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map(provider => ({
        id: provider.id,
        displayName: provider.displayName,
        defaultModel: provider.defaultModel,
        catalogVisible: provider.catalogVisible === true,
        models: provider.models
          .filter(model => model.enabled !== false && this.availabilityPolicy.evaluate({
            providerId: provider.id,
            modelId: model.id,
            workflow: resolvedWorkflow
          }).enabled)
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
          .map(model => ({
            id: model.id,
            displayName: model.displayName,
            capabilities: { ...model.capabilities, generatedReferenceSourcesOpen: generatedReferencePolicy.allowAnyProvider },
            defaults: model.defaults || {},
            ...(model.allowedGenerationSurfaces ? { allowedGenerationSurfaces: [...model.allowedGenerationSurfaces] } : {}),
            ...(model.allowedGenerationModes ? { allowedGenerationModes: [...model.allowedGenerationModes] } : {}),
            estimatedCredits: Number.isFinite(Number(model.creditCost))
              ? Number(model.creditCost)
              : null,
            pricingStatus: model.pricingStatus || 'priced',
            qualificationStatus: model.qualificationStatus || 'qualified',
            ...(model.testingRoutingEnabled !== undefined ? {
              testingRoutingEnabled: this.isModelTestingAvailable(provider, model)
            } : {}),
            paidRoutingEnabled: provider.enabled !== false
              && model.paidRoutingEnabled !== false,
            unavailableReason: provider.enabled === false
              ? 'provider_not_released'
              : model.pricingStatus === 'unavailable'
                ? 'pricing_unavailable'
                : model.paidRoutingEnabled === false && !this.isModelTestingAvailable(provider, model)
                  ? 'provider_not_released'
                : model.qualificationStatus === 'unqualified'
                  ? 'model_unqualified'
                  : null
          }))
      }))
      .filter(provider => provider.models.length > 0);

    const configuredDefault = providers.find(provider => provider.id === this.config.defaultProvider);
    return {
      schemaVersion: this.config.schemaVersion,
      runtimeControlVersion: this.availabilityPolicy.getVersion(),
      defaultProvider: configuredDefault?.id || providers[0]?.id || null,
      providers
    };
  }

  getAdminCatalog() {
    return {
      schemaVersion: this.config.schemaVersion,
      defaultProvider: this.config.defaultProvider,
      providers: this.config.providers.map(provider => ({
        id: provider.id,
        displayName: provider.displayName,
        configured: Boolean(getConfiguredSecret(this.environment, provider)),
        staticEnabled: provider.enabled !== false,
        models: provider.models.map(model => ({
          id: model.id,
          displayName: model.displayName,
          staticEnabled: model.enabled !== false,
          pricingStatus: model.pricingStatus || 'priced',
          qualificationStatus: model.qualificationStatus || 'qualified',
          paidRoutingEnabled: model.paidRoutingEnabled !== false,
          testingRoutingEnabled: this.isModelTestingAvailable(provider, model),
          capabilities: model.capabilities || {},
          allowedGenerationSurfaces: model.allowedGenerationSurfaces || [],
          allowedGenerationModes: model.allowedGenerationModes || []
        }))
      }))
    };
  }

  resolveSelection(providerId, modelId, {
    generationSurface = null,
    generationMode = null,
    workflow = null
  } = {}) {
    const selectedProviderId = providerId || this.config.defaultProvider;
    const provider = this.getProvider(selectedProviderId);
    if (!provider || provider.enabled === false) throw new ProviderSelectionError(`Provider is disabled or unknown: ${selectedProviderId}`);
    const resolvedWorkflow = resolveImageProviderWorkflow({ generationSurface, generationMode, workflow });
    this.availabilityPolicy.assertAvailable({ providerId: provider.id, workflow: resolvedWorkflow });
    if (!this.isProviderAvailable(provider)) throw new ProviderSelectionError(`${provider.displayName.en} API key is not configured on the server.`, 503);

    const selectedModelId = modelId || provider.defaultModel;
    const model = provider.models.find(entry => entry.id === selectedModelId);
    if (!model || model.enabled === false) throw new ProviderSelectionError(`Model is disabled or unknown for ${provider.id}: ${selectedModelId}`);
    this.availabilityPolicy.assertAvailable({
      providerId: provider.id,
      modelId: model.id,
      workflow: resolvedWorkflow
    });
    if (model.allowedGenerationSurfaces && !model.allowedGenerationSurfaces.includes(generationSurface)) {
      const error = new ProviderSelectionError(`${model.displayName.en} is unavailable for this generation surface.`);
      error.code = 'provider_surface_unsupported';
      throw error;
    }
    if (model.allowedGenerationModes && !model.allowedGenerationModes.includes(generationMode)) {
      const error = new ProviderSelectionError(`${model.displayName.en} is unavailable for this generation mode.`);
      error.code = 'provider_mode_unsupported';
      throw error;
    }
    if (model.paidRoutingEnabled === false && !this.isModelTestingAvailable(provider, model)) {
      const error = new ProviderSelectionError(`${model.displayName.en} is not released for this environment.`);
      error.code = 'provider_not_released';
      throw error;
    }
    return { provider, model };
  }

  assertRuntimeAvailable(providerId, modelId, options = {}) {
    const workflow = resolveImageProviderWorkflow(options);
    return this.availabilityPolicy.assertAvailable({ providerId, modelId, workflow });
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
