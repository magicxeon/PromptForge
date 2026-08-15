export type ActorScopedEnvelope<T> = {
  schemaVersion: number;
  actorId: string;
  feature: string;
  updatedAt: string;
  payload: T;
};

type ReadOptions<T> = {
  actorId: string;
  feature: string;
  schemaVersion: number;
  fallback: T;
  migrate?: (envelope: ActorScopedEnvelope<unknown>) => T | null;
};

const STORAGE_PREFIX = 'mpf.react.draft';

export function writeActorScopedDraft<T>({
  actorId,
  feature,
  schemaVersion,
  payload
}: Omit<ActorScopedEnvelope<T>, 'updatedAt'>) {
  if (!actorId || !feature) return;
  const envelope: ActorScopedEnvelope<T> = {
    schemaVersion,
    actorId,
    feature,
    updatedAt: new Date().toISOString(),
    payload
  };
  localStorage.setItem(storageKey(actorId, feature), JSON.stringify(envelope));
}

export function readActorScopedDraft<T>({
  actorId,
  feature,
  schemaVersion,
  fallback,
  migrate
}: ReadOptions<T>): T {
  if (!actorId || !feature) return fallback;
  try {
    const raw = localStorage.getItem(storageKey(actorId, feature));
    if (!raw) return fallback;
    const envelope = JSON.parse(raw) as ActorScopedEnvelope<unknown>;
    if (
      !envelope
      || envelope.actorId !== actorId
      || envelope.feature !== feature
      || typeof envelope.schemaVersion !== 'number'
      || !Object.hasOwn(envelope, 'payload')
    ) {
      return fallback;
    }
    if (envelope.schemaVersion === schemaVersion) return envelope.payload as T;
    return migrate?.(envelope) ?? fallback;
  } catch {
    return fallback;
  }
}

export function removeActorScopedDraft(actorId: string, feature: string) {
  if (!actorId || !feature) return;
  localStorage.removeItem(storageKey(actorId, feature));
}

function storageKey(actorId: string, feature: string) {
  return `${STORAGE_PREFIX}:${feature}:${actorId}`;
}
