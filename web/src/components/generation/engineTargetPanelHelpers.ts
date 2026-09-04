import type { ComparisonSlotInput } from '../../features/generation/api/generationApi';
import type { ProviderCatalog } from '../../features/generation/schemas/generationSchemas';

export function createDefaultComparisonSlots(catalog: ProviderCatalog): ComparisonSlotInput[] {
  const provider = catalog.providers[0];
  const models = provider?.models.slice(0, 2) || [];
  if (!provider || !models.length) return [];
  return models.map(model => ({
    id: createSlotId(),
    provider: provider.id,
    model: model.id
  }));
}

export function imageModelUnavailableReason(
  model: ProviderCatalog['providers'][number]['models'][number] | undefined,
  requiredReferenceCount = 0,
  aspectRatio: string | null = null
) {
  if (!model) return 'model_unavailable';
  if (model.paidRoutingEnabled === false) return model.unavailableReason || 'provider_not_released';
  if (model.pricingStatus === 'unavailable') return 'pricing_unavailable';
  if (model.qualificationStatus === 'unqualified') return 'model_unqualified';
  if (requiredReferenceCount > 0 && model.capabilities.imageReferences !== true) {
    return 'references_unsupported';
  }
  if (requiredReferenceCount > Number(model.capabilities.maxReferenceImages || 0)) {
    return 'reference_limit';
  }
  if (
    aspectRatio
    && model.capabilities.aspectRatios.length
    && !model.capabilities.aspectRatios.includes(aspectRatio)
  ) {
    return 'aspect_ratio_unsupported';
  }
  return null;
}

export function resolveAvailableImageEngine(
  catalog: ProviderCatalog,
  preference: { provider: string; model: string } | null = null,
  requiredReferenceCount = 0,
  aspectRatio: string | null = null
) {
  type Provider = ProviderCatalog['providers'][number];
  type Model = Provider['models'][number];
  const candidates: Array<{ provider: Provider; model: Model }> = [];
  const seen = new Set<string>();
  const addModel = (provider: Provider | undefined, model: Model | undefined) => {
    if (!provider || !model) return;
    const key = `${provider.id}:${model.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ provider, model });
  };
  const addProvider = (provider: Provider | undefined, preferredModelId?: string) => {
    if (!provider) return;
    addModel(provider, provider.models.find(model => model.id === preferredModelId));
    addModel(provider, provider.models.find(model => model.id === provider.defaultModel));
    provider.models.forEach(model => addModel(provider, model));
  };

  const preferredProvider = preference
    ? catalog.providers.find(provider => provider.id === preference.provider)
    : undefined;
  addProvider(preferredProvider, preference?.model);

  const defaultProvider = catalog.providers.find(provider => provider.id === catalog.defaultProvider)
    || catalog.providers[0];
  addProvider(defaultProvider);
  catalog.providers.forEach(provider => addProvider(provider));

  return candidates.find(({ model }) => !imageModelUnavailableReason(
    model,
    requiredReferenceCount,
    aspectRatio
  )) || candidates[0] || null;
}

function createSlotId() {
  return `slot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
