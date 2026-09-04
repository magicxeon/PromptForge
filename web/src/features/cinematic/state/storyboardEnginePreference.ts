import { z } from 'zod';
import {
  readActorScopedDraft,
  writeActorScopedDraft
} from '../../../lib/persistence/actorScopedStorage';

// Retain the original storage key so existing batch preferences survive this shared rollout.
const FEATURE = 'cinematic-storyboard-batch-engine';
const SCHEMA_VERSION = 1;
const storyboardEnginePreferenceSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1)
});

export type StoryboardEnginePreference = z.infer<typeof storyboardEnginePreferenceSchema>;

export function readStoryboardEnginePreference(actorId: string) {
  const value = readActorScopedDraft<unknown>({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    fallback: null
  });
  return storyboardEnginePreferenceSchema.safeParse(value).data ?? null;
}

export function writeStoryboardEnginePreference(
  actorId: string,
  preference: StoryboardEnginePreference
) {
  writeActorScopedDraft({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    payload: storyboardEnginePreferenceSchema.parse(preference)
  });
}
