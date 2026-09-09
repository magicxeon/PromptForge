import type { ComparisonSlotInput } from '../../features/generation/api/generationApi';
import type { ProviderCatalog } from '../../features/generation/schemas/generationSchemas';
import { imageModelUnavailableReason } from '../../features/generation/modelAvailability';

export { imageModelUnavailableReason } from '../../features/generation/modelAvailability';

export function supportedImageRatio(ratios: string[], preferred = '6:8') {
  if (ratios.includes(preferred)) return preferred;
  const alias = preferred === '3:4' ? '6:8' : preferred === '6:8' ? '3:4' : null;
  if (alias && ratios.includes(alias)) return alias;
  return ratios.find(ratio => ['6:8', '3:4', '2:3', '4:5', '9:16'].includes(ratio))
    || ratios[0] || '1:1';
}

export type ImageGenerationSurface = 'playground' | 'studio' | 'fashion' | 'cinematic';
export type ImageGenerationMode = 'playground' | 'headshot' | 'scene' | 'character-sheet' | 'fashion';

export function filterImageCatalogForSurface(
  catalog: ProviderCatalog,
  surface: ImageGenerationSurface,
  generationMode: ImageGenerationMode | null = null
): ProviderCatalog {
  const providers = catalog.providers.map(provider => ({
    ...provider,
    models: provider.models.filter(model => (
      (!model.allowedGenerationSurfaces || model.allowedGenerationSurfaces.includes(surface))
      && (!model.allowedGenerationModes || (
        generationMode !== null && model.allowedGenerationModes.includes(generationMode)
      ))
    ))
  })).filter(provider => provider.models.length > 0);
  return {
    ...catalog,
    providers,
    defaultProvider: providers.some(provider => provider.id === catalog.defaultProvider)
      ? catalog.defaultProvider
      : providers[0]?.id || ''
  };
}

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
