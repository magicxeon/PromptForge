import {
  readActorScopedDraft,
  writeActorScopedDraft
} from '../../lib/persistence/actorScopedStorage';

const FEATURE = 'image-generation-engine-preference';
const SCHEMA_VERSION = 1;

export type ImageEnginePreference = {
  provider: string;
  model: string;
};

export function readImageEnginePreference(actorId: string): ImageEnginePreference | null {
  const stored = readActorScopedDraft<Partial<ImageEnginePreference>>({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    fallback: {}
  });
  const provider = normalizeId(stored.provider);
  const model = normalizeId(stored.model);
  return provider && model ? { provider, model } : null;
}

export function writeImageEnginePreference(
  actorId: string,
  preference: ImageEnginePreference
) {
  const provider = normalizeId(preference.provider);
  const model = normalizeId(preference.model);
  if (!provider || !model) return;
  writeActorScopedDraft({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    payload: { provider, model }
  });
}

function normalizeId(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

