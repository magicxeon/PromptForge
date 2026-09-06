import { readActorScopedDraft, writeActorScopedDraft } from '../../lib/persistence/actorScopedStorage';

const feature = 'character-picker-recents';
export function readCharacterPickerRecents(actorId: string): string[] {
  const value = readActorScopedDraft<unknown>({ actorId, feature, schemaVersion: 1, fallback: [] });
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 160))].slice(0, 8) : [];
}
export function rememberCharacterPick(actorId: string, id: string) {
  if (!id || id.length > 160) return;
  try { writeActorScopedDraft({ actorId, feature, schemaVersion: 1, payload: [id, ...readCharacterPickerRecents(actorId).filter(value => value !== id)].slice(0, 8) }); }
  catch { /* A full or disabled browser store must not fail an authorized selection. */ }
}
