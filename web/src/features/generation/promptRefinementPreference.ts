import {
  readActorScopedDraft,
  writeActorScopedDraft
} from '../../lib/persistence/actorScopedStorage';

const FEATURE = 'prompt-refinement-preference';
const SCHEMA_VERSION = 1;

export function readPromptRefinementPreference(actorId: string) {
  const stored = readActorScopedDraft<{ enabled?: boolean }>({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    fallback: { enabled: false }
  });
  return stored.enabled === true;
}

export function writePromptRefinementPreference(actorId: string, enabled: boolean) {
  writeActorScopedDraft({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    payload: { enabled }
  });
}
