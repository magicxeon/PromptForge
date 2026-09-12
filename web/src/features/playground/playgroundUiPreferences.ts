import {
  readActorScopedDraft,
  writeActorScopedDraft
} from '../../lib/persistence/actorScopedStorage';

const PREFERENCE_FEATURE = 'playground-ui-preferences';
const PREFERENCE_SCHEMA_VERSION = 1;

export type PlaygroundUiPreferences = {
  recentExpanded: boolean;
  mediaMode?: 'image' | 'video';
};

export function readPlaygroundUiPreferences(actorId?: string): PlaygroundUiPreferences {
  if (!actorId) return { recentExpanded: true };
  const preference = readActorScopedDraft<PlaygroundUiPreferences>({
    actorId,
    feature: PREFERENCE_FEATURE,
    schemaVersion: PREFERENCE_SCHEMA_VERSION,
    fallback: { recentExpanded: true }
  });
  return {
    mediaMode: preference.mediaMode === 'video' ? 'video' : 'image',
    recentExpanded: typeof preference.recentExpanded === 'boolean'
      ? preference.recentExpanded
      : true
  };
}

export function writePlaygroundUiPreferences(
  actorId: string,
  preference: PlaygroundUiPreferences
) {
  writeActorScopedDraft({
    actorId,
    feature: PREFERENCE_FEATURE,
    schemaVersion: PREFERENCE_SCHEMA_VERSION,
    payload: { ...readPlaygroundUiPreferences(actorId), ...preference }
  });
}
