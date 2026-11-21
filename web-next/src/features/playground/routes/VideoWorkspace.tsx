import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock3, Film, Sparkles } from "lucide-react";
import { WorkspaceNavigation } from "../../../app/WorkspaceNavigation";
import {
  useActor,
  ProcessingSpinner,
  GenerationModelPicker,
  type HistoryItem,
} from "../../../lib/canonical";
import { VideoViewer } from "../../../components/media/VideoViewer";
import { MediaImage } from "../../../components/media/MediaImage";
import { PromptEditor } from "../components/PromptEditor";
import { VideoSources } from "../components/VideoSources";
import { useVideoWorkspace } from "../hooks/useVideoWorkspace";
import {
  exactDurationRange,
  terminalVideoStates,
  videoReferencePlan,
  videoSourceUrl,
  type VideoDraft,
  type VideoSource,
} from "../state/videoDraft";
import { outputStorageKey } from "../state/imageDraft";
import type { VideoTask } from "../../../../../web/src/features/generation/schemas/videoGenerationSchemas";
import { listTrustedVideoSources } from "../../../../../web/src/features/generation/api/trustedVideoSources";

const sourceAuthority = (source: VideoSource) =>
  JSON.stringify([
    source.kind,
    source.storageKey,
    source.generationId,
    source.assetId,
    source.characterProfileId,
    source.characterProfileVersionId,
    source.lookId,
    source.lookVersionId,
    source.policyVersion,
    source.generated,
  ]);

export function VideoWorkspace() {
  const { identityScope } = useActor();
  const w = useVideoWorkspace();
  const { t } = useTranslation("video");
  const { draft, model } = w;
  const location = useLocation(),
    navigate = useNavigate();
  const [tab, setTab] = useState<"create" | "results">("create");
  const [activity, setActivity] = useState(false);
  const [selected, setSelected] = useState<VideoTask | null>(null);
  const [replacement, setReplacement] = useState<{
    patch: Partial<VideoDraft>;
    fields: string[];
  } | null>(null);
  const [handoffError, setHandoffError] = useState("");
  const handled = useRef("");
  const replacementTrigger = useRef<HTMLElement | null>(null);
  const fieldLabels: Record<keyof VideoDraft, string> = {
    providerModelKey: t("model"),
    operation: t("mode"),
    prompt: t("prompt"),
    sources: t("references"),
    duration: t("duration"),
    aspectRatio: t("ratio"),
    resolution: t("resolution"),
    audioMode: t("audio"),
  };
  const range = exactDurationRange(model);
  const update = <K extends keyof VideoDraft>(key: K, value: VideoDraft[K]) =>
    w.setDraft((current) => ({ ...current, [key]: value }));
  const inputModes = model?.inputModes || [];
  const modes = [
    ...(inputModes.includes("text_to_video") ? ["text_to_video" as const] : []),
    ...(inputModes.includes("image_to_video") ||
    inputModes.includes("multimodal_reference")
      ? ["image_to_video" as const]
      : []),
    ...(inputModes.includes("multimodal_reference")
      ? ["character_to_video" as const]
      : []),
  ];
  useEffect(() => {
    const handoff = location.state?.handoff as
      { kind?: string; item?: HistoryItem } | undefined;
    if (handoff && location.state?.identityScope !== identityScope) {
      navigate(location.pathname, { replace: true, state: null });
      return;
    }
    if (
      !handoff?.item ||
      handoff.kind !== "image" ||
      !model ||
      handled.current === location.key
    )
      return;
    let cancelled = false;
    const item = handoff.item;
    void (async () => {
      try {
        if (!modes.includes("image_to_video")) throw new Error("mode");
        const storageKey = outputStorageKey(item.imageUrl);
        let policyVersion: string | undefined;
        if (
          model.playgroundReferencePolicy?.kind === "trusted_generated_only" &&
          !model.playgroundReferencePolicy.allowImageReferenceUploads
        ) {
          const sources = await listTrustedVideoSources();
          const trusted = sources.items.find(
            (source) =>
              source.id === item.id &&
              source.eligible &&
              source.policyVersion === model.playgroundReferencePolicy?.version,
          );
          if (!trusted) throw new Error("source");
          policyVersion = trusted.policyVersion;
        }
        if (cancelled) return;
        const patch: Partial<VideoDraft> = {
          operation: "image_to_video",
          sources: [
            {
              id: crypto.randomUUID(),
              generationId: item.id,
              storageKey,
              policyVersion,
              name: "",
              kind: "image",
              generated: true,
              status: "ready",
            },
          ],
        };
        setReplacement({ patch, fields: [t("mode"), t("references")] });
      } catch {
        if (!cancelled) setHandoffError(t("handoffUnavailable"));
      } finally {
        if (!cancelled) {
          handled.current = location.key;
          navigate(location.pathname, { replace: true, state: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.key, model?.modelId]);
  const task = w.task.data;
  const busyTask =
    task &&
    !terminalVideoStates.has(task.status) &&
    task.automaticMonitoring !== false &&
    !(
      task.recovery?.deadlineAt && Date.parse(task.recovery.deadlineAt) <= w.now
    );
  const sourceIssues =
    task?.providerError?.referenceIssues ||
    (task?.providerError?.referenceIssue
      ? [task.providerError.referenceIssue]
      : []);
  const submittedDraft =
    w.intent?.taskId === task?.id ? w.intent?.snapshot : null;
  const submittedModel =
    w.catalog.data?.models.find(
      (item) =>
        `${item.providerId}:${item.modelId}` ===
        submittedDraft?.providerModelKey,
    ) || null;
  const submittedSources = submittedDraft
    ? videoReferencePlan(submittedDraft, submittedModel).references.map(
        (reference) =>
          submittedDraft.sources.find((source) =>
            reference.generationId
              ? source.generationId === reference.generationId
              : reference.referenceImageUrl === videoSourceUrl(source),
          ),
      )
    : [];
  const rejectedIds = sourceIssues.flatMap((issue) => {
    const submittedSource = submittedSources[issue.referenceIndex];
    if (!submittedSource) return [];
    return draft.sources
      .filter(
        (source) =>
          sourceAuthority(source) === sourceAuthority(submittedSource),
      )
      .map((source) => source.id);
  });
  const status = (value: string) =>
    t(`status_${value}`, { defaultValue: t("status_unknown") });
  function reuseTask(value: VideoTask) {
    replacementTrigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (w.intent?.taskId === value.id) {
      setReplacement({
        patch: w.intent.snapshot,
        fields: [
          t("model"),
          t("mode"),
          t("prompt"),
          t("references"),
          t("duration"),
          t("ratio"),
          t("resolution"),
          t("audio"),
        ],
      });
      return;
    }
    const snapshot = value.submittedRequest;
    const patch: Partial<VideoDraft> = {};
    const fields: string[] = [];
    if (value.providerId && value.modelId) {
      patch.providerModelKey = `${value.providerId}:${value.modelId}`;
      fields.push(t("model"));
    }
    if (snapshot?.durationSeconds) {
      patch.duration = String(
        snapshot.plannedDurationSeconds || snapshot.durationSeconds,
      );
      fields.push(t("duration"));
    }
    if (snapshot?.aspectRatio) {
      patch.aspectRatio = snapshot.aspectRatio;
      fields.push(t("ratio"));
    }
    if (snapshot?.resolution) {
      patch.resolution = snapshot.resolution;
      fields.push(t("resolution"));
    }
    if (snapshot?.audioMode === "none" || snapshot?.audioMode === "generated") {
      patch.audioMode = snapshot.audioMode;
      fields.push(t("audio"));
    }
    setReplacement({ patch, fields });
  }
  return (
    <main className={`workspace video-workspace mobile-${tab}`}>
      <WorkspaceNavigation>
        <button
          className="activity-button"
          aria-expanded={activity}
          onClick={() => setActivity((value) => !value)}
        >
          <Clock3 size={16} />
          {t("activity")}
        </button>
      </WorkspaceNavigation>
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
          {t("results")} <span className="badge">{w.results.length}</span>
        </button>
      </div>
      {activity && (
        <section className="activity-panel" aria-label={t("activity")}>
          <h2>{t("activity")}</h2>
          {w.intent && w.intent.status !== "accepted" && (
            <div>
              <span>{t(w.intent.status)}</span>
              <code>{w.intent.requestId}</code>
              <button
                onClick={() => void w.checkStatus()}
                disabled={w.checking}
              >
                {t("checkStatus")}
              </button>
            </div>
          )}
          {w.allTasks.map((item) => (
            <div key={item.id}>
              <span>
                {item.modelId} · {status(item.status)}
              </span>
              <code>{item.id}</code>
              {item.providerError?.code && (
                <span>{item.providerError.code}</span>
              )}
              <button onClick={() => w.setTaskId(item.id)}>
                {t("inspectTask")}
              </button>
            </div>
          ))}
          {w.jobs.data?.items
            .filter(
              (item) =>
                item.mediaType === "video" &&
                !w.allTasks.some((taskItem) => taskItem.id === item.id),
            )
            .map((item) => (
              <div key={item.id}>
                <span>
                  {item.modelId} · {status(item.status)}
                </span>
                <code>{item.id}</code>
                <button onClick={() => w.setTaskId(item.id)}>
                  {t("inspectTask")}
                </button>
              </div>
            ))}
          {w.recent.isError && (
            <p role="alert">
              {t("activityError")}{" "}
              <button onClick={() => void w.recent.refetch()}>
                {t("retry")}
              </button>
            </p>
          )}
          {!w.allTasks.length && !w.intent && <p>{t("noActivity")}</p>}
        </section>
      )}
      <div className="video-workspace-grid">
        <section className="video-editor" aria-label={t("create")}>
          <div className="section-heading">
            <h1>{t("title")}</h1>
            <Film size={20} />
          </div>
          {w.catalog.isPending && (
            <p role="status">
              <ProcessingSpinner className="small-spinner" />
              {t("loading")}
            </p>
          )}
          {w.catalog.isError && (
            <p role="alert">
              {t("catalogError")}{" "}
              <button onClick={() => void w.catalog.refetch()}>
                {t("retry")}
              </button>
            </p>
          )}
          <GenerationModelPicker
            providerId={model?.providerId || ""}
            modelId={model?.modelId || ""}
            options={(w.catalog.data?.models || []).map((item) => ({
              providerId: item.providerId,
              modelId: item.modelId,
              providerLabel: item.providerId,
              modelLabel: item.displayName,
            }))}
            onChange={(value) =>
              update("providerModelKey", `${value.providerId}:${value.modelId}`)
            }
          />
          <label>
            {t("mode")}
            <select
              value={draft.operation}
              onChange={(event) =>
                update(
                  "operation",
                  event.target.value as VideoDraft["operation"],
                )
              }
            >
              {!modes.includes(draft.operation) && (
                <option value={draft.operation}>
                  {t(draft.operation)} — {t("unavailable")}
                </option>
              )}
              {modes.map((mode) => (
                <option value={mode} key={mode}>
                  {t(mode)}
                </option>
              ))}
            </select>
          </label>
          <PromptEditor
            value={draft.prompt}
            onChange={(value) => update("prompt", value)}
            hardLimit={w.catalog.data?.promptMaximumCharacters}
          />
          {model && draft.operation !== "text_to_video" && (
            <VideoSources
              draft={draft}
              model={model}
              onChange={(sources) => update("sources", sources)}
              upload={w.upload}
              remove={w.removeSource}
              rejectedIds={rejectedIds}
            />
          )}
          {model && (
            <div className="video-settings">
              <label className="video-duration">
                {t("duration")}
                {range ? (
                  <div className="video-duration-inputs">
                    <input
                      aria-label={t("durationSlider")}
                      type="range"
                      min={range.min}
                      max={range.max}
                      step={1}
                      value={draft.duration}
                      onChange={(event) =>
                        update("duration", event.target.value)
                      }
                    />
                    <input
                      aria-label={t("durationNumber")}
                      type="number"
                      min={range.min}
                      max={range.max}
                      step={1}
                      value={draft.duration}
                      onChange={(event) =>
                        update("duration", event.target.value)
                      }
                    />
                  </div>
                ) : (
                  <select
                    aria-label={t("duration")}
                    value={draft.duration}
                    onChange={(event) => update("duration", event.target.value)}
                  >
                    {!model.durations.includes(Number(draft.duration)) && (
                      <option value={draft.duration}>
                        {draft.duration || "—"}
                      </option>
                    )}
                    {model.durations.map((value) => (
                      <option key={value} value={value}>
                        {value} {t("seconds")}
                      </option>
                    ))}
                  </select>
                )}
                {!model.durations.includes(Number(draft.duration)) && (
                  <span className="field-error" role="alert">
                    {t("invalidDuration")}
                  </span>
                )}
                {model.durationControlMode === "prompted" && (
                  <small>{t("promptedDuration")}</small>
                )}
              </label>
              <label>
                {t("ratio")}
                <select
                  value={draft.aspectRatio}
                  onChange={(event) =>
                    update("aspectRatio", event.target.value)
                  }
                >
                  {!model.aspectRatios.includes(draft.aspectRatio) && (
                    <option value={draft.aspectRatio}>
                      {draft.aspectRatio || "—"} — {t("unavailable")}
                    </option>
                  )}
                  {model.aspectRatios.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              {model.resolutions.length > 0 && (
                <label>
                  {t("resolution")}
                  <select
                    value={draft.resolution}
                    onChange={(event) =>
                      update("resolution", event.target.value)
                    }
                  >
                    {!model.resolutions.includes(draft.resolution) && (
                      <option value={draft.resolution}>
                        {draft.resolution || "—"} — {t("unavailable")}
                      </option>
                    )}
                    {model.resolutions.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              )}
              {model.audioModes.length > 1 && (
                <label>
                  {t("audio")}
                  <select
                    value={draft.audioMode}
                    onChange={(event) =>
                      update(
                        "audioMode",
                        event.target.value as VideoDraft["audioMode"],
                      )
                    }
                  >
                    {model.audioModes.map((value) => (
                      <option value={value} key={value}>
                        {t(`audio_${value}`)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!model.audioModes.includes(draft.audioMode) && (
                <p role="alert">
                  {t("invalidAudio")}{" "}
                  <button
                    onClick={() =>
                      update("audioMode", model.audioModes[0] || "none")
                    }
                  >
                    {t("useSupportedAudio")}
                  </button>
                </p>
              )}
            </div>
          )}
          {handoffError && <p role="alert">{handoffError}</p>}
          <div className="video-submit">
            {w.creditsEnabled && w.quote.isFetching && (
              <p role="status">
                <ProcessingSpinner className="small-spinner" />
                {t("quoting")}
              </p>
            )}
            {w.quoteReady && (
              <p>
                {t(
                  w.quote.data?.estimate.chargeMode === "actual_usage"
                    ? "maximumCredits"
                    : "credits",
                  { count: w.quote.data?.estimate.estimatedCredits },
                )}
              </p>
            )}
            {w.creditsEnabled && w.quote.data?.durationReconciliation && (
              <p className="muted">
                {t("durationPlan", {
                  requested:
                    w.quote.data.durationReconciliation.plannedDurationSeconds,
                  rendered:
                    w.quote.data.durationReconciliation.renderDurationSeconds,
                })}
              </p>
            )}
            {w.creditsEnabled && w.quote.isError && (
              <p role="alert">
                {w.quote.error instanceof Error
                  ? w.quote.error.message
                  : t("quoteError")}{" "}
                <button onClick={() => void w.quote.refetch()}>
                  {t("retry")}
                </button>
              </p>
            )}
            {w.creditsEnabled && w.quote.data &&
              !w.quote.isFetching &&
              !w.quoteReady &&
              w.valid && (
                <button onClick={() => void w.quote.refetch()}>
                  {t("refreshQuote")}
                </button>
              )}
            {!w.valid && draft.prompt && (
              <p role="status">{t("invalidSettings")}</p>
            )}
            {w.creditsEnabled && w.quote.data && !w.quote.data.account.canAfford && (
              <p role="alert">{t("insufficientCredits")}</p>
            )}
            <button
              className="primary-button"
              disabled={!w.canGenerate || w.consent.awaitingConfirmation}
              onClick={() => void w.generate()}
            >
              {w.busy ? (
                <ProcessingSpinner className="small-spinner" />
              ) : (
                <Sparkles size={17} />
              )}
              {t(w.busy ? "submitting" : "generate")}
            </button>
            {w.error && <p role="alert">{w.error}</p>}
            {w.intent && w.intent.status !== "accepted" && (
              <p role="status">
                {t(w.intent.status)}{" "}
                <button
                  disabled={w.checking}
                  onClick={() => void w.checkStatus()}
                >
                  {t("checkStatus")}
                </button>
              </p>
            )}
            {task && (
              <div className="video-task-state" role="status">
                {busyTask && <ProcessingSpinner className="small-spinner" />}
                <span>{status(task.status)}</span>
                <code>{task.id}</code>
                {task.providerError?.code && <p>{task.providerError.code}</p>}
                <button
                  disabled={
                    w.checking ||
                    (!!task.recovery?.explicitNextCheckAt &&
                      Date.parse(task.recovery.explicitNextCheckAt) > w.now)
                  }
                  onClick={() => void w.checkStatus()}
                >
                  {t(w.checking ? "checking" : "checkStatus")}
                </button>
              </div>
            )}
            {w.task.isError && (
              <p role="alert">
                {t("checkError")}{" "}
                <button onClick={() => void w.checkStatus()}>
                  {t("checkStatus")}
                </button>
              </p>
            )}
          </div>
        </section>
        <section className="video-results" aria-label={t("results")}>
          {selected ? (
            <>
              <VideoViewer key={selected.id} task={selected} />
              <button onClick={() => reuseTask(selected)}>
                {t("reuseSettings")}
              </button>
            </>
          ) : (
            <div className="video-empty">
              <Film size={36} />
              <h2>{t("readyToCreate")}</h2>
              <p>{t(w.results.length ? "chooseResult" : "emptyResults")}</p>
            </div>
          )}
          <div className="section-heading">
            <h2>{t("recent")}</h2>
            <a
              href={`${window.location.protocol}//${window.location.hostname}:6500/playground?media=video`}
            >
              {t("allHistory")}
            </a>
          </div>
          <p className="muted">{t("recentHelp")}</p>
          {w.results.length > 0 && !selected && (
            <p role="status">{t("newResults")}</p>
          )}
          <div className="video-recent">
            {w.results.map((item) => (
              <button
                key={item.id}
                className={selected?.id === item.id ? "selected" : ""}
                onClick={() => setSelected(item)}
              >
                <div>
                  {item.outputAsset?.posterUrl ? (
                    <MediaImage
                      src={item.outputAsset.posterUrl}
                      alt={item.modelId || t("videoPlayer")}
                    />
                  ) : (
                    <Film size={28} />
                  )}
                </div>
                <span>{item.modelId}</span>
                <small>
                  {item.outputAsset?.durationSeconds || item.durationSeconds}{" "}
                  {t("seconds")}
                </small>
              </button>
            ))}
          </div>
          {w.recent.isPending && (
            <p role="status">
              <ProcessingSpinner className="small-spinner" />
              {t("loading")}
            </p>
          )}
          {w.recent.isError && (
            <p role="alert">
              {t("resultsError")}{" "}
              <button onClick={() => void w.recent.refetch()}>
                {t("retry")}
              </button>
            </p>
          )}
        </section>
      </div>
      {w.creditsEnabled && w.consent.dialog}
      <Dialog.Root
        open={!!replacement}
        onOpenChange={(open) => {
          if (!open) setReplacement(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="video-dialog"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const target = replacementTrigger.current?.isConnected
                ? replacementTrigger.current
                : document.querySelector<HTMLElement>(".video-editor button");
              target?.focus({ preventScroll: true });
            }}
          >
            <Dialog.Title>{t("replaceDraft")}</Dialog.Title>
            <Dialog.Description>{t("replaceHelp")}</Dialog.Description>
            <ul>
              {replacement &&
                (Object.keys(replacement.patch) as (keyof VideoDraft)[])
                  .filter(
                    (key) =>
                      JSON.stringify(replacement.patch[key]) !==
                      JSON.stringify(draft[key]),
                  )
                  .map((key) => <li key={key}>{fieldLabels[key]}</li>)}
            </ul>
            <div className="video-source-actions">
              <Dialog.Close asChild>
                <button>{t("cancel")}</button>
              </Dialog.Close>
              <button
                onClick={() => {
                  if (replacement)
                    w.setDraft((value) => ({ ...value, ...replacement.patch }));
                  setReplacement(null);
                }}
              >
                {t("confirmReplace")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
