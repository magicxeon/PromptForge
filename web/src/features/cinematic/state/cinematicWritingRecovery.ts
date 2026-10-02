import { z } from 'zod';
import { readActorScopedDraft, writeActorScopedDraft } from '../../../lib/persistence/actorScopedStorage';

const feature = 'cinematic-writing-recovery';
const recordSchema = z.object({
  id: z.string().min(1), fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  projectId: z.string().nullable(), operation: z.string().min(1),
  sceneId: z.string().nullable(), assignmentId: z.string().nullable()
});
const recordsSchema = z.array(recordSchema).max(64);
export type CinematicWritingRecoveryRecord = z.infer<typeof recordSchema>;

// Cinematic owns this bounded actor/request receipt index, not results or prompts.
// Uncertain receipts survive reload; only a verified terminal response removes them.
export function readCinematicWritingReceipts(actorId: string) {
  const value = readActorScopedDraft<unknown>({ actorId, feature, schemaVersion: 1, fallback: [] });
  return recordsSchema.parse(value);
}

export function saveCinematicWritingReceipt(actorId: string, record: CinematicWritingRecoveryRecord) {
  const records = readCinematicWritingReceipts(actorId).filter(item => item.id !== record.id);
  records.push(recordSchema.parse(record));
  writeActorScopedDraft({ actorId, feature, schemaVersion: 1, payload: recordsSchema.parse(records) });
  if (!readCinematicWritingReceipts(actorId).some(item => item.id === record.id && item.fingerprint === record.fingerprint)) {
    throw new Error('Writing receipt storage is unavailable.');
  }
}

export function removeCinematicWritingReceipt(actorId: string, id: string) {
  const records = readCinematicWritingReceipts(actorId).filter(item => item.id !== id);
  writeActorScopedDraft({ actorId, feature, schemaVersion: 1, payload: records });
}

export async function cinematicWritingRequestFingerprint(request: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(request));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
