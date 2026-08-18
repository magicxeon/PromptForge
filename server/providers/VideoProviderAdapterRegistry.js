export class VideoProviderAdapterRegistry {
  constructor({ adapters = {} } = {}) {
    this.adapters = new Map(Object.entries(adapters));
  }

  register(providerId, adapter) {
    const id = normalizeProviderId(providerId);
    if (!adapter || typeof adapter.submit !== 'function' || typeof adapter.poll !== 'function') {
      throw new TypeError(`Video provider adapter "${id}" must implement submit() and poll().`);
    }
    this.adapters.set(id, adapter);
    return this;
  }

  resolve(providerId) {
    const id = normalizeProviderId(providerId);
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
