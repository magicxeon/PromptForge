import { z } from 'zod';
import {
  readActorScopedDraft,
  writeActorScopedDraft
} from '../../../lib/persistence/actorScopedStorage';

const FEATURE = 'cinematic-storyboard-batch-engine';
const SCHEMA_VERSION = 1;
const storyboardBatchEnginePreferenceSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1)
});

export type StoryboardBatchEnginePreference = z.infer<typeof storyboardBatchEnginePreferenceSchema>;

export function readStoryboardBatchEnginePreference(actorId: string) {
  const value = readActorScopedDraft<unknown>({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    fallback: null
  });
  return storyboardBatchEnginePreferenceSchema.safeParse(value).data ?? null;
}

export function writeStoryboardBatchEnginePreference(
  actorId: string,
  preference: StoryboardBatchEnginePreference
) {
  writeActorScopedDraft({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    payload: storyboardBatchEnginePreferenceSchema.parse(preference)
  });
}
