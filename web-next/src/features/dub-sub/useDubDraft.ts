import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { projectsApi, type Project } from "./projectApi";
import config from "./editorConfig";
export function useDubDraft(initial: Project) {
  const [draft, setDraft] = useState(initial),
    latest = useRef(initial),
    saved = useRef(initial);
  const [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const history = useRef<Project[]>([]),
    future = useRef<Project[]>([]);
  const inflight = useRef<Promise<Project> | null>(null),
    mounted = useRef(true);
  const publish = useCallback((p: Project) => {
    latest.current = p;
    setDraft(p);
  }, []);
  const accept = useCallback(
    (p: Project) => {
      saved.current = p;
      publish(p);
      history.current = [];
      future.current = [];
      setError("");
    },
    [publish],
  );
  const edit = (update: (p: Project) => Project) => {
    history.current = [...history.current.slice(-39), latest.current];
    future.current = [];
    publish(update(latest.current));
  };
  function step(undo: boolean) {
    const from = undo ? history : future,
      to = undo ? future : history,
      previous = from.current.pop();
    if (previous) {
      to.current.push(latest.current);
      publish({ ...previous, revision: latest.current.revision });
    }
  }
  const save = useCallback(async (): Promise<Project> => {
    if (inflight.current) await inflight.current;
    if (saved.current === latest.current) return saved.current;
    if (inflight.current) return inflight.current;
    const snapshot = latest.current;
    const request = projectsApi
      .save(snapshot)
      .then((p) => {
        saved.current = p;
        if (mounted.current)
          publish(
            latest.current === snapshot
              ? p
              : { ...latest.current, revision: p.revision },
          );
        return p;
      })
      .finally(() => {
        inflight.current = null;
        if (mounted.current) setSaving(false);
      });
    inflight.current = request;
    setSaving(true);
    setError("");
    try {
      return await request;
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
      throw e;
    }
  }, [publish]);
  const dirty = draft !== saved.current;
  useEffect(() => {
    if (!dirty || error || saving) return;
    const timer = setTimeout(() => {
      void save().catch(() => {});
    }, config.autosaveMs);
    return () => clearTimeout(timer);
  }, [draft, dirty, error, saving, save]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const blocker = useBlocker(dirty);
  return {
    draft,
    edit,
    step,
    canUndo: !!history.current.length,
    canRedo: !!future.current.length,
    save,
    accept,
    error,
    saving,
    dirty,
    blocker,
  };
}
