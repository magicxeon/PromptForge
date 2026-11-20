import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { voiceApi } from "../../../../web/src/features/voice-studio/api/voiceStudioApi";
import type {
  DialogueRow,
  CustomVoice,
  VoiceCharacter,
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

type Binding = {
  documentId: string;
  rowId: string;
  characterId?: string;
  operationId?: string;
};
type SelectedTake = Pick<VoiceTake, "id" | "durationMs" | "audioUrl">;
type Props = {
  projectId: string;
  cueId: string;
  text: string;
  language: string;
  speaker: string;
  targetMs?: number;
  defaultCharacterId?: string;
  initialSelection?: string;
  initialModel?: string;
  libraryLink?: (voice: string, modelId: string) => ReactNode;
  binding?: Binding;
  onBind: (binding: Binding) => void | Promise<void>;
  onUse: (take: SelectedTake) => void | Promise<void>;
  onAudition?: (take: SelectedTake) => void;
};
type Quote = Awaited<ReturnType<typeof voiceApi.quote>> & {
  binding: Binding;
  revision: number;
  requestId: string;
  signature: string;
};

async function activeCharacters() {
  const characters: VoiceCharacter[] = [];
  const { epoch } = getIdentitySnapshot();
  let cursor: string | undefined;
  do {
    assertIdentityEpoch(epoch);
    const page = await voiceApi.characters(cursor);
    characters.push(...page.items.filter((item) => !item.archivedAt));
    cursor = page.nextCursor || undefined;
  } while (cursor);
  return characters;
}

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

async function savedVoices(selectedId?: string) {
  const { epoch } = getIdentitySnapshot();
  const result: CustomVoice[] = [];
  let cursor: string | undefined;
  do {
    assertIdentityEpoch(epoch);
    const params = new URLSearchParams({ saved: "true", limit: "50" });
    if (cursor) params.set("cursor", cursor);
    const page = await voiceApi.customVoices(params);
    if (!cursor) result.push(...page.items);
    else {
      const selected = page.items.find((v) => v.id === selectedId);
      if (selected) result.push(selected);
    }
    if (!selectedId || result.some((v) => v.id === selectedId)) break;
    cursor = page.nextCursor || undefined;
  } while (cursor);
  return result;
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
  onAudition,
  defaultCharacterId,
  initialSelection,
  initialModel,
  libraryLink,
  targetMs,
}: Props & { scope: string }) {
  const { t } = useTranslation("dubVoice");
  const client = useQueryClient();
  const prefix = ["dubVoice", scope];
  const catalog = useQuery({
    queryKey: [...prefix, "catalog"],
    queryFn: voiceApi.catalog,
  });
  const characters = useQuery({
    queryKey: [...prefix, "characters"],
    queryFn: activeCharacters,
  });
  const [chosenVoice, setVoice] = useState(initialSelection || "");
  const [kind, voiceId] = chosenVoice.split("/");
  const characterId = kind === "character" ? voiceId : binding?.characterId || defaultCharacterId;
  const character = characters.data?.find((c) => c.id === characterId);
  const pickedCharacter = kind === "character" ? character : undefined;
  const requestedCustom = kind === "custom" ? voiceId : character?.voiceKind === "custom" ? character.voiceId : undefined;
  const customs = useQuery({
    queryKey: [...prefix, "voices", requestedCustom || ""],
    queryFn: () => savedVoices(requestedCustom),
  });
  const [localBinding, setLocalBinding] = useState(binding);
  const b = localBinding ?? binding;
  const documentKey = [...prefix, "document", b?.documentId];
  const doc = useQuery({
    queryKey: documentKey,
    queryFn: () => voiceApi.document(b!.documentId),
    enabled: !!b,
  });
  const row = doc.data?.rows.find((item) => item.id === b?.rowId);
  const [chosenModel, setModel] = useState("");
  const [changes, setChanges] = useState<DialogueRow["delivery"]>({});
  const delivery = { ...row?.delivery, ...changes };
  const models =
    catalog.data?.models.filter(
      (m) =>
        m.enabled !== false &&
        m.available !== false &&
        m.capabilities.languages?.includes(language),
    ) || [];
  const pickedPreset = kind === "preset" || pickedCharacter?.voiceKind === "prebuilt"
    ? catalog.data?.voices.find((v) => v.id === (pickedCharacter?.voiceId || voiceId)) : undefined;
  const pickedCustom = kind === "custom" || pickedCharacter?.voiceKind === "custom"
    ? customs.data?.find((v) => v.id === (pickedCharacter?.voiceId || voiceId)) : undefined;
  const supported = pickedPreset?.modelIds || (pickedCustom ? [pickedCustom.modelId] : undefined);
  const preferredModel = chosenModel || initialModel || doc.data?.modelId;
  const model = models.find((m) => m.id === preferredModel && (!supported || supported.includes(m.id))) ||
    models.find((m) => supported?.includes(m.id)) || models[0];
  const voices =
    catalog.data?.voices.filter(
      (v) =>
        v.modelIds?.includes(model?.id || "") &&
        (!v.languages || v.languages.includes(language)),
    ) || [];
  const custom =
    customs.data?.filter(
      (v) =>
        v.savedAt &&
        v.lifecycleState === "ready" &&
        v.modelId === model?.id &&
        v.language === language,
    ) || [];
  const compatible =
    characters.data?.filter((c) =>
      c.voiceKind === "custom"
        ? custom.some((v) => v.id === c.voiceId)
        : voices.some((v) => v.id === c.voiceId),
    ) || [];
  const initialCharacter =
    compatible.find((c) => c.id === (b?.characterId || defaultCharacterId)) ||
    compatible.find((c) => c.name === speaker);
  const selection =
    chosenVoice ||
    (initialCharacter
      ? "character/" + initialCharacter.id
      : voices[0]
        ? "preset/" + voices[0].id
        : "");
  const available = chosenVoice
    ? (kind === "preset" && voices.some((v) => v.id === voiceId)) ||
      (kind === "custom" && custom.some((v) => v.id === voiceId)) ||
      (kind === "character" && compatible.some((c) => c.id === voiceId))
    : Boolean(selection);
  const inputSignature = (voice: string) =>
    JSON.stringify([
      text,
      language,
      model?.id,
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
  const usableQuote = quote?.signature === signature ? quote : null;
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(t("error", { code: (err as { code?: string })?.code || "" }));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  async function remember(next: Binding) {
    setLocalBinding(next);
    await onBind(next);
  }
  async function estimate() {
    if (!model || !available || !text.trim() || active) return;
    const { epoch } = getIdentitySnapshot();
    const [kind, id] = selection.split("/");
    const character =
      kind === "character"
        ? compatible.find((c) => c.id === id)
        : compatible.find((c) => c.name === speaker && c.voiceId === id) ||
          (await voiceApi.saveCharacter({
            name:
              speaker ||
              custom.find((v) => v.id === id)?.name ||
              voices.find((v) => v.id === id)!.displayName,
            voiceId: id,
            voiceKind: kind === "custom" ? "custom" : "prebuilt",
            color: "",
          }));
    if (!character) throw new Error("Voice unavailable");
    assertIdentityEpoch(epoch);
    client.setQueryData<VoiceCharacter[]>([...prefix, "characters"], (prev) => [
      ...(prev || []).filter((c) => c.id !== character.id),
      character,
    ]);
    let document: VoiceDocument = b
      ? await voiceApi.document(b.documentId)
      : await voiceApi.createDocument();
    const rowId = b?.rowId || document.rows[0].id;
    const next = { documentId: document.id, rowId, characterId: character.id };
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
              characterPresetId: character.id,
              delivery,
            }
          : r,
      ),
    });
    client.setQueryData([...prefix, "document", document.id], document);
    const price = await voiceApi.quote(document.id, rowId, document.revision);
    setVoice("character/" + character.id);
    setQuote({
      ...price,
      binding: next,
      revision: document.revision,
      requestId: crypto.randomUUID(),
      signature: inputSignature("character/" + character.id),
    });
  }
  async function generate() {
    if (!usableQuote || active) return;
    const { epoch } = getIdentitySnapshot();
    const q = usableQuote;
    setQuote(null);
    await remember({ ...q.binding, operationId: q.id });
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
  if (catalog.isLoading || characters.isLoading || (b && doc.isLoading))
    return (
      <p role="status">
        <ProcessingSpinner className="small-spinner" /> {t("loading")}
      </p>
    );
  if (catalog.isError || characters.isError || doc.isError)
    return <p role="alert">{t("error", { code: "" })}</p>;
  return (
    <section className="dub-voice">
      {libraryLink?.(selection, model?.id || "")}
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
            {chosenVoice && !available && (
              <option value={chosenVoice} disabled>{t("selectionUnavailable")}</option>
            )}
            {compatible.length > 0 && (
              <optgroup label={t("characters")}>
                {compatible.map((c) => (
                  <option key={c.id} value={"character/" + c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={t("builtIn")}>
              {voices.map((v) => (
                <option key={v.id} value={"preset/" + v.id}>
                  {v.displayName}
                </option>
              ))}
            </optgroup>
            {custom.length > 0 && (
              <optgroup label={t("custom")}>
                {custom.map((v) => (
                  <option key={v.id} value={"custom/" + v.id}>
                    {v.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <label>
          {t("model")}
          <select
            value={model?.id || ""}
            onChange={(e) => {
              setModel(e.target.value);
              setVoice("");
              setQuote(null);
            }}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </label>
        {(["emotion", "intensity", "pace"] as const).map((key) => (
          <label key={key}>
            {t(key)}
            <select
              value={delivery[key] || ""}
              onChange={(e) =>
                setChanges((c) => ({ ...c, [key]: e.target.value }))
              }
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
            onChange={(e) =>
              setChanges((c) => ({ ...c, direction: e.target.value }))
            }
          />
        </label>
        {usableQuote ? (
          <button type="button" onClick={() => void run(generate)}>
            {t("generate", { credits: usableQuote.totalCredits })}
          </button>
        ) : (
          <button
            type="button"
            disabled={!text.trim() || !available}
            onClick={() => void run(estimate)}
          >
            {t("quote")}
          </button>
        )}
        {!selection && <p>{t("unavailable")}</p>}
      </fieldset>
      {(active || busy) && (
        <p role="status">
          <ProcessingSpinner className="small-spinner" />{" "}
          {t(operation.data?.errorCode ? "review" : "pending")}
        </p>
      )}
      {active && (
        <button type="button" onClick={() => void operation.refetch()}>
          {t("check")}
        </button>
      )}
      {(error || operation.data?.status === "failed") && (
        <p role="alert">{error || t("failed")}</p>
      )}
      {items.map((item) => (
        <div key={item.id} className="dub-take">
          <span>
            {item.inputSnapshot.characterName} ·{" "}
            {t("duration", { seconds: (item.durationMs / 1000).toFixed(1) })}
          </span>
          {targetMs && item.durationMs > targetMs && (
            <span>
              {t("overrun", {
                seconds: ((item.durationMs - targetMs) / 1000).toFixed(1),
              })}
            </span>
          )}
          <button
            type="button"
            onClick={() =>
              onAudition ? onAudition(item) : setAudition(item.audioUrl)
            }
          >
            {t("listen")}
          </button>
          <button
            type="button"
            disabled={busy || !b}
            onClick={() =>
              void run(async () => {
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
              })
            }
          >
            {t(row?.selectedTakeId === item.id ? "selected" : "use")}
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
        </div>
      ))}
      {media.url && <TakePlayback src={media.url} />}
    </section>
  );
}
