import {
  readActorScopedDraft,
  writeActorScopedDraft
} from '../persistence/actorScopedStorage';
import {
  isThemePreference,
  type ThemePreference
} from './themeContract';

const FEATURE = 'ui-theme-preference';
const SCHEMA_VERSION = 1;
const FALLBACK_PREFERENCE: ThemePreference = 'auto';

export function readThemePreference(actorId: string): ThemePreference {
  const stored = readActorScopedDraft<unknown>({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    fallback: { theme: FALLBACK_PREFERENCE }
  });
  const candidate = isRecord(stored) ? stored.theme : undefined;
  return isThemePreference(candidate)
    ? candidate
    : FALLBACK_PREFERENCE;
}

export function writeThemePreference(
  actorId: string,
  preference: ThemePreference
) {
  if (!isThemePreference(preference)) return;
  writeActorScopedDraft({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    payload: { theme: preference }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
