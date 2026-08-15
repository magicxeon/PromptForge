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

function createSlotId() {
  return `slot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
