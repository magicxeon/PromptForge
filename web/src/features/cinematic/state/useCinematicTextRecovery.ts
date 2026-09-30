import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { z } from 'zod';
import { readActorScopedDraft, removeActorScopedDraft, writeActorScopedDraft } from '../../../lib/persistence/actorScopedStorage';

const FEATURE = 'cinematic-text-recovery';
export const RECOVERY_LIMITS = { documents: 12, characters: 600_000, retentionMs: 7 * 24 * 60 * 60 * 1000 };
const text = (limit: number) => z.string().max(limit).refine(value => !/data:[^\s,]*;base64,|[A-Za-z0-9+/]{512,}={0,2}/i.test(value));
const instruction = text(2000);
export const fullStoryRecoverySchema = z.object({ content: text(50000), instruction }).strict();
export const chapterRecoverySchema = z.object({ title: text(120), story: text(50000), instruction }).strict();
export const sceneRecoverySchema = z.object({
  title: text(120), synopsis: text(4000), purpose: z.enum(['dialogue', 'action', 'montage', 'establishing', 'atmosphere', 'transition', 'dramatic']),
  objective: text(4000), location: text(240), time: text(160), weather: text(160), environment: text(12000),
  entryState: text(4000), exitState: text(4000), emotionalStart: text(4000), emotionalEnd: text(4000), transitionIntent: text(4000),
  targetDurationSeconds: z.number().finite(), dialogueTargetPercent: z.number().finite()
}).strict();
export const shotRecoverySchema = z.object({
  title: text(120), durationSeconds: z.number().finite(), shotDocument: text(50000),
  speakerBindings: z.array(z.object({ castAssignmentId: text(200), alias: text(120), visible: z.boolean() }).strict()).max(100),
  promptDraft: text(50000).nullable(), promptTouched: z.boolean(), instruction
}).strict();
export const timelineRecoverySchema = z.object({ entries: z.array(z.object({
  shotId: text(200), trimInMs: z.number().finite(), trimOutMs: z.number().finite(),
  transition: z.enum(['cut', 'dissolve', 'fade']), transitionDurationMs: z.number().finite()
}).strict()).max(1024) }).strict();

const entrySchema = z.object({
  projectId: z.string().max(200), documentId: z.string().max(300), revision: z.string().max(500),
  updatedAt: z.number(), base: z.unknown(), value: z.unknown()
}).strict();
type Entry = z.infer<typeof entrySchema>;
function orderedJson(value: unknown) {
  return JSON.stringify(value, (_key, item: unknown) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
}
export const cinematicTextEquals = (a: unknown, b: unknown) => orderedJson(a) === orderedJson(b);

function readEntries(actorId: string): Entry[] {
  const raw = readActorScopedDraft<unknown>({ actorId, feature: FEATURE, schemaVersion: 1, fallback: [] });
  const parsed = z.array(entrySchema).max(RECOVERY_LIMITS.documents).safeParse(raw);
  if (!parsed.success || JSON.stringify(raw).length > RECOVERY_LIMITS.characters) return [];
  return parsed.data.filter(entry => entry.updatedAt > Date.now() - RECOVERY_LIMITS.retentionMs && entry.updatedAt <= Date.now());
}

function persist(actorId: string, projectId: string, documentId: string, entry: Entry | null, expectedValue?: unknown) {
  if (!actorId || !projectId || !documentId) return false;
  try {
    const stored = readEntries(actorId);
    const previous = stored.find(item => item.projectId === projectId && item.documentId === documentId);
    if (previous && expectedValue !== undefined && !cinematicTextEquals(previous.value, expectedValue)) return false;
    const entries = stored.filter(item => item.projectId !== projectId || item.documentId !== documentId);
    if (entry) entries.push(entry);
    // Never evict another unsaved document to make room for this one.
    if (entries.length > RECOVERY_LIMITS.documents || JSON.stringify(entries).length > RECOVERY_LIMITS.characters) return false;
    if (entries.length) writeActorScopedDraft({ actorId, feature: FEATURE, schemaVersion: 1, payload: entries });
    else removeActorScopedDraft(actorId, FEATURE);
    return true;
  } catch { return false; }
}

type Session<T> = {
  scope: string; server: T; revision: string; base: T; baseRevision: string; value: T;
  editedFields: Set<string>;
  needsPersistence?: boolean;
  pending: { base: T; revision: string; value: T } | null; unavailable: boolean;
};

export function useCinematicTextRecovery<T extends Record<string, unknown>>({ actorId, projectId, documentId, revision, serverValue, schema }: {
  actorId: string; projectId: string; documentId: string; revision: string; serverValue: T; schema: z.ZodType<T>;
}) {
  const scope = JSON.stringify([actorId, projectId, documentId]);
  function initial(): Session<T> {
    const entry = readEntries(actorId).find(item => item.projectId === projectId && item.documentId === documentId);
    const value = schema.safeParse(entry?.value);
    const base = schema.safeParse(entry?.base);
    return { scope, server: serverValue, revision, base: serverValue, baseRevision: revision, value: serverValue, editedFields: new Set(),
      pending: entry && value.success && base.success && !cinematicTextEquals(value.data, serverValue)
        ? { value: value.data, base: base.data, revision: entry.revision } : null, unavailable: false };
  }
  const [state, setState] = useState(initial);
  let current = state;
  if (state.scope !== scope) current = initial();
  else if (state.revision !== revision || !cinematicTextEquals(state.server, serverValue)) {
    const clean = cinematicTextEquals(state.value, state.base);
    const value = { ...serverValue };
    if (clean) {
      for (const key of state.editedFields as Set<keyof T>) value[key] = state.value[key];
    }
    current = { ...state, server: serverValue, revision,
      ...(clean ? { value, base: serverValue, baseRevision: revision,
        needsPersistence: !cinematicTextEquals(value, serverValue) && !state.pending } : {}) };
  }
  if (current !== state) setState(current);
  const latest = useRef(current);
  latest.current = current;

  function commit(next: Session<T>, write = true, expectedValue?: T) {
    if (latest.current.scope !== scope) return;
    next.needsPersistence = false;
    if (write) {
      const clean = cinematicTextEquals(next.value, next.base);
      const valid = schema.safeParse(next.value).success && schema.safeParse(next.base).success;
      next.unavailable = (!clean && !valid) || !persist(actorId, projectId, documentId, clean ? null : {
        projectId, documentId, revision: next.baseRevision, updatedAt: Date.now(), base: next.base, value: next.value
      }, expectedValue);
    }
    latest.current = next;
    setState(next);
  }

  useEffect(() => {
    const live = latest.current;
    if (live.scope === scope && live.needsPersistence) commit({ ...live });
  }, [scope, current]);

  function setValue(action: SetStateAction<T>) {
    const live = latest.current;
    if (live.scope !== scope || live.pending) return;
    const value = typeof action === 'function' ? action(live.value) : action;
    const editedFields = new Set(live.editedFields);
    for (const key of Object.keys(value)) {
      if (!cinematicTextEquals(value[key], live.value[key])) editedFields.add(key);
    }
    commit({ ...live, value, editedFields });
  }

  function restore(acknowledgeStale = false) {
    const live = latest.current;
    if (live.scope !== scope || !live.pending) return;
    const stale = live.pending.revision !== live.revision || !cinematicTextEquals(live.pending.base, live.server);
    if (stale && !acknowledgeStale) return;
    commit({ ...live, value: live.pending.value, base: live.server, baseRevision: live.revision, pending: null,
      editedFields: new Set(Object.keys(live.pending.value).filter(key => !cinematicTextEquals(live.pending!.value[key], live.server[key]))) }, true, live.pending.value);
  }

  function discard() {
    const live = latest.current;
    if (live.scope !== scope || !live.pending) return;
    // Discard only the offered browser recovery, never the currently displayed server document.
    const removed = persist(actorId, projectId, documentId, null, live.pending.value);
    commit({ ...live, pending: removed ? null : live.pending, unavailable: !removed }, false);
  }

  function markSaved(submitted: Partial<T>, savedServer: T, savedRevision: string) {
    const live = latest.current;
    if (live.scope !== scope || live.pending) return;
    const value = { ...live.value };
    for (const key of Object.keys(submitted) as (keyof T)[]) {
      // Returning to the original value is still an edit made after submitting.
      if (cinematicTextEquals(value[key], submitted[key]) || !live.editedFields.has(String(key))) value[key] = savedServer[key];
    }
    commit({ ...live, value, base: savedServer, baseRevision: savedRevision,
      editedFields: new Set(Object.keys(value).filter(key => !cinematicTextEquals(value[key], savedServer[key]))) }, true, live.value);
  }

  function canLeave(confirmLeave: () => boolean) {
    const live = latest.current;
    if (live.scope !== scope) return false;
    return !live.unavailable || cinematicTextEquals(live.value, live.base) || confirmLeave();
  }

  const dirty = !cinematicTextEquals(current.value, current.base);
  useEffect(() => {
    if (!dirty && !current.pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, Boolean(current.pending)]);

  return { value: current.value, setValue, markSaved, restore, discard, canLeave, dirty,
    pending: Boolean(current.pending), unavailable: current.unavailable,
    stale: Boolean(current.pending && (current.pending.revision !== revision || !cinematicTextEquals(current.pending.base, serverValue))) };
}
