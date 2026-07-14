import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '../..');
const DEFAULT_CONFIG_PATH = path.join(__dirname, '../config/providers.json');

export class ProviderConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProviderConfigError';
    this.statusCode = 500;
  }
}

function assertLocalizedName(value, context) {
  if (!value || typeof value !== 'object' || typeof value.en !== 'string' || !value.en.trim()) {
    throw new ProviderConfigError(`${context}.displayName.en is required.`);
  }
}

export function validateProviderConfig(config) {
  if (!config || typeof config !== 'object') throw new ProviderConfigError('Provider configuration must be an object.');
  if (!Number.isInteger(config.schemaVersion) || config.schemaVersion < 1) throw new ProviderConfigError('Provider schemaVersion must be a positive integer.');
  if (!Array.isArray(config.providers) || config.providers.length === 0) throw new ProviderConfigError('At least one provider is required.');

  const providerIds = new Set();
  config.providers.forEach((provider, providerIndex) => {
    const context = `providers[${providerIndex}]`;
    if (!provider?.id || typeof provider.id !== 'string') throw new ProviderConfigError(`${context}.id is required.`);
    if (providerIds.has(provider.id)) throw new ProviderConfigError(`Duplicate provider id: ${provider.id}`);
    providerIds.add(provider.id);
    if (!provider.adapter || !provider.apiKeyEnv) throw new ProviderConfigError(`${context} requires adapter and apiKeyEnv.`);
    assertLocalizedName(provider.displayName, context);
    if (!Array.isArray(provider.models) || provider.models.length === 0) throw new ProviderConfigError(`${context}.models must not be empty.`);

    const modelIds = new Set();
    provider.models.forEach((model, modelIndex) => {
      const modelContext = `${context}.models[${modelIndex}]`;
      if (!model?.id || typeof model.id !== 'string') throw new ProviderConfigError(`${modelContext}.id is required.`);
      if (modelIds.has(model.id)) throw new ProviderConfigError(`Duplicate model id ${model.id} in provider ${provider.id}.`);
      modelIds.add(model.id);
      assertLocalizedName(model.displayName, modelContext);
      if (!model.capabilities || model.capabilities.imageGeneration !== true) throw new ProviderConfigError(`${modelContext} must support imageGeneration.`);
    });

    if (!modelIds.has(provider.defaultModel)) throw new ProviderConfigError(`Default model ${provider.defaultModel} is not configured for ${provider.id}.`);
    const defaultModel = provider.models.find(model => model.id === provider.defaultModel);
    if (provider.enabled !== false && defaultModel?.enabled === false) throw new ProviderConfigError(`Default model ${provider.defaultModel} is disabled for ${provider.id}.`);
  });

  if (!providerIds.has(config.defaultProvider)) throw new ProviderConfigError(`Default provider ${config.defaultProvider} is not configured.`);
  const defaultProvider = config.providers.find(provider => provider.id === config.defaultProvider);
  if (defaultProvider?.enabled === false) throw new ProviderConfigError(`Default provider ${config.defaultProvider} is disabled.`);
  return config;
}

export function loadProviderConfig(configPath = process.env.PROVIDER_CONFIG_PATH) {
  const resolvedPath = configPath
    ? (path.isAbsolute(configPath) ? configPath : path.resolve(PROJECT_ROOT, configPath))
    : DEFAULT_CONFIG_PATH;
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(resolvedPath, 'utf8'));
  } catch (error) {
    throw new ProviderConfigError(`Unable to load provider configuration at ${resolvedPath}: ${error.message}`);
  }
  return validateProviderConfig(parsed);
}
