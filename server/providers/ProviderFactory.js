import { PROVIDER_ADAPTERS } from './providerAdapters.js';
import { getConfiguredSecret, getProviderRegistry, ProviderSelectionError } from './ProviderRegistry.js';

export class ProviderFactory {
  /**
   * Instantiate and return the appropriate provider class
   * @param {string} providerName 
   * @returns {BaseProvider}
   */
  static getProvider(providerName) {
    const registry = getProviderRegistry();
    const provider = registry.getProvider(String(providerName || '').toLowerCase());
    if (!provider || provider.enabled === false) throw new ProviderSelectionError(`Unsupported or disabled provider: ${providerName}`);
    if (!registry.isProviderAvailable(provider)) throw new ProviderSelectionError(`${provider.displayName.en} API key is not configured on the server.`, 503);
    const Adapter = PROVIDER_ADAPTERS[provider.adapter];
    if (!Adapter) throw new ProviderSelectionError(`Provider adapter is not registered: ${provider.adapter}`, 500);
    return new Adapter(getConfiguredSecret(process.env, provider), provider);
  }
}
