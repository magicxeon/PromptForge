import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/Button";
import { VoiceDesignStatus } from "./VoiceDesignStatus";
import { pollingPolicy } from "../../../lib/api/pollingPolicy";
import { voiceApi } from "../api/voiceStudioApi";
import { voiceErrorMessage } from "../api/voiceStudioErrors";
import type { VoiceCatalog, CustomVoice } from "../schemas/voiceStudioSchemas";
import { useVoicePlayback, VoicePlaybackControls } from "./VoicePlayback";

export function VoiceDesignForm({
  catalog,
  actorId,
  recoveryId,
  onChange,
  onUse,
}: {
  catalog: VoiceCatalog;
  actorId: string;
  recoveryId?: string;
  onChange: () => void;
  onUse: (voice: CustomVoice) => void;
}) {
  const { t } = useTranslation("voice-studio");
  const playback = useVoicePlayback();
  const models = catalog.models.filter(
    (model) => model.enabled !== false && model.capabilities.voiceDesign,
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modelId, setModelId] = useState(models[0]?.id || "");
  const [language, setLanguage] = useState("th");
  const [operationId, setOperationId] = useState(recoveryId || "");
  const [deadline, setDeadline] = useState(() => Date.now() + 60000);
  const [timedOut, setTimedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const checkInFlight = useRef(false);
  const [quote, setQuote] = useState<{
    id: string;
    totalCredits: number;
    input: {
      name: string;
      description: string;
      modelId: string;
      language: string;
    };
    requestId: string;
  } | null>(null);
  const terminal = [
    "succeeded",
    "failed",
    "cancelled",
    "reconciliation_required",
  ];
  const operation = useQuery({
    queryKey: ["voice-generation", actorId, operationId],
    queryFn: () => voiceApi.operation(operationId),
    enabled: Boolean(operationId),
    retry: false,
    refetchInterval: (query) =>
      terminal.includes(query.state.data?.status || "") ||
      Date.now() > deadline ||
      query.state.error
        ? false
        : pollingPolicy.generationJob(query.state.data?.status),
  });
  const candidate = operation.data?.customVoice;
  useEffect(() => {
    if (!recoveryId || !operation.data?.snapshot) return;
    const snapshot = operation.data.snapshot;
    setName(snapshot.name || "");
    setDescription(snapshot.description || "");
    if (snapshot.modelId) setModelId(snapshot.modelId);
    if (snapshot.language) setLanguage(snapshot.language);
  }, [recoveryId, operation.data?.id]);
  const unresolved = Boolean(
    operationId &&
    !["succeeded", "failed", "cancelled"].includes(
      operation.data?.status || "",
    ),
  );
  const pending =
    unresolved &&
    !timedOut &&
    !terminal.includes(operation.data?.status || "") &&
    !operation.isError;
  useEffect(() => {
    if (!operationId) return;
    const timer = setTimeout(
      () => setTimedOut(true),
      Math.max(0, deadline - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [operationId, deadline]);
  useEffect(() => {
    if (terminal.includes(operation.data?.status || "")) onChange();
  }, [operation.data?.status]); // owner refreshes candidate list only on terminal transition
  function change(update: () => void) {
    setQuote(null);
    update();
  }
  async function prepare() {
    setBusy(true);
    setError("");
    try {
      const input = {
        name: name.trim(),
        description: description.trim(),
        modelId,
        language,
      };
      const result = await voiceApi.quoteVoiceDesign(input);
      setQuote({ ...result, input, requestId: crypto.randomUUID() });
    } catch (error) {
      setError(voiceErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    if (!quote) return;
    setBusy(true);
    setError("");
    try {
      const result = await voiceApi.designVoice({
        ...quote.input,
        quoteId: quote.id,
        requestId: quote.requestId,
      });
      setOperationId(result.id);
      setDeadline(Date.now() + 60000);
      setTimedOut(false);
      setQuote(null);
      onChange();
    } catch (error) {
      setError(voiceErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!candidate) return;
    setBusy(true);
    setError("");
    try {
      await voiceApi.saveCustomVoice(candidate.id);
      await operation.refetch();
      onChange();
    } catch (error) {
      setError(voiceErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="voice-design-form">
      <VoicePlaybackControls />
      <p className="voice-muted">{t("designDescription")}</p>
      {!models.length ? <p role="status">{t("designUnavailable")}</p> : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void prepare();
        }}
      >
        <label>
          {t("voiceName")}
          <input
            value={name}
            required
            maxLength={Number(catalog.policy.maxTitleLength) || 120}
            onChange={(event) => change(() => setName(event.target.value))}
          />
        </label>
        <label>
          {t("designPrompt")}
          <textarea
            aria-label={t('designPrompt')}
            value={description}
            required
            rows={5}
            maxLength={Number(catalog.policy.maxDesignLength) || 1000}
            placeholder={t("designExample")}
            onChange={(event) =>
              change(() => setDescription(event.target.value))
            }
          />
        </label>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={() => change(() => setDescription(t("designExample")))}
        >
          {t("useDescriptionExample")}
        </Button>
        <p className="voice-muted">{t("designHints")}</p>
        <div className="voice-design-options">
          <label>
            {t("model")}
            <select
              aria-label={t("designModel")}
              value={modelId}
              onChange={(event) => change(() => setModelId(event.target.value))}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.displayName}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("language")}
            <select
              aria-label={t("language")}
              value={language}
              onChange={(event) =>
                change(() => setLanguage(event.target.value))
              }
            >
              {(
                models.find((model) => model.id === modelId)?.capabilities
                  .languages || ["th", "en"]
              ).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button
          type="submit"
          variant="primary"
          loading={busy}
          disabled={
            !models.length ||
            unresolved ||
            Boolean(quote) ||
            !name.trim() ||
            !description.trim()
          }
        >
          {t("designVoice")}
        </Button>
        {quote ? (
          <div className="voice-quote">
            <span>{t("estimate", { credits: quote.totalCredits })}</span>
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => void generate()}
            >
              {t("confirmDesign")}
            </Button>
          </div>
        ) : null}
      </form>
      {error ? <p role="alert">{error}</p> : null}
      {operationId && operation.data?.status !== "succeeded" ? (
        <VoiceDesignStatus
          operationId={operationId}
          status={operation.data?.status || (pending ? "queued" : "unknown")}
          errorCode={operation.data?.errorCode}
          checking={operation.isFetching}
          readFailed={operation.isError}
          timedOut={timedOut}
          onCheck={() => {
            if (checkInFlight.current || operation.isFetching) return;
            checkInFlight.current = true;
            setDeadline(Date.now() + 60000);
            setTimedOut(false);
            void operation.refetch({ cancelRefetch: false }).finally(() => {
              checkInFlight.current = false;
            });
          }}
        />
      ) : null}
      {candidate ? (
        <div className="voice-designed-result">
          <h3>{candidate.name}</h3>
          <p>{t("designSampleReady")}</p>
          <div className="voice-actions">
            <Button
              onClick={() =>
                void playback.play([
                  {
                    id: candidate.id,
                    audioUrl: candidate.audioUrl,
                    displayTitle: candidate.name,
                  },
                ])
              }
            >
              {t("listenSample")}
            </Button>
            <Button
              loading={busy}
              disabled={
                Boolean(candidate.savedAt) ||
                candidate.lifecycleState !== "ready"
              }
              onClick={() => void save()}
            >
              {candidate.savedAt ? t("voiceSaved") : t("saveVoice")}
            </Button>
            {candidate.savedAt ? (
              <Button variant="primary" onClick={() => onUse(candidate)}>
                {t("useWithCharacter")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      {operationId && !unresolved ? (
        <Button
          variant="ghost"
          onClick={() => {
            playback.stop();
            setOperationId("");
            setQuote(null);
            setError("");
          }}
        >
          {t("designAnother")}
        </Button>
      ) : null}
    </section>
  );
}
