import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Clock3, Plus, Sparkles, X } from "lucide-react";
import { WorkspaceNavigation } from "../../../app/WorkspaceNavigation";
import {
  useActor,
  GenerationModelPicker,
  ProcessingSpinner,
  type HistoryItem,
  type GenerationReferenceRole,
} from "../../../lib/canonical";
import { PromptEditor } from "../../playground/components/PromptEditor";
import { ReferenceEditor } from "../../playground/components/ReferenceEditor";
import { referenceUrl, roles } from "../../playground/state/imageDraft";
import { useComparisonWorkspace } from "../hooks/useComparisonWorkspace";
import { ComparisonResults } from "../components/ComparisonResults";
import { ComparisonHistory } from "../components/ComparisonHistory";

export function ComparisonWorkspace() {
  const { identityScope } = useActor();
  const w = useComparisonWorkspace();
  const { t, i18n } = useTranslation("comparison");
  const { t: common } = useTranslation();
  const location = useLocation(),
    navigate = useNavigate();
  const [tab, setTab] = useState("create");
  const [activity, setActivity] = useState(false);
  const [inspected, inspect] = useState<HistoryItem | null>(null);
  const [handoff, setHandoff] = useState<{
    item: HistoryItem;
    action: "reference" | "settings";
  } | null>(
    location.state?.identityScope === identityScope
      ? location.state?.handoff || null
      : null,
  );
  const [handoffRole, setHandoffRole] =
    useState<GenerationReferenceRole>("style_reference");
  useEffect(() => {
    if (location.state?.handoff)
      navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);
  const label = (value: string | Record<string, string>) =>
    typeof value === "string"
      ? value
      : value[i18n.language] || value.en || Object.values(value)[0];
  const options = w.models.map(({ provider, model }) => ({
    providerId: provider.id,
    modelId: model.id,
    providerLabel: label(provider.displayName),
    modelLabel: label(model.displayName),
  }));
  const patch = (
    id: string,
    changes: Partial<(typeof w.draft.slots)[number]>,
  ) =>
    w.setDraft((value) => ({
      ...value,
      slots: value.slots.map((slot) =>
        slot.id === id ? { ...slot, ...changes } : slot,
      ),
    }));
  function move(index: number, direction: number) {
    w.setDraft((value) => {
      const slots = [...value.slots];
      [slots[index], slots[index + direction]] = [
        slots[index + direction],
        slots[index],
      ];
      return { ...value, slots };
    });
  }
  const recent =
    w.history.data?.pages
      .flatMap((page) => page.items)
      .filter(
        (item, index, all) =>
          all.findIndex((other) => other.id === item.id) === index,
      ) || [];
  const invalidRatio = !w.ratios.includes(w.draft.ratio);
  return (
    <main className={`workspace comparison-workspace mobile-${tab}`}>
      <WorkspaceNavigation>
        <button
          className="activity-button"
          aria-expanded={activity}
          onClick={() => setActivity((value) => !value)}
        >
          <Clock3 size={16} />
          {common("jobs")}
        </button>
      </WorkspaceNavigation>
      <div className="mobile-tabs">
        <button
          className={tab === "create" ? "selected" : ""}
          onClick={() => setTab("create")}
        >
          {common("create")}
        </button>
        <button
          className={tab === "results" ? "selected" : ""}
          onClick={() => setTab("results")}
        >
          {common("results")}
        </button>
      </div>
      {handoff && (
        <section className="handoff-panel" aria-label={common("handoffTitle")}>
          <strong>{common("handoffTitle")}</strong>
          <p>
            {t(
              handoff.action === "settings"
                ? "handoffPrompt"
                : "handoffReference",
            )}
          </p>
          {handoff.action === "reference" && (
            <label>
              {common("chooseRole")}
              <select
                value={handoffRole}
                onChange={(event) =>
                  setHandoffRole(event.target.value as GenerationReferenceRole)
                }
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {common(role)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            onClick={() => {
              if (handoff.action === "settings") {
                w.setDraft((value) => ({
                  ...value,
                  prompt: handoff.item.prompt,
                }));
                setHandoff(null);
              } else if (w.useReference(handoff.item, handoffRole))
                setHandoff(null);
            }}
          >
            {common("replace")}
          </button>
          <button onClick={() => setHandoff(null)}>{common("cancel")}</button>
        </section>
      )}
      {activity && (
        <section className="activity-panel">
          <div className="section-heading">
            <h2>{t("recentSets")}</h2>
            <button onClick={() => void w.history.refetch()}>
              {common("check")}
            </button>
          </div>
          {recent.map((item) => (
            <article key={item.id}>
              <button
                onClick={() => {
                  w.selectSet(item.id);
                  setTab("results");
                }}
              >
                {item.name}
              </button>
              <span>
                {common(`status_${item.status}`, { defaultValue: item.status })}
              </span>
              <small>{item.id}</small>
            </article>
          ))}
        </section>
      )}
      <div className="workspace-grid">
        <section className="creation-panel" aria-label={common("create")}>
          <div className="creation-heading">
            <div className="eyebrow">MOMELO / {common("comparison")}</div>
            <h1>{t("title")}</h1>
            <p>{t("subtitle")}</p>
          </div>
          <PromptEditor
            value={w.draft.prompt}
            onChange={(prompt) => w.setDraft((value) => ({ ...value, prompt }))}
          />
          <ReferenceEditor
            references={w.draft.references}
            max={w.maxReferences}
            supported={w.maxReferences > 0}
            upload={(file, role) => void w.upload(file, role)}
            remove={(id) =>
              w.setDraft((value) => ({
                ...value,
                references: value.references.filter((ref) => ref.id !== id),
              }))
            }
            inspect={(ref) => {
              inspect({
                id: ref.id,
                imageUrl: referenceUrl(ref)!,
                prompt: ref.name,
                provider: "",
                submodel: ref.name,
                timestamp: Date.now(),
                mode: "normal",
                referencedFaceJobIds: [],
                referencedStyleJobIds: [],
                referencedCharacterJobIds: [],
                referencedOutfitJobIds: [],
              });
              setTab("results");
            }}
          />
          <section className="comparison-slot-editor">
            <div className="section-heading">
              <h2>{t("models")}</h2>
              <span>
                {w.slots.length} / {w.policy.data?.maximumSlots ?? "—"}
              </span>
            </div>
            {w.draft.slots.map((slot, index) => (
              <article
                key={slot.id}
                className={`comparison-slot ${slot.enabled ? "" : "slot-disabled"}`}
              >
                <header>
                  <label>
                    <input
                      type="checkbox"
                      checked={slot.enabled}
                      onChange={(event) =>
                        patch(slot.id, { enabled: event.target.checked })
                      }
                    />
                    {t("slot", { number: index + 1 })}
                  </label>
                  <div>
                    <button
                      disabled={index === 0}
                      aria-label={t("moveUp")}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      disabled={index === w.draft.slots.length - 1}
                      aria-label={t("moveDown")}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      aria-label={t("removeSlot")}
                      onClick={() =>
                        w.setDraft((value) => ({
                          ...value,
                          slots: value.slots.filter(
                            (item) => item.id !== slot.id,
                          ),
                        }))
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                </header>
                <GenerationModelPicker
                  options={options}
                  providerId={slot.provider}
                  modelId={slot.model}
                  onChange={({ providerId, modelId }) =>
                    patch(slot.id, { provider: providerId, model: modelId })
                  }
                />
                {slot.enabled &&
                  w.slotIssues.some((issue) => issue.id === slot.id) && (
                    <p className="danger" role="alert">
                      {t("incompatible")}
                    </p>
                  )}
                {slot.enabled && w.quoteCurrent && (
                  <div className="comparison-slot-price">
                    {common("estimate", {
                      count:
                        w.estimate.data?.slots.find(
                          (item) => item.id === slot.id,
                        )?.estimatedCredit || 0,
                    })}
                    <small>
                      {t("resolvedResolution", {
                        resolution:
                          w.estimate.data?.slots.find(
                            (item) => item.id === slot.id,
                          )?.imageResolution || t("defaultSize"),
                      })}
                    </small>
                  </div>
                )}
              </article>
            ))}
            <button
              disabled={
                !w.policy.data ||
                w.draft.slots.length >= w.policy.data.maximumSlots ||
                !options.length
              }
              onClick={() => {
                const item = options[w.draft.slots.length % options.length];
                w.setDraft((value) => ({
                  ...value,
                  slots: [
                    ...value.slots,
                    {
                      id: crypto.randomUUID(),
                      provider: item.providerId,
                      model: item.modelId,
                      enabled: true,
                    },
                  ],
                }));
              }}
            >
              <Plus size={15} />
              {t("addSlot")}
            </button>
            {w.policy.data && w.slots.length < w.policy.data.minimumSlots && (
              <p className="danger">
                {t("minimum", { count: w.policy.data.minimumSlots })}
              </p>
            )}
            {(w.policy.isError || w.catalog.isError) && (
              <button
                onClick={() => {
                  void w.policy.refetch();
                  void w.catalog.refetch();
                }}
              >
                {common("retry")}
              </button>
            )}
          </section>
          <div className="settings-grid">
            <label>
              {common("ratio")}
              <select
                value={w.draft.ratio}
                aria-invalid={invalidRatio}
                onChange={(event) =>
                  w.setDraft((value) => ({
                    ...value,
                    ratio: event.target.value,
                  }))
                }
              >
                {invalidRatio && (
                  <option value={w.draft.ratio}>
                    {w.draft.ratio} — {common("invalidSize")}
                  </option>
                )}
                {w.ratios.map((ratio) => (
                  <option key={ratio}>{ratio}</option>
                ))}
              </select>
            </label>
            {!!w.resolutions.length && (
              <label>
                {common("resolution")}
                <select
                  value={w.draft.resolution}
                  onChange={(event) =>
                    w.setDraft((value) => ({
                      ...value,
                      resolution: event.target.value,
                    }))
                  }
                >
                  <option value="">{t("defaultSize")}</option>
                  {[
                    ...new Set(
                      [...w.resolutions, w.draft.resolution].filter(Boolean),
                    ),
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <details className="advanced">
            <summary>{common("advanced")}</summary>
            <label>
              {common("negative")}
              <textarea
                value={w.draft.negative}
                rows={3}
                onChange={(event) =>
                  w.setDraft((value) => ({
                    ...value,
                    negative: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              {t("name")}
              <input
                value={w.draft.name}
                maxLength={100}
                onChange={(event) =>
                  w.setDraft((value) => ({
                    ...value,
                    name: event.target.value,
                  }))
                }
              />
            </label>
          </details>
          {w.draft.name.trim().length > 100 && (
            <p role="alert">{t("nameTooLong")}</p>
          )}
          {w.error && (
            <div className="inline-error" role="alert">
              {w.error}
            </div>
          )}
          {w.intent && (
            <div className="operation-status" role="status">
              <strong>
                {w.unresolved
                  ? t("unknown")
                  : common(`status_${w.activeRun?.status || "queued"}`, {
                      defaultValue: w.activeRun?.status,
                    })}
              </strong>
              <small>{w.intent.requestId}</small>
              {w.unresolved ? (
                <button disabled={w.checking} onClick={() => void w.check()}>
                  {w.checking ? common("checking") : common("check")}
                </button>
              ) : (
                <button
                  onClick={() => {
                    w.selectSet(w.intent!.setId);
                    setTab("results");
                  }}
                >
                  {common("viewProgress")}
                </button>
              )}
            </div>
          )}
          <footer className="generate-bar">
            <div className="quote-line">
              {w.quoteCurrent ? (
                <strong>
                  {common("estimate", {
                    count: w.estimate.data?.estimatedTotalCredit || 0,
                  })}
                </strong>
              ) : w.estimate.isError ? (
                <button onClick={() => void w.estimate.refetch()}>
                  {common("quoteError")}
                </button>
              ) : w.estimate.data &&
                w.estimate.data.expiresAt <= Date.now() &&
                !w.estimate.isFetching ? (
                <button onClick={() => void w.estimate.refetch()}>
                  {t("refreshQuote")}
                </button>
              ) : (
                <span>
                  {w.draft.prompt.trim()
                    ? common("estimating")
                    : common("noPrompt")}
                </span>
              )}
            </div>
            <button
              className="primary-button"
              disabled={!w.canGenerate || w.consent.awaitingConfirmation}
              onClick={() => void w.generate()}
            >
              {w.busy ? <ProcessingSpinner /> : <Sparkles size={18} />}
              {t("generateCount", { count: w.slots.length })}
            </button>
          </footer>
        </section>
        <section className="results-panel" aria-label={common("results")}>
          {w.selected.isFetching && !w.selected.data && (
            <p role="status">
              <ProcessingSpinner />
              {t("loading")}
            </p>
          )}
          {w.selected.isError && (
            <div className="inline-error" role="alert">
              {t("loadFailed")}
              <button onClick={() => void w.selected.refetch()}>
                {common("retry")}
              </button>
            </div>
          )}
          <ComparisonResults
            set={w.selected.data}
            editSet={w.editSet}
            saving={w.saving}
            inspect={inspect}
            inspected={inspected}
          />
          <ComparisonHistory history={w.history} />
        </section>
      </div>
      {w.consent.dialog}
    </main>
  );
}
