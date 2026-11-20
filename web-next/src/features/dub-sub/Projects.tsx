import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MoreHorizontal } from "lucide-react";
import { listRecentVideoTasks } from "../../../../web/src/features/generation/api/videoGenerationApi";
import { Dialog } from "./Dialog";
import {
  useActor,
  ProcessingSpinner,
  pollingPolicy,
} from "../../lib/canonical";
import { projectsApi, requestScenePreview, scenePreviewKey, timeLabel } from "./projectApi";
import config from "./editorConfig";

type LanguageContext = { languageStyle: string; storyContext: string };
const emptyContext: LanguageContext = { languageStyle: "", storyContext: "" };

function LanguageContextFields({
  value,
  onChange,
}: {
  value: LanguageContext;
  onChange: (value: LanguageContext) => void;
}) {
  const { t } = useTranslation("dub");
  return (
    <>
      <label>
        {t("languageStyle")}
        <input
          value={value.languageStyle}
          maxLength={config.languageStyleMaxLength}
          placeholder={t("languageStyleHint")}
          onChange={(e) =>
            onChange({ ...value, languageStyle: e.target.value })
          }
        />
      </label>
      <label>
        {t("storyContext")}
        <textarea
          rows={3}
          value={value.storyContext}
          maxLength={config.storyContextMaxLength}
          placeholder={t("storyContextHint")}
          onChange={(e) => onChange({ ...value, storyContext: e.target.value })}
        />
      </label>
    </>
  );
}

function SourcePreview({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.src = src;
    return () => {
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
  }, [src]);
  return (
    <video
      className="dub-source-preview"
      ref={ref}
      controls
      preload="metadata"
    />
  );
}
export function Projects() {
  const { t } = useTranslation("dub"),
    { identityScope, actor, config: auth } = useActor(),
    nav = useNavigate(),
    client = useQueryClient();
  const [form, showForm] = useState(false),
    [grid, setGrid] = useState(false);
  const [context, setContext] = useState<LanguageContext>(emptyContext);
  const [deleting, setDeleting] = useState<{ id: string; name: string; revision: number } | null>(null);
  const createButton = useRef<HTMLButtonElement>(null);
  const actionsTrigger = useRef<HTMLElement | null>(null);
  const [editing, setEditing] = useState<
    | (LanguageContext & {
        id: string;
        revision: number;
        name: string;
        sourceLanguage: string;
        targetLanguages: string[];
      })
    | null
  >(null);
  const [source, setSource] = useState("auto"),
    [targets, setTargets] = useState(["th"]),
    [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null),
    [sourceUrl, setSourceUrl] = useState(""),
    [useLibrary, setLibrary] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState("");
  const controller = useRef<AbortController | null>(null),
    pendingProject = useRef<string | null>(null);
  const geminiAvailable = actor?.role === "admin" && auth?.authMode === "development_bypass" && auth.development?.liveGeneration;
  const [listening, setListening] = useState(false);
  const [archived, setArchived] = useState(false);
  const projects = useInfiniteQuery({
    queryKey: ["dub-projects", identityScope, archived],
    queryFn: ({ pageParam }) => projectsApi.list(pageParam, archived),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => p.nextCursor || undefined,
    refetchInterval: (q) =>
      pollingPolicy.comparison(
        !!q.state.data?.pages.some((page) =>
          page.items.some((p) =>
            p.operations?.some((o) => o.status === "running"),
          ),
        ),
      ),
  });
  const library = useQuery({
    queryKey: ["dub-sources", identityScope],
    queryFn: () => listRecentVideoTasks(config.libraryLimit),
    enabled: form && useLibrary,
  });
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => controller.current?.abort(), []);
  async function create(e: FormEvent) {
    e.preventDefault();
    if (busy || controller.current) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const sendAudio = geminiAvailable && submitter?.value === "gemini";
    setError("");
    setBusy(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      let project = pendingProject.current
        ? await projectsApi.read(pendingProject.current)
        : await projectsApi.create({
            name: name.trim(),
            ...context,
            sourceLanguage: source,
            targetLanguages: targets,
            ...(useLibrary ? { sourceUrl } : {}),
          });
      const id = project.id;
      pendingProject.current = id;
      if (!useLibrary && file) project = await projectsApi.upload(id, file, abort.signal);
      await client.invalidateQueries({
        queryKey: ["dub-projects", identityScope],
      });
      let sceneError: string | undefined;
      if (sendAudio && !abort.signal.aborted) {
        setListening(true);
        try {
          const preview = await requestScenePreview(project, project.targetLanguages[0], crypto.randomUUID());
          if (abort.signal.aborted) return;
          client.setQueryData(scenePreviewKey(identityScope, id), preview);
        } catch (cause) {
          sceneError = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "unknown";
        }
      }
      if (!abort.signal.aborted) nav("/dub-sub/projects/" + id, { state: { sceneError } });
    } catch (err) {
      if (!abort.signal.aborted)
        setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      controller.current = null;
      setBusy(false);
      setListening(false);
    }
  }
  return (
    <>
      <header className="dub-bar">
        <h1>{t("projects")}</h1>
        <label className="dub-inline">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          {t("archived")}
        </label>
        <button aria-pressed={grid} onClick={() => setGrid(!grid)}>
          {t(grid ? "list" : "grid")}
        </button>
        <button
          className="primary"
          ref={createButton}
          onClick={() => {
            pendingProject.current = null;
            setContext(emptyContext);
            setName("");
            setFile(null);
            setSourceUrl("");
            setLibrary(false);
            setSource("auto");
            setTargets(["th"]);
            setError("");
            showForm(true);
          }}
        >
          {t("create")}
        </button>
      </header>
      {deleting && (
        <Dialog label={t("deleteProject")} onClose={() => {
          if (!busy) {
            setDeleting(null);
            setError("");
            actionsTrigger.current?.focus();
          }
        }}>
          <h2>{t("deleteProject")}</h2>
          <p>{t("deleteProjectMessage", { name: deleting.name })}</p>
          {error && <p role="alert">{error}</p>}
          <footer>
            <button type="button" autoFocus disabled={busy} onClick={() => {
              setDeleting(null);
              setError("");
              actionsTrigger.current?.focus();
            }}>{t("cancel")}</button>
            <button type="button" className="dub-delete-confirm" disabled={busy} onClick={async () => {
              if (busy) return;
              setBusy(true);
              setError("");
              try {
                await projectsApi.remove(deleting.id, deleting.revision);
                client.removeQueries({ queryKey: ["dub-project", identityScope, deleting.id] });
                client.removeQueries({ queryKey: ["dub-peaks", identityScope, deleting.id] });
                await client.invalidateQueries({ queryKey: ["dub-projects", identityScope] });
                setDeleting(null);
                requestAnimationFrame(() => createButton.current?.focus());
              } catch (err) {
                const code = (err as Error).message;
                setError(t("deleteErrors." + code, { defaultValue: t("deleteFailed") }));
                void projects.refetch();
              } finally {
                setBusy(false);
              }
            }}>{busy ? <ProcessingSpinner /> : t("deleteProject")}</button>
          </footer>
        </Dialog>
      )}
      {editing && (
        <Dialog
          label={t("editDetails")}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form
            className="dub-project-details"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || !editing.name.trim()) return;
              setBusy(true);
              try {
                await projectsApi.updateDetails(editing.id, editing.revision, {
                  name: editing.name.trim(),
                  languageStyle: editing.languageStyle,
                  storyContext: editing.storyContext,
                });
                await projects.refetch();
                setEditing(null);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2>{t("editDetails")}</h2>
            <small>
              {t("lang." + editing.sourceLanguage)} →{" "}
              {editing.targetLanguages.map((l) => t("lang." + l)).join(", ")}
            </small>
            <label>
              {t("name")}
              <input
                autoFocus
                required
                maxLength={100}
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <LanguageContextFields
              value={editing}
              onChange={(next) => setEditing({ ...editing, ...next })}
            />
            {error && (
              <p role="alert">
                {t("errors." + error, { defaultValue: error })}
              </p>
            )}
            <footer>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                {t("cancel")}
              </button>
              <button
                className="primary"
                disabled={busy || !editing.name.trim()}
              >
                {t("save")}
              </button>
            </footer>
          </form>
        </Dialog>
      )}
      {form && (
        <Dialog
          label={t("newProject")}
          onClose={() => {
            if (!busy) showForm(false);
          }}
        >
          <form className="dub-project-details" onSubmit={create}>
            <h2>{t("newProject")}</h2>
            <fieldset disabled={busy}>
              <label>
                {t("original")}
                <select
                  value={source}
                  disabled={!!pendingProject.current}
                  onChange={(e) => {
                    setSource(e.target.value);
                    setTargets(targets.filter((l) => l !== e.target.value));
                  }}
                >
                  {["auto", ...config.languages].map((l) => (
                    <option key={l} value={l}>
                      {t("lang." + l)}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset disabled={!!pendingProject.current}>
                <legend>{t("targets")}</legend>
                {config.languages
                  .filter((l) => l !== source)
                  .map((l) => (
                    <label className="dub-inline" key={l}>
                      <input
                        type="checkbox"
                        checked={targets.includes(l)}
                        disabled={
                          !targets.includes(l) &&
                          targets.length >= config.maxTargets
                        }
                        onChange={(e) =>
                          setTargets(
                            e.target.checked
                              ? [...targets, l]
                              : targets.filter((i) => i !== l),
                          )
                        }
                      />
                      {t("lang." + l)}
                    </label>
                  ))}
              </fieldset>
              <fieldset disabled={!!pendingProject.current}>
                <LanguageContextFields value={context} onChange={setContext} />
              </fieldset>
              <label>
                {t("name")}
                <input
                  value={name}
                  disabled={!!pendingProject.current}
                  required
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                {t("source")}
                <select
                  value={useLibrary ? "library" : "upload"}
                  disabled={!!pendingProject.current}
                  onChange={(e) => setLibrary(e.target.value === "library")}
                >
                  <option value="upload">{t("upload")}</option>
                  <option value="library">{t("library")}</option>
                </select>
              </label>
              {useLibrary ? (
                <label>
                  {t("library")}
                  <select
                    required
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  >
                    <option value="">—</option>
                    {library.data?.items
                      .filter((i) => i.outputAsset?.publicUrl)
                      .map((i) => (
                        <option
                          key={i.outputAsset!.publicUrl}
                          value={i.outputAsset!.publicUrl}
                        >
                          {i.modelId} · {i.id}
                        </option>
                      ))}
                  </select>
                  {library.error && (
                    <small role="alert">{library.error.message}</small>
                  )}
                </label>
              ) : (
                <label>
                  {t("upload")}
                  <input
                    required
                    type="file"
                    accept="video/mp4,video/webm,.mp4,.mov,.webm,.mkv"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setFile(f);
                      setError("");
                      if (!name && f) setName(f.name.replace(/\.[^.]+$/, ""));
                    }}
                  />
                </label>
              )}
              {(useLibrary ? sourceUrl : preview) && (
                <SourcePreview src={useLibrary ? sourceUrl : preview} />
              )}
              {!useLibrary && file && (
                <small>
                  {file.name} · {(file.size / 1048576).toFixed(1)} MiB
                </small>
              )}

              {geminiAvailable && <p>{t("scene.createInfo", { language: t("lang." + (targets[0] || "th")) })}</p>}
            </fieldset>
            {error && (
              <p role="alert">
                {t("errors." + error, { defaultValue: error })}
              </p>
            )}
            <footer>
              <button
                type="button"
                disabled={listening}
                onClick={() => {
                  controller.current?.abort();
                  if (!busy) showForm(false);
                }}
              >
                {t("cancel")}
              </button>
              {geminiAvailable && <button type="submit" value="gemini" className="primary" disabled={busy || !targets.length}>
                {busy && <ProcessingSpinner />} {t(listening ? "scene.working" : "scene.create")}
              </button>}
              <button type="submit" value="manual" disabled={busy || !targets.length} className={geminiAvailable ? undefined : "primary"}>
                {t(geminiAvailable ? "scene.createManual" : "create")}
              </button>
            </footer>
          </form>
        </Dialog>
      )}
      {error && !form && !editing && !deleting && <p role="alert">{error}</p>}
      {projects.isPending ? (
        <ProcessingSpinner />
      ) : projects.error ? (
        <p role="alert">{projects.error.message}</p>
      ) : (
        <div className={grid ? "dub-projects grid" : "dub-projects"}>
          {projects.data.pages
            .flatMap((p) => p.items)
            .map((p) => {
              const operation =
                p.operations?.find((o) => o.status === "running") ??
                p.operations?.at(-1);
              const processing =
                operation &&
                ["running", "failed", "interrupted"].includes(operation.status);
              return (
                <article key={p.id}>
                  {!p.deletionPending && p.posterUrl && (
                    <img loading="lazy" src={p.posterUrl} alt="" />
                  )}
                  <div>
                    {p.deletionPending ? <strong>{p.name}</strong> : <Link to={"projects/" + p.id}>{p.name}</Link>}
                    <small>
                      {timeLabel(p.durationMs || 0)} ·{" "}
                      {t("lang." + p.sourceLanguage)} →{" "}
                      {p.targetLanguages.map((l) => t("lang." + l)).join(", ")}
                    </small>
                  </div>
                  <span>
                    {p.deletionPending ? t("deletePending") : processing
                      ? t(
                          operation.kind === "exports"
                            ? "export"
                            : operation.kind,
                        ) +
                        " · " +
                        t("op." + operation.status)
                      : t("status." + p.status)}
                  </span>
                  <time>{new Date(p.updatedAt).toLocaleDateString()}</time>
                  {!p.deletionPending && p.exports?.at(-1) && (
                    <a href={p.exports.at(-1)!.url} download>
                      {t("download")}
                    </a>
                  )}
                  <details className="dub-project-menu" name="dub-project-actions"
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.open = false;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.currentTarget.open = false;
                        e.currentTarget.querySelector("summary")?.focus();
                      }
                    }}>
                    <summary aria-label={t("editProject") + " · " + p.name} title={t("editProject")}>
                      <MoreHorizontal size={18} aria-hidden="true" />
                    </summary>
                    <div className="dub-project-menu-items" onClick={(event) => {
                      const menu = event.currentTarget.closest("details");
                      if (menu) {
                        menu.open = false;
                        actionsTrigger.current = menu.querySelector("summary");
                        actionsTrigger.current?.focus();
                      }
                    }}>
                    <button
                      disabled={p.deletionPending}
                      onClick={() => {
                        setError("");
                        setEditing({
                          id: p.id,
                          revision: p.revision,
                          name: p.name,
                          languageStyle: p.languageStyle,
                          storyContext: p.storyContext,
                          sourceLanguage: p.sourceLanguage,
                          targetLanguages: p.targetLanguages,
                        });
                      }}
                    >
                      {t("editDetails")}
                    </button>
                    <button
                      disabled={p.deletionPending}
                      onClick={async () => {
                        try {
                          await projectsApi.archive(
                            p.id,
                            p.revision,
                            !p.archived,
                          );
                          await projects.refetch();
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      {t(p.archived ? "restore" : "archive")}
                    </button>
                    <button className="dub-delete-action" disabled={operation?.status === "running"}
                      onClick={() => {
                        setError("");
                        setDeleting({ id: p.id, name: p.name, revision: p.revision });
                      }}>{t("deleteProject")}</button>
                    </div>
                  </details>
                </article>
              );
            })}
          {!projects.data.pages[0].items.length && <p>{t("empty")}</p>}
        </div>
      )}
      {projects.hasNextPage && (
        <button onClick={() => void projects.fetchNextPage()}>
          {t("more")}
        </button>
      )}
    </>
  );
}
