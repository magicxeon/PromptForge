import { useEffect, useState } from "react";
import {
  Sparkles,
  ChevronDown,
  Clock3,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { WorkspaceNavigation } from "../../../app/WorkspaceNavigation";
import { useImageWorkspace } from "../hooks/useImageWorkspace";
import { ImageViewer } from "../../../components/media/ImageViewer";
import { MediaImage } from "../../../components/media/MediaImage";
import { ReferenceEditor } from "../components/ReferenceEditor";
import { PromptEditor } from "../components/PromptEditor";
import { ImageResultActions } from "../components/ImageResultActions";
import {
  ProcessingSpinner,
  useActor,
  GenerationModelPicker,
  type HistoryItem,
} from "../../../lib/canonical";
import { referenceUrl } from "../state/imageDraft";

const oldUrl = (path: string) =>
  `${location.protocol}//${location.hostname}:6500${path}`;
export function ImageWorkspace() {
  const { identityScope } = useActor();
  const workspace = useImageWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { draft, setDraft, selected, estimate, preview } = workspace;
  const [tab, setTab] = useState<"create" | "results">("create");
  const [selectedResult, selectResult] = useState<HistoryItem | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activity, setActivity] = useState(false);
  const [handoff, setHandoff] = useState<{ prompt?: string; provider?: string; model?: string; ratio?: string; resolution?: string } | null>(location.state?.identityScope === identityScope ? location.state?.imageSettings || null : null);
  useEffect(() => {
    if (location.state?.imageSettings) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);
  const label = (value: string | Record<string, string>) =>
    typeof value === "string"
      ? value
      : value[i18n.language] || value.en || Object.values(value)[0];
  useEffect(() => {
    if (!selectedResult && workspace.results[0])
      selectResult(workspace.results[0]);
  }, [workspace.results, selectedResult]);
  const modelOptions = workspace.models.map(({ provider, model }) => ({
    providerId: provider.id, modelId: model.id,
    providerLabel: label(provider.displayName), modelLabel: label(model.displayName),
  }));
  const invalidRatio =
    selected && !selected.model.capabilities.aspectRatios.includes(draft.ratio);
  const invalidResolution =
    selected?.model.capabilities.resolutions?.length &&
    !selected.model.capabilities.resolutions.includes(draft.resolution);
  const promptBudget = preview.data?.promptBudget;
  const update = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));
  const statusText = (status: string) =>
    t(`status_${status}`, { defaultValue: status });
  return (
    <main className={`workspace mobile-${tab}`}>
      <WorkspaceNavigation>
        <button
          className="activity-button"
          onClick={() => setActivity((value) => !value)}
          aria-expanded={activity}
        >
          <Clock3 size={16} />
          {t("jobs")}
          {workspace.jobs.data?.activeCount ? (
            <span className="badge">{workspace.jobs.data.activeCount}</span>
          ) : null}
        </button>
      </WorkspaceNavigation>
      {handoff && <section className="handoff-panel" role="region" aria-label={t("handoffTitle")}>
        <strong>{t("handoffTitle")}</strong><p>{t("handoffSettings")}</p>
        <p>{[handoff.provider, handoff.model, handoff.ratio, handoff.resolution].filter(Boolean).join(" · ")}</p>
        <button onClick={() => { setDraft(value => ({ ...value, ...handoff })); setHandoff(null); }}>{t("replace")}</button>
        <button onClick={() => setHandoff(null)}>{t("cancel")}</button>
      </section>}
      <div className="mobile-tabs">
        <button
          className={tab === "create" ? "selected" : ""}
          onClick={() => setTab("create")}
        >
          {t("create")}
        </button>
        <button
          className={tab === "results" ? "selected" : ""}
          onClick={() => setTab("results")}
        >
          {t("results")}
          {workspace.results.length ? (
            <span className="badge">{workspace.results.length}</span>
          ) : null}
        </button>
      </div>
      {activity && (
        <section className="activity-panel">
          <div className="section-heading">
            <h2>{t("jobs")}</h2>
            <button onClick={() => void workspace.jobs.refetch()}>
              {t("check")}
            </button>
          </div>
          {workspace.jobs.data?.items.map((item) => (
            <article key={item.id}>
              {item.terminal ? (
                <span className="status-dot terminal" />
              ) : (
                <ProcessingSpinner />
              )}
              <div>
                <strong>{item.modelId || item.providerId}</strong>
                <small>{item.id}</small>
              </div>
              <span>{statusText(item.status)}</span>
              {item.progress && (
                <small>
                  {item.progress.completed} / {item.progress.total} ·{" "}
                  {t("failed")}: {item.progress.failed}
                </small>
              )}
              {item.detailHref &&
                item.detailHref.startsWith("/") &&
                !item.detailHref.startsWith("//") && (
                  <a href={oldUrl(item.detailHref)}>{t("details")} ↗</a>
                )}
              {item.error?.message && <p role="alert">{item.error.message}</p>}
            </article>
          ))}
        </section>
      )}
      <div className="workspace-grid">
        <section className="creation-panel" aria-label={t("create")}>
          <div className="creation-heading">
            <div className="eyebrow">MOMELO / {t("preview")}</div>
            <h1>{t("title")}</h1>
            <p>{t("subtitle")}</p>
          </div>
          <div className="model-control">
            <GenerationModelPicker options={modelOptions}
              providerId={draft.provider} modelId={draft.model}
              onChange={({ providerId, modelId }) => setDraft(value => ({
                ...value, provider: providerId, model: modelId,
              }))} />
            {workspace.catalog.isError && (
              <button onClick={() => void workspace.catalog.refetch()}>
                {t("retry")}
              </button>
            )}
          </div>
          <PromptEditor value={draft.prompt} onChange={value => update("prompt", value)}
            hardLimit={promptBudget?.hardLimit} />
          <ReferenceEditor
            inspect={(ref) => {
              selectResult({
                id: ref.id,
                prompt: ref.name,
                imageUrl: referenceUrl(ref)!,
                timestamp: Date.now(),
                provider: "",
                submodel: t(ref.role),
                mode: "normal",
                referencedFaceJobIds: [],
                referencedStyleJobIds: [],
                referencedCharacterJobIds: [],
                referencedOutfitJobIds: [],
              });
              setTab("results");
            }}
            references={draft.references}
            max={selected?.model.capabilities.maxReferenceImages || 0}
            supported={selected?.model.capabilities.imageReferences || false}
            upload={(file, role) => void workspace.upload(file, role)}
            remove={(id) =>
              setDraft((value) => ({
                ...value,
                references: value.references.filter((ref) => ref.id !== id),
              }))
            }
          />
          <div className="settings-grid">
            <label>
              {t("ratio")}
              <select
                aria-invalid={Boolean(invalidRatio)}
                value={draft.ratio}
                onChange={(e) => update("ratio", e.target.value)}
              >
                {invalidRatio && (
                  <option value={draft.ratio}>
                    {draft.ratio} — {t("invalidSize")}
                  </option>
                )}
                {selected?.model.capabilities.aspectRatios.map((ratio) => (
                  <option key={ratio}>{ratio}</option>
                ))}
              </select>
            </label>
            {!!selected?.model.capabilities.resolutions?.length && (
              <label>
                {t("resolution")}
                <select
                  aria-invalid={Boolean(invalidResolution)}
                  value={draft.resolution}
                  onChange={(e) => update("resolution", e.target.value)}
                >
                  {invalidResolution && (
                    <option value={draft.resolution}>
                      {draft.resolution || "—"} — {t("invalidSize")}
                    </option>
                  )}
                  {selected.model.capabilities.resolutions.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              {t("count")}
              <select
                value={draft.count}
                onChange={(e) => update("count", Number(e.target.value))}
              >
                {[1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <details className="advanced">
            <summary>
              {t("advanced")}
              <ChevronDown size={16} />
            </summary>
            <label>
              {t("negative")}
              <textarea
                rows={3}
                value={draft.negative}
                onChange={(e) => update("negative", e.target.value)}
              />
            </label>
          </details>
          {(workspace.error ||
            workspace.incompatible ||
            preview.isError ||
            workspace.processing.isError ||
            (workspace.processing.data && !workspace.processingAccepted) ||
            promptBudget?.status === "over_limit") && (
            <div className="inline-error" role="alert">
              {workspace.error ||
                (workspace.incompatible
                  ? t("invalid")
                  : promptBudget?.status === "over_limit"
                    ? t("promptLimit")
                    : workspace.processing.isError ||
                        (workspace.processing.data &&
                          !workspace.processingAccepted)
                      ? t("processingError")
                      : t("previewUnavailable"))}
            </div>
          )}
          {workspace.intent && (
            <div className="operation-status" role="status">
              <div>
                {workspace.busy ||
                (!workspace.terminal && !workspace.unresolved) ? (
                  <ProcessingSpinner />
                ) : null}
                <strong>
                  {workspace.unresolved
                    ? t("unknown")
                    : statusText(workspace.status || "queued")}
                </strong>
              </div>
              <small>
                {t("requestId")}: {workspace.intent.requestId}
              </small>
              {workspace.unresolved && (
                <>
                  <button
                    disabled={workspace.checking}
                    onClick={() => void workspace.check()}
                  >
                    {workspace.checking ? t("checking") : t("check")}
                  </button>
                  <small>{t("checkHelp")}</small>
                </>
              )}
              {workspace.group.data?.children
                .filter((child) => child.error)
                .map((child) => (
                  <p key={child.jobId}>
                    {child.jobId}:{" "}
                    {typeof child.error === "string"
                      ? child.error
                      : child.error?.message}
                  </p>
                ))}
              {workspace.job.data?.error && (
                <p>
                  {typeof workspace.job.data.error === "string"
                    ? workspace.job.data.error
                    : workspace.job.data.error.message}
                </p>
              )}
              <button
                onClick={() => {
                  setActivity(true);
                }}
              >
                {t("viewProgress")}
              </button>
            </div>
          )}
          <footer className="generate-bar">
            {workspace.creditsEnabled && <div className="quote-line">
              {estimate.isError ||
              (estimate.data &&
                !workspace.quoteCurrent &&
                !estimate.isFetching) ? (
                <button onClick={() => void estimate.refetch()}>
                  {t("quoteError")}
                </button>
              ) : workspace.quoteCurrent ? (
                <>
                  <strong>
                    {t("estimate", {
                      count: estimate.data?.estimate.estimatedCredits || 0,
                    })}
                  </strong>
                  {estimate.data?.account.canAfford === false && (
                    <span className="danger">{t("insufficient")}</span>
                  )}
                </>
              ) : (
                <span>
                  {draft.prompt.trim() ? t("estimating") : t("noPrompt")}
                </span>
              )}
            </div>}
            <button
              className="primary-button"
              disabled={!workspace.canGenerate}
              onClick={() => void workspace.generate()}
            >
              {workspace.busy ? <ProcessingSpinner /> : <Sparkles size={18} />}{" "}
              {t("generate")}
            </button>
          </footer>
        </section>
        <section className="results-panel" aria-label={t("results")}>
          <ImageViewer item={selectedResult} />
          {selectedResult && <ImageResultActions key={selectedResult.id} item={selectedResult}
            onPrompt={prompt => { update("prompt", prompt); setTab("create"); }}
            onReference={(item, role) => { workspace.useReference(item, role); setTab("create"); }} />}
          {galleryOpen && selectedResult && <ImageViewer item={selectedResult} initialExpanded
            gallery={workspace.results} onSelect={selectResult} onExpandedClose={() => setGalleryOpen(false)}
            loadMore={workspace.history.hasNextPage ? () => void workspace.history.fetchNextPage() : undefined}
            loadingMore={workspace.history.isFetchingNextPage}
            galleryError={workspace.history.isError ? t("historyError") : undefined}
            footer={<ImageResultActions key={selectedResult.id} item={selectedResult}
              onPrompt={prompt => { update("prompt", prompt); setGalleryOpen(false); setTab("create"); }}
              onReference={(item, role) => { workspace.useReference(item, role); setGalleryOpen(false); setTab("create"); }} />} />}
          <section className="recent-panel">
            <div className="section-heading">
              <h2>{t("recent")}</h2>
              <button onClick={() => void workspace.history.refetch()}>
                {t("check")}
              </button>
            </div>
            <div className="recent-grid">
              {workspace.results.map((item) => (
                <button
                  key={item.id}
                  className={`result-thumb ${selectedResult?.id === item.id ? "selected" : ""}`}
                  onClick={() => { selectResult(item); setGalleryOpen(true); }}
                  aria-label={`${item.submodel} ${new Date(item.timestamp).toLocaleString(i18n.language)}`}
                >
                  <MediaImage
                    src={item.thumbnailUrl || item.imageUrl}
                    alt={item.submodel}
                    loading="lazy"
                  />
                  <span>{item.submodel}</span>
                </button>
              ))}
            </div>
            {workspace.history.isError && (
              <p role="alert">{t("historyError")}</p>
            )}
            {!workspace.results.length && (
              <p className="muted">{t("noHistory")}</p>
            )}
            {workspace.history.hasNextPage && (
              <button
                disabled={workspace.history.isFetchingNextPage}
                onClick={() => void workspace.history.fetchNextPage()}
              >
                {t("loadMore")}
              </button>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
