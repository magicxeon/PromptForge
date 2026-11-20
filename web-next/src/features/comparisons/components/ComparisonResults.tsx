import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Expand, Trophy } from "lucide-react";
import { MediaImage } from "../../../components/media/MediaImage";
import { ImageViewer } from "../../../components/media/ImageViewer";
import { GenerationResultMetadata } from "../../../../../web/src/components/generation/GenerationResultMetadata";
import { ComparisonExportDialog } from "../../../../../web/src/components/media/ComparisonExportDialog";
import { DetailCompare } from "./DetailCompare";
import {
  useActor,
  ProcessingSpinner,
  type HistoryItem,
} from "../../../lib/canonical";
import type {
  ComparisonSet,
  ComparisonSlot,
} from "../../../../../web/src/features/comparisons/schemas/comparisonSchemas";

export function comparisonImage(
  slot: ComparisonSlot,
  prompt: string,
  timestamp: number,
): HistoryItem | null {
  if (slot.status !== "completed" || !slot.result?.imageUrl || !slot.jobId)
    return null;
  return {
    id: slot.jobId,
    imageUrl: slot.result.imageUrl,
    thumbnailUrl: slot.thumbnailUrl || undefined,
    prompt: slot.submittedPrompt || prompt,
    provider: slot.provider,
    submodel: slot.model,
    timestamp,
    mode: "normal",
    width: slot.result.width || undefined,
    height: slot.result.height || undefined,
    referencedFaceJobIds: [],
    referencedStyleJobIds: [],
    referencedCharacterJobIds: [],
    referencedOutfitJobIds: [],
  };
}
export function ComparisonResults({
  set,
  saving,
  editSet,
  inspect,
  inspected,
  historyView = false,
}: {
  set?: ComparisonSet;
  saving: boolean;
  editSet: (action: "name" | "winner", value: string | null) => Promise<void>;
  inspect: (item: HistoryItem | null) => void;
  inspected: HistoryItem | null;
  historyView?: boolean;
}) {
  const { t, i18n } = useTranslation("comparison");
  const { identityScope } = useActor();
  const { t: common } = useTranslation();
  const navigate = useNavigate();
  const [runId, chooseRun] = useState("");
  const [name, setName] = useState("");
  const [layout, setLayout] = useState("side_by_side");
  useEffect(() => {
    chooseRun("");
    setName(set?.name || "");
  }, [set?.id]);
  const runs = [...(set?.runs || [])].sort((a, b) => b.createdAt - a.createdAt);
  const run = runs.find((item) => item.id === runId) || runs[0];
  const label = (
    name: string | Record<string, string> | undefined,
    fallback: string,
  ) =>
    typeof name === "string"
      ? name
      : name?.[i18n.language] || name?.en || fallback;
  const exportItems =
    run?.slots
      .filter((slot) => comparisonImage(slot, run.sourcePrompt, run.createdAt))
      .map((slot) => ({
        id: slot.jobId!,
        provider: label(slot.providerDisplayName, slot.provider),
        model: label(slot.modelDisplayName, slot.model),
      })) || [];
  const detailImages = run?.slots.flatMap(slot => {
    const image = comparisonImage(slot, run.sourcePrompt, run.createdAt);
    return image ? [{ ...image, submodel: label(slot.modelDisplayName, slot.model) }] : [];
  }) || [];
  const settings = set && (
        <section className="comparison-run-heading">
          <label>
            {t("name")}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
            />
          </label>
          <button
            disabled={saving || !name.trim() || name === set.name}
            onClick={() => void editSet("name", name.trim())}
          >
            {t("saveName")}
          </button>
          {runs.length > 1 && (
            <label>
              {t("run")}
              <select
                value={run?.id || ""}
                onChange={(event) => chooseRun(event.target.value)}
              >
                {runs.map((item) => (
                  <option value={item.id} key={item.id}>
                    {new Date(item.createdAt).toLocaleString()} ·{" "}
                    {common(`status_${item.status}`, {
                      defaultValue: item.status,
                    })}
                  </option>
                ))}
              </select>
            </label>
          )}
          {historyView && run && (
            <label className="comparison-history-layout">
              {t("viewLayout")}
              <select value={layout} onChange={(event) => setLayout(event.target.value)}>
                <option value="side_by_side">{t("sideBySide")}</option>
                <option value="stacked">{t("stacked")}</option>
              </select>
            </label>
          )}
        </section>
  );
  const options = <details className="history-view-options">
    <summary>{t("viewOptions")}</summary>
    {settings}
  </details>;
  return (
    <>
      {!historyView && settings}
      {historyView && !run && options}
      {run ? (
        <>
          <div className="comparison-detail-toolbar">
            <span>
              {new Date(run.createdAt).toLocaleString(
                i18n.language === "th" ? "th-TH" : "en-US",
              )}
            </span>
            {historyView && <small role="status">
              {common(`status_${run.status}`, { defaultValue: run.status })} · {detailImages.length}/{run.slots.length}
            </small>}
            <div className="comparison-toolbar-actions">
            {detailImages.length >= 2 && <DetailCompare key={run.id} items={detailImages} />}
            {set && exportItems.length >= 2 && (
              <ComparisonExportDialog
                key={`${identityScope}:${set.id}:${run.id}`}
                request={{
                  kind: "comparison",
                  setId: set.id,
                  runId: run.id,
                  layout: "auto",
                }}
                items={exportItems}
              />
            )}
            {historyView && options}
            </div>
          </div>
          {!historyView && <div className="comparison-run-summary" role="status">
            {common(`status_${run.status}`, { defaultValue: run.status })} ·{" "}
            {t("completedCount", {
              done: run.slots.filter(
                (slot) => slot.status === "completed" && slot.result?.imageUrl,
              ).length,
              total: run.slots.length,
            })}
          </div>}
          <div className="comparison-result-grid" data-layout={historyView ? layout : undefined}
            tabIndex={historyView ? 0 : undefined}
            role={historyView ? "region" : undefined}
            aria-label={historyView ? t("comparisonImages") : undefined}>
            {run.slots.map((slot, index) => {
              const image = comparisonImage(
                slot,
                run.sourcePrompt,
                run.createdAt,
              );
              const pending = !["completed", "failed", "cancelled"].includes(
                slot.status,
              );
              return (
                <article
                  key={slot.id}
                  className={`comparison-result ${image ? "has-image" : "status-only"}`}
                >
                  <header>
                    <strong>{t("slot", { number: index + 1 })}</strong>
                    <span>{label(slot.modelDisplayName, slot.model)}</span>
                  </header>
                  {image ? (
                    <button
                      className="comparison-image"
                      style={historyView && image.width && image.height ? { aspectRatio: `${image.width} / ${image.height}` } : undefined}
                      aria-label={`${common("expand")} ${t("slot", { number: index + 1 })}`}
                      onClick={() => inspect(image)}
                    >
                      <MediaImage
                        src={historyView ? image.imageUrl : slot.thumbnailUrl || image.imageUrl}
                        alt={slot.model}
                      />
                      <Expand size={17} />
                    </button>
                  ) : (
                    <div className="comparison-slot-status" role="status">
                      {pending && <ProcessingSpinner />}
                      <span>
                        {slot.status === "completed"
                          ? t("mediaPending")
                          : common(`status_${slot.status}`, {
                              defaultValue: slot.status,
                            })}
                      </span>
                    </div>
                  )}
                  <small>
                    {label(slot.providerDisplayName, slot.provider)} ·{" "}
                    {label(slot.modelDisplayName, slot.model)}
                  </small>
                  <GenerationResultMetadata
                    status={slot.status}
                    generationDuration={slot.result?.generationDuration}
                    width={slot.result?.width}
                    height={slot.result?.height}
                    requestedAspectRatio={
                      run.configurationSnapshot?.aspectRatio
                    }
                    actualCredit={slot.actualCredit}
                    estimatedCredit={slot.estimatedCredit}
                    mimeType={slot.result?.mimeType}
                  />
                  {slot.error && (
                    <p role="alert" className="danger">
                      {slot.error.message || slot.error.code}
                    </p>
                  )}
                  {slot.jobId && (
                    <small className="operation-id">{slot.jobId}</small>
                  )}
                  {image && (
                    <div className="comparison-result-actions">
                      <button
                        disabled={saving}
                        aria-pressed={set?.winnerJobId === slot.jobId}
                        onClick={() =>
                          void editSet(
                            "winner",
                            set?.winnerJobId === slot.jobId
                              ? null
                              : slot.jobId!,
                          )
                        }
                      >
                        <Trophy size={15} />
                        {set?.winnerJobId === slot.jobId
                          ? t("winner")
                          : t("chooseWinner")}
                        {set?.winnerJobId === slot.jobId && <Check size={14} />}
                      </button>
                      <button
                        onClick={() =>
                          navigate("/image", {
                            state: {
                              identityScope,
                              imageSettings: {
                                prompt:
                                  slot.submittedPrompt || run.sourcePrompt,
                                provider: slot.provider,
                                model: slot.model,
                                ...(run.configurationSnapshot?.aspectRatio
                                  ? {
                                      ratio:
                                        run.configurationSnapshot.aspectRatio,
                                    }
                                  : {}),
                                ...(run.configurationSnapshot?.imageResolution
                                  ? {
                                      resolution:
                                        run.configurationSnapshot
                                          .imageResolution,
                                    }
                                  : {}),
                              },
                            },
                          })
                        }
                      >
                        {t("useImage")}
                      </button>
                    </div>
                  )}
                  {!image && !pending && (
                    <button
                      onClick={() =>
                        navigate("/image", {
                          state: {
                            identityScope,
                            imageSettings: {
                              prompt: slot.submittedPrompt || run.sourcePrompt,
                              provider: slot.provider,
                              model: slot.model,
                            },
                          },
                        })
                      }
                    >
                      {t("useImage")}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
          <details className="comparison-submitted-details">
            <summary>{t("submittedDetails")}</summary>
            <p>{t("requestedSettings", {
              ratio: run.configurationSnapshot?.aspectRatio || "—",
              resolution: run.configurationSnapshot?.imageResolution || t("defaultSize"),
            })}</p>
            <pre>{run.sourcePrompt}</pre>
          </details>
        </>
      ) : (
        <div className="comparison-empty">
          <h2>{t("emptyTitle")}</h2>
          <p>{t("emptyHelp")}</p>
        </div>
      )}
      {inspected && (
        <ImageViewer
          key={inspected.id}
          item={inspected}
          initialExpanded
          onExpandedClose={() => inspect(null)}
        />
      )}
    </>
  );
}
