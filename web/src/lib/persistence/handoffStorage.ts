export type HandoffEnvelope<T> = {
  schemaVersion: number;
  actorId: string;
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
    kind,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    payload
  };
  sessionStorage.setItem(handoffKey(kind), JSON.stringify(envelope));
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
    const key = handoffKey(kind);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as HandoffEnvelope<T>;
    const valid = envelope?.schemaVersion === 1
      && envelope.actorId === actorId
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
    sessionStorage.removeItem(handoffKey(kind));
    return null;
  }
}

export function clearHandoff(kind: string) {
  sessionStorage.removeItem(handoffKey(kind));
}

function handoffKey(kind: string) {
  return `${STORAGE_PREFIX}:${kind}`;
}
