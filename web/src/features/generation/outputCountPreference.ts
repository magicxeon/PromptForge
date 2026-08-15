import {
  readActorScopedDraft,
  writeActorScopedDraft
} from '../../lib/persistence/actorScopedStorage';

const FEATURE = 'generation-output-count-preference';
const SCHEMA_VERSION = 1;

export function readOutputCountPreference(actorId: string) {
  const stored = readActorScopedDraft<{ outputCount?: number }>({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    fallback: { outputCount: 1 }
  });
  return normalizeOutputCount(stored.outputCount);
}

export function writeOutputCountPreference(actorId: string, outputCount: number) {
  writeActorScopedDraft({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    payload: { outputCount: normalizeOutputCount(outputCount) }
  });
}

function normalizeOutputCount(value: unknown) {
  const count = Math.floor(Number(value) || 1);
  return Math.min(4, Math.max(1, count));
}
