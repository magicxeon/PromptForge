import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { voiceApi } from "../../../../web/src/features/voice-studio/api/voiceStudioApi";
import { useDubConfirmation } from "./useDubConfirmation";
import type {
  VoiceDocument,
  VoiceTake,
} from "../../../../web/src/features/voice-studio/schemas/voiceStudioSchemas";
import {
  getIdentitySnapshot,
  ProcessingSpinner,
  pollingPolicy,
  useActor,
} from "../../lib/canonical";
import { assertIdentityEpoch } from "../../../../web/src/lib/auth/actorStore";
import { usePrivateImage } from "../../components/media/MediaImage";
import "./dubVoice.css";
import { loadDubbingChoices } from "./dubbingCharacters";
import config from "./dubbing-voice-config.json";
import { createSpeechRequest } from "./speechRequest";
import { useWorkspaceCredits } from "../../lib/workspaceConfig";
import type { CueDelivery } from "./projectApi";
import { takePlacement } from "../../../../server/domain/dub-sub/takePlacement.js";

type Binding = {
  documentId: string;
  rowId: string;
  characterId?: string;
  operationId?: string;
  operationRevision?: number;
  usesCueDelivery?: boolean;
  usesSpeakerMapping?: boolean;
};
type SelectedTake = Pick<VoiceTake, "id" | "durationMs" | "audioUrl">;
type Props = {
  projectId: string;
  cueId: string;
  text: string;
  language: string;
  speaker: string;
  targetMs?: number;
  cueStartMs?:number;
  cueOffsetMs?:number;
  projectDurationMs?:number;
  loadSpeechWindows?:()=>Promise<{startMs:number;endMs:number}[]>;
  suggestedDelivery?: CueDelivery;
  overrides?: CueDelivery;
  onDeliveryChange: (value: CueDelivery) => void;
  defaultCharacterId?: string;
  initialSelection?: string;
  binding?: Binding;
  onBind: (binding: Binding) => void | Promise<void>;
  onUse: (take: SelectedTake) => void | Promise<void>;
  onUseBoundaries?: (takeId:string, confirmedOverrunMs?:number) => Promise<void>;
  onAudition?: (take: VoiceTake) => void;
  usedTakeId?: string;
  internalPausesAccepted?: boolean;
  onTakeDeleted?: (id:string) => void;
};
type Quote = Awaited<ReturnType<typeof voiceApi.quote>> & {
  binding: Binding;
  revision: number;
  requestId: string;
  signature: string;
};

export function DubVoice(props: Props) {
  const { identityScope } = useActor();
  return (
    <VoiceInspector
      key={[identityScope, props.projectId, props.cueId, props.language].join(
        "/",
      )}
      {...props}
      scope={identityScope}
    />
  );
}


function TakePlayback({ src }: { src: string }) {
  const player = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const element = player.current;
    if (!element) return;
    element.src = src;
    return () => {
      element.pause();
      element.removeAttribute("src");
      element.load();
    };
  }, [src]);
  return <audio ref={player} controls autoPlay />;
}

function VoiceInspector({
  scope,
  projectId,
  cueId,
  text,
  language,
  speaker,
  binding,
  onBind,
  onUse,
  onUseBoundaries,
  onAudition,
  usedTakeId, internalPausesAccepted, onTakeDeleted,
  defaultCharacterId,
  initialSelection,
  targetMs,
  cueStartMs=0, cueOffsetMs, projectDurationMs, loadSpeechWindows,
  suggestedDelivery, overrides, onDeliveryChange,
}: Props & { scope: string }) {
  const { t } = useTranslation("dubVoice");
  const confirmation = useDubConfirmation();
  const creditsEnabled = useWorkspaceCredits();
  const client = useQueryClient();
  const prefix = ["dubVoice", scope];
  const catalog = useQuery({
    queryKey: [...prefix, "catalog"],
    queryFn: voiceApi.catalog,
  });
  const choicesKey = ["dub-speaker-choices", scope, language];
  const choices = useQuery({ queryKey: choicesKey, queryFn: () => loadDubbingChoices(language) });
  const [chosenVoice, setVoice] = useState(initialSelection?.replace(/^custom\//, "") || "");
  const [localBinding, setLocalBinding] = useState(binding);
  const [boundaryTimingOnly,setBoundaryTimingOnly] = useState(false);
  const b = localBinding ?? binding;
  const documentKey = [...prefix, "document", b?.documentId];
  const doc = useQuery({
    queryKey: documentKey,
    queryFn: () => voiceApi.document(b!.documentId),
    enabled: !!b,
  });
  const row = doc.data?.rows.find((item) => item.id === b?.rowId);
  const previousSettings = b?.usesCueDelivery ? undefined : row?.delivery;
  const delivery = { ...(row?.delivery.method && { method: row.delivery.method }), ...suggestedDelivery, ...previousSettings, ...overrides };
  function changeDelivery(key: keyof CueDelivery, value: string) {
    setQuote(null);
    onDeliveryChange({ ...overrides, [key]: value });
  }
  const model = catalog.data?.models.find(m => m.id === config.modelId && m.enabled !== false && m.available !== false && m.capabilities.languages?.includes(language));
  const voices = choices.data?.voices || [];
  const characters = choices.data?.characters || [];
  const boundCharacterId = b?.usesSpeakerMapping ? defaultCharacterId : b?.characterId || defaultCharacterId;
  const mapped = characters.find(c => c.id === boundCharacterId && c.voiceKind === "custom");
  const selection = chosenVoice || mapped?.voiceId || "";
  const selectedVoice = voices.find(v => v.id === selection);
  const available = Boolean(model && selectedVoice);
  const inputSignature = (voice: string) =>
    JSON.stringify([
      text,
      language,
      model?.id,
      targetMs,
      cueStartMs,
      boundaryTimingOnly,
      voice,
      delivery.emotion,
      delivery.intensity,
      delivery.pace,
      delivery.method,
      delivery.direction,
    ]);
  const signature = inputSignature(selection);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [opId, setOpId] = useState(binding?.operationId);
  const operationId = opId || row?.activeOperationId;
  const operation = useQuery({
    queryKey: [...prefix, "operation", operationId],
    queryFn: () => voiceApi.operation(operationId!),
    enabled: !!operationId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return pollingPolicy.comparison(
        !!status &&
          !query.state.data?.errorCode &&
          ["admitting", "queued", "dispatching", "delivered"].includes(status),
      );
    },
  });
  const active =
    !!operationId &&
    (!operation.data ||
      !["succeeded", "failed", "quoted"].includes(operation.data.status));
  const missingRequestId = creditsEnabled === false && b?.operationId === operationId && !operation.data
    && operation.error && "status" in operation.error && operation.error.status === 404
    ? /^speech_([0-9a-f-]{36})$/i.exec(operationId || "")?.[1] : undefined;
  const canRetry = Boolean(missingRequestId && available && b?.operationRevision && row && doc.data &&
    doc.data.revision === b.operationRevision && doc.data.language === language && doc.data.modelId === model?.id &&
    row.text === text && row.targetDurationMs === targetMs && row.characterPresetId === b.characterId && mapped?.id === b.characterId && selection === mapped?.voiceId &&
    (["emotion", "intensity", "pace", "method", "direction"] as const)
      .every(key => (row.delivery[key] || "") === (delivery[key] || "")));
  const takes = useQuery({
    queryKey: [...prefix, "takes", b?.documentId, b?.rowId],
    queryFn: () => voiceApi.takes(b!.documentId, b!.rowId),
    enabled: !!row,
  });
  const [audition, setAudition] = useState("");
  const media = usePrivateImage(audition || undefined);
  const newest = operation.data?.take;
  const items = [...(takes.data?.items || [])];
  if (newest && !items.some((i) => i.id === newest.id)) items.push(newest);
  items.sort((a,b) => (b.takeNumber ?? 0) - (a.takeNumber ?? 0));
  const usableQuote = creditsEnabled && quote?.signature === signature ? quote : null;
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      const code=(err as {code?:string})?.code || "";
      setError(t("dub:errors."+code,{defaultValue:t("error",{code})}));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  async function remember(next: Binding) {
    setLocalBinding(next);
    await onBind(next);
  }
  async function prepareTake() {
    if (creditsEnabled === undefined || !model || !available || !text.trim() || active) return;
    const { epoch } = getIdentitySnapshot();
    if (!selectedVoice) return;
    const speechWindows = boundaryTimingOnly ? undefined : await loadSpeechWindows?.();
    assertIdentityEpoch(epoch);
    const character = (mapped?.voiceId === selection ? mapped : undefined)
      || characters.find(c => c.voiceKind === "custom" && c.voiceId === selection)
      || await voiceApi.saveCharacter({ name: selectedVoice.name, voiceId: selection, voiceKind: "custom", color: "" });
    assertIdentityEpoch(epoch);
    client.setQueryData<Awaited<ReturnType<typeof loadDubbingChoices>>>(choicesKey, prev => prev && ({
      ...prev, characters: [...prev.characters.filter(c => c.id !== character.id), character]
    }));
    void client.invalidateQueries({ queryKey: [...prefix, "characters"] });
    let document: VoiceDocument = b
      ? await voiceApi.document(b.documentId)
      : await voiceApi.createDocument();
    const rowId = b?.rowId || document.rows[0].id;
    if (previousSettings && Object.keys(previousSettings).length) {
      const { method: _method, ...previousFields } = previousSettings;
      onDeliveryChange({ ...previousFields, ...overrides });
    }
    const next = { documentId: document.id, rowId, characterId: character.id, usesCueDelivery: true,
      usesSpeakerMapping: character.id === defaultCharacterId };
    await remember(next);
    assertIdentityEpoch(epoch);
    document = await voiceApi.saveDocument({
      ...document,
      title: `${speaker || language} · ${projectId.slice(0, 8)} / ${cueId.slice(0, 8)}`,
      modelId: model.id,
      language,
      rows: document.rows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              enabled: true,
              text,
              targetDurationMs: targetMs,
              boundaryTimingOnly,
              speechWindows: speechWindows?.length ? speechWindows : undefined,
              characterPresetId: character.id,
              delivery,
            }
          : r,
      ),
    });
    client.setQueryData([...prefix, "document", document.id], document);
    assertIdentityEpoch(epoch);
    setVoice(selection);
    if (!creditsEnabled) {
      await submitTake({ ...createSpeechRequest(), binding: next, revision: document.revision });
      return;
    }
    const price = await voiceApi.quote(document.id, rowId, document.revision);
    setQuote({
      ...price,
      binding: next,
      revision: document.revision,
      requestId: crypto.randomUUID(),
      signature,
    });
  }
  async function submitTake(q: Pick<Quote, "id" | "requestId" | "binding" | "revision">) {
    const { epoch } = getIdentitySnapshot();
    setQuote(null);
    await remember({ ...q.binding, operationId: q.id, operationRevision: q.revision });
    assertIdentityEpoch(epoch);
    try {
      const op = await voiceApi.generate(
        q.binding.documentId,
        q.binding.rowId,
        q.revision,
        q.id,
        q.requestId,
      );
      client.setQueryData([...prefix, "operation", q.id], op);
    } finally {
      setOpId(q.id);
      void client.invalidateQueries({
        queryKey: [...prefix, "operation", q.id],
      });
    }
  }
  useEffect(() => {
    if (operation.data?.status === "succeeded")
      void client.invalidateQueries({
        queryKey: ["dubVoice", scope, "takes", b?.documentId, b?.rowId],
      });
  }, [
    operation.data?.status,
    operationId,
    client,
    scope,
    b?.documentId,
    b?.rowId,
  ]);
  if (catalog.isLoading || choices.isLoading || (b && doc.isLoading))
    return (
      <p role="status">
        <ProcessingSpinner className="small-spinner" /> {t("loading")}
      </p>
    );
  if (catalog.isError || choices.isError || doc.isError)
    return <p role="alert">{t("error", { code: "" })}</p>;
  return (
    <section className="dub-voice">
      {confirmation.modal}
      <fieldset disabled={busy || active}>
        <label>
          {t("character")}
          <select
            aria-label={t("character")}
            value={selection}
            onChange={(e) => {
              setVoice(e.target.value);
              setQuote(null);
            }}
          >
            <option value="" disabled>{t(!chosenVoice && boundCharacterId && !mapped ? "selectionUnavailable" : "chooseVoice")}</option>
            {selection && !selectedVoice && <option value={selection} disabled>{t("selectionUnavailable")}</option>}
            {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        <details className="dub-performance-settings">
          <summary>{t("editPerformance")}</summary>
          {(["emotion", "intensity", "pace"] as const).map((key) => (
            <label key={key}>
              {t(key)}
              <select
                value={delivery[key] || ""}
                onChange={(e) => changeDelivery(key, e.target.value)}
              >
                <option value="">{t("default")}</option>
                {catalog.data?.policy.stylePresets?.[key]?.map((v) => (
                  <option key={v} value={v}>
                    {t(v, { defaultValue: v })}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            {t("direction")}
            <textarea
              value={delivery.direction || ""}
              maxLength={catalog.data?.policy.maxStyleLength}
              onChange={(e) => changeDelivery("direction", e.target.value)}
            />
          </label>
          {loadSpeechWindows && <label className="dub-timing-mode">
            <input type="checkbox" checked={boundaryTimingOnly} onChange={e=>{setBoundaryTimingOnly(e.target.checked);setQuote(null);}}/>
            <span>{t("dub:boundaryTimingOption")}<small>{t("dub:boundaryTimingHint")}</small></span>
          </label>}
        </details>
        {usableQuote ? (
          <button type="button" onClick={() => void run(() => submitTake(usableQuote))}>
            {t("generate", { credits: usableQuote.totalCredits })}
          </button>
        ) : (
          <button
            type="button"
            disabled={creditsEnabled === undefined || !text.trim() || !available}
            onClick={() => void run(prepareTake)}
          >
            {t(creditsEnabled ? "quote" : "generateTake")}
          </button>
        )}
        {!voices.length && <p>{t("unavailable")}</p>}
      </fieldset>
      {missingRequestId && b && <div>
        <p role="status">{t("requestMissing")}</p>
        {canRetry && <button disabled={busy} onClick={() => void run(async () => {
          const windows = row?.speechWindows?.length ? await loadSpeechWindows?.() : undefined;
          if (windows && JSON.stringify(windows) !== JSON.stringify(row?.speechWindows ?? [])) {
            setError(t("timingChanged")); return;
          }
          await submitTake({binding:b,revision:b.operationRevision!,id:b.operationId!,requestId:missingRequestId});
        })}>{t("retryTake")}</button>}
        <button disabled={busy} onClick={() => void run(async () => {
          await remember({ ...b, operationId: undefined, operationRevision: undefined });
          setOpId(undefined);
        })}>{t("editTake")}</button>
      </div>}
      {((active && !missingRequestId) || busy) && (
        <p role="status">
          <ProcessingSpinner variant="wave" className="seed-generation-wave" />{" "}
          {t(operation.data?.errorCode ? "review" : "pending")}
        </p>
      )}
      {active && !missingRequestId && (
        <button type="button" onClick={() => void operation.refetch()}>
          {t("check")}
        </button>
      )}
      {(error || operation.data?.status === "failed") && (
        <p role="alert">{error || t("failed")}</p>
      )}
      {items.map((item) => {
        const placement = targetMs === undefined ? null : takePlacement({
          startMs:cueStartMs,endMs:cueStartMs+targetMs,
          offsetMs:item.inputSnapshot.boundaryTimingOnly && !item.inputSnapshot.speechWindows && usedTakeId!==item.id ? 0 : cueOffsetMs
        },item.durationMs,projectDurationMs);
        return (
        <div key={item.id} className="dub-take">
          <span>
            {item.takeNumber && <strong>{t("takeNumber",{number:item.takeNumber})} · </strong>}
            {item.inputSnapshot.characterName} ·{" "}
            {t("duration", { seconds: (item.durationMs / 1000).toFixed(1) })}
          </span>
          {placement && !placement.fits && (
            <span>
              {placement.start < 0 ? t("dub:errors.dub_take_exceeds_window") : t("overrun", {
                seconds: ((item.durationMs - placement.availableMs) / 1000).toFixed(2),
              })}
            </span>
          )}
          {item.rhythmReview?.status === "review" && <span>
            {item.rhythmReview.reasons.map(reason=>t("dub:errors.dub_take_rhythm_"+reason)).join(" · ")}
          </span>}
          <button
            type="button"
            onClick={() =>
              onAudition ? onAudition(item) : setAudition(item.audioUrl)
            }
          >
            {t("listen")}
          </button>
          {usedTakeId===item.id && internalPausesAccepted && <span role="status">{t("dub:boundaryTimingApplied")}</span>}
          <button
            type="button"
            disabled={busy || !b || usedTakeId===item.id || (placement && !placement.fits ? placement.start<0 || !onUseBoundaries : false)}
            onClick={() => {
              if (placement && !placement.fits && onUseBoundaries) {
                const excess = item.durationMs - placement.availableMs;
                confirmation.ask({
                  action:t("use"),
                  message:t("confirmOverrun",{seconds:Number((excess/1000).toFixed(3))}),
                  proceed:()=>void run(()=>onUseBoundaries(item.id,excess)),
                });
                return;
              }
              void run(async () => {
                if (item.inputSnapshot.boundaryTimingOnly && onUseBoundaries) {
                  await onUseBoundaries(item.id);
                  return;
                }
                const current = await voiceApi.document(b!.documentId);
                const next = await voiceApi.select(
                  current.id,
                  b!.rowId,
                  item.id,
                  current.revision,
                );
                client.setQueryData(documentKey, next);
                await onUse({
                  id: item.id,
                  durationMs: item.durationMs,
                  audioUrl: item.audioUrl,
                });
              });
            }}
          >
            {t(usedTakeId === item.id ? "selected" : "use")}
          </button>
          <button
            type="button"
            disabled={busy || !!item.savedAt}
            onClick={() =>
              void run(async () => {
                await voiceApi.saveTake(item.id);
                await takes.refetch();
              })
            }
          >
            {t(item.savedAt ? "saved" : "save")}
          </button>
          <button type="button" disabled={busy || row?.selectedTakeId===item.id || usedTakeId===item.id}
            title={t(row?.selectedTakeId===item.id || usedTakeId===item.id ? "deleteInUse" : "deleteTake")}
            onClick={()=>confirmation.ask({
              action:t("deleteTake"), destructive:true,
              message:t("deleteConfirm",{name:item.inputSnapshot.characterName,seconds:(item.durationMs/1000).toFixed(1)}),
              proceed:()=>void run(async()=>{
                try { await voiceApi.deleteTake(item.id); }
                catch (e) {
                  if ((e as {code?:string}).code==="voice_take_in_use") {setError(t("deleteInUse"));return;}
                  throw e;
                }
                if (audition===item.audioUrl) setAudition("");
                onTakeDeleted?.(item.id);
                if (newest?.id===item.id) client.setQueryData([...prefix,"operation",operationId],{...operation.data,take:null});
                await takes.refetch();
              }),
            })}>{t("deleteTake")}</button>
        </div>
      );})}
      {media.url && <TakePlayback src={media.url} />}
    </section>
  );
}
