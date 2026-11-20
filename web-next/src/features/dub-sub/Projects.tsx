import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { listRecentVideoTasks } from "../../../../web/src/features/generation/api/videoGenerationApi";
import { Dialog } from "./Dialog";
import {
  useActor,
  ProcessingSpinner,
  pollingPolicy,
} from "../../lib/canonical";
import { projectsApi, timeLabel } from "./projectApi";
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
    { identityScope } = useActor(),
    nav = useNavigate(),
    client = useQueryClient();
  const [form, showForm] = useState(false),
    [grid, setGrid] = useState(false);
  const [context, setContext] = useState<LanguageContext>(emptyContext);
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
  const [asr, setAsr] = useState(false),
    [archived, setArchived] = useState(false);
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
    if (busy) return;
    setError("");
    setBusy(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const id =
        pendingProject.current ??
        (
          await projectsApi.create({
            name: name.trim(),
            ...context,
            sourceLanguage: source,
            targetLanguages: targets,
            ...(useLibrary ? { sourceUrl } : {}),
          })
        ).id;
      pendingProject.current = id;
      if (!useLibrary && file) await projectsApi.upload(id, file, abort.signal);
      await client.invalidateQueries({
        queryKey: ["dub-projects", identityScope],
      });
      nav("/dub-sub/projects/" + id, { state: { startTranscription: asr } });
    } catch (err) {
      if (!abort.signal.aborted)
        setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setBusy(false);
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
          onClick={() => {
            pendingProject.current = null;
            setContext(emptyContext);
            setName("");
            setFile(null);
            setSourceUrl("");
            setLibrary(false);
            setSource("auto");
            setTargets(["th"]);
            setAsr(false);
            setError("");
            showForm(true);
          }}
        >
          {t("create")}
        </button>
      </header>
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

              <label className="dub-inline">
                <input
                  type="checkbox"
                  checked={asr}
                  onChange={(e) => setAsr(e.target.checked)}
                />
                {t("transcribe")}
              </label>
            </fieldset>
            {error && (
              <p role="alert">
                {t("errors." + error, { defaultValue: error })}
              </p>
            )}
            <footer>
              <button
                type="button"
                onClick={() => {
                  controller.current?.abort();
                  if (!busy) showForm(false);
                }}
              >
                {t("cancel")}
              </button>
              <button disabled={busy || !targets.length} className="primary">
                {busy ? <ProcessingSpinner /> : t("create")}
              </button>
            </footer>
          </form>
        </Dialog>
      )}
      {error && !form && !editing && <p role="alert">{error}</p>}
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
                  {p.posterUrl && (
                    <img loading="lazy" src={p.posterUrl} alt="" />
                  )}
                  <div>
                    <Link to={"projects/" + p.id}>{p.name}</Link>
                    <small>
                      {timeLabel(p.durationMs || 0)} ·{" "}
                      {t("lang." + p.sourceLanguage)} →{" "}
                      {p.targetLanguages.map((l) => t("lang." + l)).join(", ")}
                    </small>
                  </div>
                  <span>
                    {processing
                      ? t(
                          operation.kind === "exports"
                            ? "export"
                            : operation.kind,
                        ) +
                        " · " +
                        t("op." + operation.status)
                      : t("status." + p.status)}
                  </span>
                  <details>
                    <summary aria-label={t("editProject")}>⋯</summary>
                    <button
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
                  </details>
                  <time>{new Date(p.updatedAt).toLocaleDateString()}</time>
                  {p.exports?.at(-1) && (
                    <a href={p.exports.at(-1)!.url} download>
                      {t("download")}
                    </a>
                  )}
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
