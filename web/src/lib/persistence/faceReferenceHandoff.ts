import type {
  FaceReferenceDestination,
  FaceReferenceHandoff
} from '../../features/generation/api/faceReferenceHandoffApi';
import { readHandoff, writeHandoff } from './handoffStorage';

export const FACE_REFERENCE_HANDOFF_KIND = 'face-reference';

export function writeFaceReferenceHandoff(actorId: string, payload: FaceReferenceHandoff) {
  writeHandoff({
    actorId,
    kind: FACE_REFERENCE_HANDOFF_KIND,
    payload,
    ttlMs: Math.max(1, Date.parse(payload.expiresAt) - Date.now())
  });
}

export function readFaceReferenceHandoff(
  actorId: string,
  destination: FaceReferenceDestination
) {
  const envelope = readHandoff<FaceReferenceHandoff>({
    actorId,
    kind: FACE_REFERENCE_HANDOFF_KIND,
    consume: false
  });
  if (!envelope || envelope.payload.destination !== destination) return null;
  readHandoff({
    actorId,
    kind: FACE_REFERENCE_HANDOFF_KIND,
    consume: true
  });
  return envelope.payload;
}
