export class VideoProviderAdapterRegistry {
  constructor({ adapters = {}, modelAdapters = {} } = {}) {
    this.adapters = new Map(Object.entries(adapters));
    this.modelAdapters = new Map(Object.entries(modelAdapters));
  }

  register(providerId, adapter) {
    const id = normalizeProviderId(providerId);
    if (!adapter || typeof adapter.submit !== 'function' || typeof adapter.poll !== 'function') {
      throw new TypeError(`Video provider adapter "${id}" must implement submit() and poll().`);
    }
    this.adapters.set(id, adapter);
    return this;
  }

  registerModel(providerId, modelId, adapter) {
    const key = modelAdapterKey(providerId, modelId);
    assertAdapter(adapter, key);
    this.modelAdapters.set(key, adapter);
    return this;
  }

  resolve(providerId, modelId = null) {
    const id = normalizeProviderId(providerId);
    const modelAdapter = modelId ? this.modelAdapters.get(modelAdapterKey(id, modelId)) : null;
    if (modelAdapter) return modelAdapter;
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw providerRegistryError(
        'video_provider_adapter_unavailable',
        `Video provider adapter "${id}" is unavailable.`
      );
    }
    return adapter;
  }
}

function assertAdapter(adapter, id) {
  if (!adapter || typeof adapter.submit !== 'function' || typeof adapter.poll !== 'function') {
    throw new TypeError(`Video provider adapter "${id}" must implement submit() and poll().`);
  }
}

function modelAdapterKey(providerId, modelId) {
  const provider = normalizeProviderId(providerId);
  const model = String(modelId || '').trim();
  if (!model) throw providerRegistryError('video_model_id_missing', 'Video model ID is required.');
  return `${provider}/${model}`;
}

function normalizeProviderId(value) {
  const providerId = String(value || '').trim().toLowerCase();
  if (!providerId) throw providerRegistryError('video_provider_id_missing', 'Video provider ID is required.');
  return providerId;
}

function providerRegistryError(code, message) {
  return Object.assign(new Error(message), {
    code,
    category: 'configuration',
    retryable: false,
    providerBillableState: 'not_billable'
  });
}
