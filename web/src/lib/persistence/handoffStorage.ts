import { getIdentitySnapshot } from '../auth/actorStore';
import type { AuthMode } from '../auth/actorSchemas';

export type HandoffEnvelope<T> = {
  schemaVersion: number;
  actorId: string;
  authMode: AuthMode;
  kind: string;
  createdAt: string;
  expiresAt: string;
  payload: T;
};

const STORAGE_PREFIX = 'mpf.react.handoff';
const DEFAULT_TTL_MS = 30 * 60_000;

export function writeHandoff<T>({
  actorId,
  kind,
  payload,
  ttlMs = DEFAULT_TTL_MS
}: {
  actorId: string;
  kind: string;
  payload: T;
  ttlMs?: number;
}) {
  if (!actorId || !kind) return;
  const now = Date.now();
  const envelope: HandoffEnvelope<T> = {
    schemaVersion: 1,
    actorId,
    authMode: getIdentitySnapshot().authMode,
    kind,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    payload
  };
  sessionStorage.setItem(handoffKey(kind, actorId), JSON.stringify(envelope));
}

export function readHandoff<T>({
  actorId,
  kind,
  consume = false
}: {
  actorId: string;
  kind: string;
  consume?: boolean;
}): HandoffEnvelope<T> | null {
  try {
    const key = handoffKey(kind, actorId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as HandoffEnvelope<T>;
    const valid = envelope?.schemaVersion === 1
      && envelope.actorId === actorId
      && envelope.authMode === getIdentitySnapshot().authMode
      && envelope.kind === kind
      && Number.isFinite(Date.parse(envelope.expiresAt))
      && Date.parse(envelope.expiresAt) > Date.now()
      && Object.hasOwn(envelope, 'payload');
    if (!valid) {
      sessionStorage.removeItem(key);
      return null;
    }
    if (consume) sessionStorage.removeItem(key);
    return envelope;
  } catch {
    sessionStorage.removeItem(handoffKey(kind, actorId));
    return null;
  }
}

export function clearHandoff(kind: string) {
  const prefix = `${STORAGE_PREFIX}:${getIdentitySnapshot().authMode}:${kind}:`;
  for (const key of Object.keys(sessionStorage)) if (key.startsWith(prefix)) sessionStorage.removeItem(key);
}

function handoffKey(kind: string, actorId: string) {
  return `${STORAGE_PREFIX}:${getIdentitySnapshot().authMode}:${kind}:${actorId}`;
}
