import { z } from 'zod';
import { readActorScopedDraft, writeActorScopedDraft } from '../../../lib/persistence/actorScopedStorage';

const FEATURE = 'cinematic-produce-video-engine';
const SCHEMA_VERSION = 1;
const schema = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  audioMode: z.enum(['none', 'generated']).optional()
});

export type ProduceVideoEnginePreference = z.infer<typeof schema>;

export function readProduceVideoEnginePreference(actorId: string) {
  const value = readActorScopedDraft<unknown>({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    fallback: null
  });
  return schema.safeParse(value).data ?? null;
}

export function writeProduceVideoEnginePreference(actorId: string, preference: ProduceVideoEnginePreference) {
  writeActorScopedDraft({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    payload: schema.parse({ ...readProduceVideoEnginePreference(actorId), ...preference })
  });
}
