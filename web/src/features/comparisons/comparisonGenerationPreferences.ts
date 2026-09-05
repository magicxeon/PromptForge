import type {
  ComparisonSlotInput
} from '../generation/api/generationApi';
import type {
  ProviderCatalog
} from '../generation/schemas/generationSchemas';
import {
  readActorScopedDraft,
  writeActorScopedDraft
} from '../../lib/persistence/actorScopedStorage';
import { imageModelUnavailableReason } from '../generation/modelAvailability';

const FEATURE = 'comparison-generation-preferences';
const SCHEMA_VERSION = 1;

export type ComparisonGenerationPreferences = {
  active: boolean;
  slots: ComparisonSlotInput[];
};

export function readComparisonGenerationPreferences(
  actorId: string,
  catalog: ProviderCatalog,
  fallbackSlots: ComparisonSlotInput[]
): ComparisonGenerationPreferences {
  const stored = readActorScopedDraft<Partial<ComparisonGenerationPreferences>>({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    fallback: {}
  });
  const slots = normalizeSlots(stored.slots, catalog);
  return {
    active: stored.active === true,
    slots: slots.length >= 2 ? slots : fallbackSlots
  };
}

export function writeComparisonGenerationPreferences(
  actorId: string,
  preference: ComparisonGenerationPreferences
) {
  writeActorScopedDraft({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    payload: {
      active: preference.active,
      slots: preference.slots.slice(0, 4).map(slot => ({
        id: slot.id,
        provider: slot.provider,
        model: slot.model
      }))
    }
  });
}

function normalizeSlots(
  value: unknown,
  catalog: ProviderCatalog
): ComparisonSlotInput[] {
  if (!Array.isArray(value)) return [];
  const usedIds = new Set<string>();
  return value.slice(0, 4).flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    const providerId = typeof candidate.provider === 'string' ? candidate.provider : '';
    const provider = catalog.providers.find(item => item.id === providerId);
    if (!provider) return [];
    const requestedModel = typeof candidate.model === 'string' ? candidate.model : '';
    const model = [
      provider.models.find(item => item.id === requestedModel),
      provider.models.find(item => item.id === provider.defaultModel),
      ...provider.models
    ].find(item => item && !imageModelUnavailableReason(item));
    if (!model) return [];
    const requestedId = typeof candidate.id === 'string' && candidate.id.trim()
      ? candidate.id.trim()
      : `slot_${index + 1}`;
    const id = usedIds.has(requestedId) ? `${requestedId}_${index + 1}` : requestedId;
    usedIds.add(id);
    return [{ id, provider: provider.id, model: model.id }];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
