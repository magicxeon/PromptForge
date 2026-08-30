import {
  readActorScopedDraft,
  removeActorScopedDraft,
  writeActorScopedDraft
} from '../../../lib/persistence/actorScopedStorage';

export type GenerationRoutePointer = {
  jobId: string | null;
  generationGroupId: string | null;
  comparisonSetId: string | null;
  updatedAt: string;
};

const EMPTY: GenerationRoutePointer = {
  jobId: null,
  generationGroupId: null,
  comparisonSetId: null,
  updatedAt: ''
};

export function generationRoutePointerFeature(surface: string, generationMode: string, scope = '') {
  return `generation-route-pointer:${surface}:${generationMode}${scope ? `:${scope}` : ''}`;
}

export function readGenerationRoutePointer(actorId: string, feature: string) {
  return readActorScopedDraft({ actorId, feature, schemaVersion: 1, fallback: EMPTY });
}

export function writeGenerationRoutePointer(
  actorId: string,
  feature: string,
  pointer: Omit<GenerationRoutePointer, 'updatedAt'>
) {
  if (!pointer.jobId && !pointer.generationGroupId && !pointer.comparisonSetId) {
    removeActorScopedDraft(actorId, feature);
    return;
  }
  writeActorScopedDraft({
    actorId,
    feature,
    schemaVersion: 1,
    payload: { ...pointer, updatedAt: new Date().toISOString() }
  });
}
