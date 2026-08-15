import type { EngineValue } from '../../../components/generation/EngineTargetPanel';
import type { ProviderCatalog } from '../../generation/schemas/generationSchemas';

export function reconcileFashionEngine(
  catalog: ProviderCatalog,
  current: EngineValue
): EngineValue {
  const currentProvider = catalog.providers.find(provider =>
    provider.id === current.provider
  );
  const currentModel = currentProvider?.models.find(model =>
    model.id === current.model
  );
  if (currentProvider && currentModel) return current;

  const provider = catalog.providers.find(provider =>
    provider.id === catalog.defaultProvider
  ) || catalog.providers[0];
  const model = provider?.models.find(candidate =>
    candidate.id === provider.defaultModel
  ) || provider?.models[0];
  if (!provider || !model) {
    return {
      ...current,
      provider: '',
      model: '',
      resolution: null
    };
  }
  const aspectRatio = model.capabilities.aspectRatios.includes(current.aspectRatio)
    ? current.aspectRatio
    : model.capabilities.aspectRatios.includes('6:8')
      ? '6:8'
      : model.capabilities.aspectRatios[0] || '1:1';
  return {
    ...current,
    provider: provider.id,
    model: model.id,
    resolution:
      model.capabilities.resolutions?.[0]
      || model.defaults?.resolution
      || model.defaults?.imageSize
      || null,
    aspectRatio
  };
}
