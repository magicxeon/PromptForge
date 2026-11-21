import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioLines, Check, FileText, Pencil, Play, Plus, Square, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { voiceApi, type VoiceDesignInput } from "../../../../web/src/features/voice-studio/api/voiceStudioApi";
import type { CustomVoice, VoiceCatalog } from "../../../../web/src/features/voice-studio/schemas/voiceStudioSchemas";
import { assertIdentityEpoch } from "../../../../web/src/lib/auth/actorStore";
import { getIdentitySnapshot, pollingPolicy, ProcessingSpinner, readActorScopedDraft, removeActorScopedDraft, useActor, writeActorScopedDraft } from "../../lib/canonical";
import { usePrivateImage } from "../../components/media/MediaImage";
import config from "./dubbing-voice-config.json";
import { prepareSeedReference } from "./seedReferenceAudio";
import { useWorkspaceCredits } from "../../lib/workspaceConfig";
import { createSpeechRequest } from "./speechRequest";
import { Dialog } from "./Dialog";
import "./dubbingVoiceSetup.css";

type ReturnProps = { onReturn?: (voice?: CustomVoice) => void };
const feature = "dub-seed-voice-preview";
type DesignQuote = { price: Awaited<ReturnType<typeof voiceApi.quoteVoiceDesign>>; input: VoiceDesignInput; requestId: string };
const workingStates = ["admitting", "queued", "dispatching", "delivered"];
const genres = Object.entries(config.genres);
function genreOf(description: string) {
  return genres.find(([, phrase]) => description.trimEnd().toLowerCase().endsWith(phrase.toLowerCase()));
}

function Sample({ src, label }: { src: string; label: string }) {
  const { t } = useTranslation("seedSetup");
  const media = usePrivateImage(src);
  if (media.error) return <button type="button" onClick={media.retry}>{t("retryAudio")}</button>;
  return media.url ? <audio controls preload="metadata" src={media.url} aria-label={label} /> : <ProcessingSpinner className="small-spinner" />;
}

function SavedVoices({ scope, maxTitleLength }: { scope: string; maxTitleLength?: number }) {
  const { t, i18n } = useTranslation("seedSetup");
  const client = useQueryClient();
  const [playing, setPlaying] = useState("");
  const [failedSample, setFailedSample] = useState("");
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<CustomVoice | null>(null);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [renameError, setRenameError] = useState("");
  async function rename() {
    if (!editing || saving || !draftName.trim()) return;
    setSaving(true); setRenameError("");
    const { epoch } = getIdentitySnapshot();
    try {
      await voiceApi.updateCustomVoice(editing.id, { expectedRevision: editing.revision, name: draftName.trim() });
      assertIdentityEpoch(epoch);
      await Promise.all([client.invalidateQueries({ queryKey: ["dubVoice", scope] }), client.invalidateQueries({ queryKey: ["dub-speaker-choices", scope] })]);
      setEditing(null);
    } catch (e) {
      setRenameError(t("failed", {code: e && typeof e === "object" && "code" in e ? String(e.code) : ""}));
      await list.refetch();
    } finally { setSaving(false); }
  }
  const [removing, setRemoving] = useState<CustomVoice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteLock = useRef(false);
  async function remove() {
    if (!removing || deleteLock.current) return;
    deleteLock.current = true;
    setDeleting(true); setDeleteError("");
    const { epoch } = getIdentitySnapshot();
    try {
      await voiceApi.deleteCustomVoice(removing.id, { retireLinkedCharacters: true });
      assertIdentityEpoch(epoch);
      setRemoving(null); setPlaying("");
      await client.invalidateQueries({ queryKey: ["dubVoice", scope] });
      await client.invalidateQueries({ queryKey: ["dub-speaker-choices", scope] });
    } catch (e) {
      setDeleteError(t("failed", { code: e && typeof e === "object" && "code" in e ? String(e.code) : "" }));
    } finally { setDeleting(false); deleteLock.current = false; }
  }
  const list = useInfiniteQuery({
    queryKey: ["dubVoice", scope, "savedSeedVoices", filter],
    initialPageParam: "",
    queryFn: ({ pageParam }) => voiceApi.customVoices(new URLSearchParams({ saved: "true", limit: "50", cursor: pageParam, modelId: config.modelId, voiceGender: filter })),
    getNextPageParam: page => page.nextCursor || undefined,
  });
  const voices = list.data?.pages.flatMap(page => page.items).filter(v => v.modelId === config.modelId && v.savedAt && v.lifecycleState === "ready") ?? [];
  const languages = new Intl.DisplayNames([i18n.language], { type: "language" });
  const selected = voices.find(v => v.id === playing);
  const media = usePrivateImage(selected?.audioUrl);
  useEffect(() => {
    if (!playing) return;
    const fail = () => { setFailedSample(playing); setPlaying(""); };
    if (media.error) { fail(); return; }
    if (!media.url) return;
    const audio = new Audio(media.url);
    let active = true;
    audio.onended = () => setPlaying("");
    audio.onerror = fail;
    void audio.play().catch(() => { if (active) fail(); });
    return () => {
      active = false;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    };
  }, [playing, media.url, media.error]);
  return <section className="seed-setup-list">
    <header className="seed-list-heading"><h2>{t("savedVoices")}</h2>
      <select aria-label={t("filterGender")} value={filter} onChange={e => { setFilter(e.target.value); setPlaying(""); }}>
        <option value="">{t("allGenders")}</option>
        {["female", "male"].map(k => <option key={k} value={k}>{t(k)}</option>)}
      </select></header>
    {list.isPending && <ProcessingSpinner className="small-spinner" />}
    {list.isError && <button type="button" onClick={() => void list.refetch()}>{t("reload")}</button>}
    {!list.isPending && !list.isError && !voices.length && <p>{t(filter ? "noMatches" : "empty")}</p>}
    <ul>{voices.map(v => <li key={v.id}>
      <div className="seed-voice-info">
      {editing?.id === v.id ? <form className="seed-inline-rename" onSubmit={e => { e.preventDefault(); void rename(); }}>
        <input aria-label={t("name")} autoFocus required disabled={saving} maxLength={maxTitleLength} value={draftName} onChange={e => setDraftName(e.target.value)} />
        <button className="primary" aria-label={t("saveName")} title={t("saveName")} disabled={saving || !draftName.trim() || draftName.trim() === editing.name}><Check size={17} /></button>
        <button type="button" aria-label={t("cancel")} title={t("cancel")} disabled={saving} onClick={() => setEditing(null)}><X size={17} /></button>
        {renameError && <small role="alert">{renameError}</small>}
      </form> : <div className="seed-voice-title"><strong>{v.name}</strong><button title={t("rename")} aria-label={t("rename") + " " + v.name} disabled={saving} onClick={() => { setEditing(v); setDraftName(v.name); setRenameError(""); }}><Pencil size={15} /></button></div>}
      <small>{[t(v.voiceGender || "unspecified"), languages.of(v.language), t("genres." + (genreOf(v.designPrompt)?.[0] || "none")), t(v.sourceType === "reference" ? "reference" : "description")].join(" · ")}</small></div>
      <div className="seed-voice-actions">
      <button type="button" onClick={() => { setFailedSample(""); setPlaying(playing === v.id ? "" : v.id); }}>
        {playing === v.id ? <Square size={15} fill="currentColor" /> : <Play size={15} />}
        {t(playing === v.id ? "stopSample" : failedSample === v.id ? "retryAudio" : "listen")}
      </button>
      <button aria-label={t("deleteName", { name: v.name })} onClick={() => { setDeleteError(""); setRemoving(v); }}><Trash2 size={16} aria-hidden /></button>
      </div>
    </li>)}</ul>
    {list.hasNextPage && <button disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>{t("more")}</button>}
    {removing && <Dialog label={t("deleteName", { name: removing.name })} onClose={() => { if (!deleteLock.current) setRemoving(null); }}>
      <h2>{t("deleteName", { name: removing.name })}</h2><p>{t("deleteInfo")}</p>
      {deleteError && <p role="alert">{deleteError}</p>}
      <div className="seed-actions"><button autoFocus disabled={deleting} onClick={() => setRemoving(null)}>{t("cancel")}</button>
        <button className="dub-delete-confirm" disabled={deleting} onClick={() => void remove()}>{t("delete")}</button></div>
    </Dialog>}
  </section>;
}

function Designer({ scope, actorId, model, policy, initialId, onReset, onClose, onSaved }: {
  scope: string; actorId: string; model: VoiceCatalog["models"][number]; policy: VoiceCatalog["policy"];
  initialId: string; onReset: () => void; onClose: () => void; onSaved: (voice: CustomVoice) => void;
}) {
  const { t, i18n } = useTranslation("seedSetup");
  const client = useQueryClient();
  const [mode, setMode] = useState<"description" | "reference">("description");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("");
  const typedStyle = genreOf(description);
  const baseDescription = typedStyle ? description.trimEnd().slice(0, -typedStyle[1].length).trimEnd() : description.trim();
  const selectedStyle = style || typedStyle?.[1] || "";
  const directedDescription = [baseDescription, selectedStyle].filter(Boolean).join("\n");
  const languages = model.capabilities.languages || [];
  const [language, setLanguage] = useState(languages.includes(i18n.language) ? i18n.language : languages[0] || "");
  const [gender, setGender] = useState<VoiceDesignInput["voiceGender"]>("unspecified");
  const [sampleText, setSampleText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [quote, setQuote] = useState<DesignQuote | null>(null);
  const creditsEnabled = useWorkspaceCredits();
  const [opId, setOpId] = useState(initialId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!file) { setFileUrl(""); return; }
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const operationKey = ["dubVoice", scope, "operation", opId];
  const op = useQuery({
    queryKey: operationKey, queryFn: () => voiceApi.operation(opId), enabled: Boolean(opId) && !busy,
    refetchInterval: q => pollingPolicy.comparison(Boolean(q.state.data && workingStates.includes(q.state.data.status))),
  });
  const candidate = op.data?.customVoice;
  const previewReady = candidate?.lifecycleState === "ready";
  const missing = op.error && "status" in op.error && op.error.status === 404;
  const unavailable = op.data?.status === "succeeded" && !previewReady;
  const valid = name.trim() && language && sampleText.trim() && (!policy.maxDesignLength || directedDescription.length <= Number(policy.maxDesignLength)) && (mode === "description" ? description.trim() : file);
  const locked = Boolean(opId) || busy;
  async function run(fn: (verify: () => void) => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    const { epoch } = getIdentitySnapshot();
    const verify = () => { assertIdentityEpoch(epoch); if (!alive.current) throw new Error("unmounted"); };
    setBusy(true);
    setError("");
    try { await fn(verify); }
    catch (e) {
      if (!alive.current || getIdentitySnapshot().epoch !== epoch) return;
      const issue = e instanceof Error ? e.message : "";
      setError(issue === "referenceFile" || issue === "referenceDuration" ? t(issue)
        : t("failed", { code: e && typeof e === "object" && "code" in e ? String(e.code) : "" }));
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  function prepareSample() {
    if (creditsEnabled === undefined || !valid || locked) return;
    void run(async verify => {
      const referenceAudio = mode === "reference" && file ? await prepareSeedReference(file) : undefined;
      verify();
      const input = { name: name.trim(), description: directedDescription, language, modelId: model.id,
        sampleText: sampleText.trim(), sourceType: mode, voiceGender: gender, ...(referenceAudio ? { referenceAudio, retainOriginal: true } : {}) };
      if (!creditsEnabled) {
        const { id, requestId } = createSpeechRequest();
        await submitDesign(input, id, requestId, verify);
        return;
      }
      const price = await voiceApi.quoteVoiceDesign(input);
      verify();
      setQuote({ price, input, requestId: crypto.randomUUID() });
    });
  }
  function generate() {
    if (!creditsEnabled || !quote || locked) return;
    if (quote.price.expiresAt && Date.parse(quote.price.expiresAt) <= Date.now()) {
      setQuote(null); setError(t("expired")); return;
    }
    void run(verify => submitDesign(quote.input, quote.price.id, quote.requestId, verify));
  }
  async function submitDesign(input: VoiceDesignInput, id: string, requestId: string, verify: () => void) {
    writeActorScopedDraft({ actorId, feature, schemaVersion: 1, payload: id });
    setOpId(id);
    const submitted = await voiceApi.designVoice({ ...input, quoteId: id, requestId });
    verify();
    client.setQueryData(["dubVoice", scope, "operation", id], submitted);
    setQuote(null);
  }
  function reset() {
    removeActorScopedDraft(actorId, feature);
    onReset();
    setOpId(""); setQuote(null); setError("");
  }
  function discard() {
    void run(async verify => {
      if (candidate && !candidate.savedAt) await voiceApi.deleteCustomVoice(candidate.id);
      verify(); reset();
    });
  }
  function save() {
    if (!candidate || !previewReady) return;
    void run(async verify => {
      const saved = candidate.savedAt ? candidate : await voiceApi.saveCustomVoice(candidate.id);
      verify();
      removeActorScopedDraft(actorId, feature);
      void client.invalidateQueries({ queryKey: ["dubVoice", scope] });
      onSaved(saved);
    });
  }
  return <section className="seed-designer">
    <h2>{t("create")}</h2>
    {!opId && <form onSubmit={e => { e.preventDefault(); if (!creditsEnabled || !quote) prepareSample(); }}
      onChange={() => { setQuote(null); setError(""); }}>
      <fieldset disabled={locked}>
        <legend>{t("source")}</legend>
        <div className="seed-source-options">{(["description", "reference"] as const).map(type =>
          <label key={type}><input type="radio" name="seed-source" checked={mode === type} onChange={() => { setMode(type); setFile(null); }} />
            {type === "reference" ? <AudioLines size={16} aria-hidden /> : <FileText size={16} aria-hidden />}{t(type)}</label>)}</div>
        <label>{t("name")}<input required value={name} maxLength={Number(policy.maxTitleLength) || undefined} onChange={e => setName(e.target.value)} /></label>
        <div className="seed-pair">
          <label>{t("language")}<select value={language} onChange={e => setLanguage(e.target.value)}>{languages.map(l =>
            <option key={l} value={l}>{new Intl.DisplayNames([i18n.language], { type: "language" }).of(l)}</option>)}</select></label>
          <label>{t("gender")}<select value={gender} onChange={e => setGender(e.target.value as VoiceDesignInput["voiceGender"])}>{["unspecified", "female", "male"].map(k =>
            <option value={k} key={k}>{t(k)}</option>)}</select></label>
        </div>
        {mode === "reference" && <>
          <label>{t("recording")}<input type="file" accept={config.acceptedReferenceExtensions.join(",")} onChange={e => setFile(e.target.files?.[0] || null)} /></label>
          <small>{t(creditsEnabled ? "fileHint" : "directFileHint", { seconds: config.maximumReferenceSeconds, mb: config.maximumReferenceBytes / 1048576 })}</small>
          {fileUrl && <audio src={fileUrl} controls preload="metadata" aria-label={t("recording")} />}
          <small>{t("retain")}</small>
        </>}
        <label>{t("genre")}<select value={selectedStyle} onChange={e => {
          if (typedStyle) setDescription(baseDescription);
          setStyle(e.target.value);
        }}>
          <option value="">{t("genres.none")}</option>
          {genres.map(([id, phrase]) => <option key={id} value={phrase} disabled={Boolean(policy.maxDesignLength && [baseDescription, phrase].filter(Boolean).join("\n").length > Number(policy.maxDesignLength))}>{t("genres." + id)}</option>)}
        </select></label>
        <label>{t(mode === "reference" ? "optionalNotes" : "describe")}<textarea rows={3} required={mode === "description"} value={description}
          placeholder={t("descriptionExample")} maxLength={policy.maxDesignLength ? Number(policy.maxDesignLength) - (style ? style.length + 1 : 0) : undefined} onChange={e => setDescription(e.target.value)} /></label>
        {style && <small lang="en">{style}</small>}
        <label>{t("sampleText")}<textarea rows={2} required value={sampleText} maxLength={policy.maxTextLength} onChange={e => setSampleText(e.target.value)} /></label>
      </fieldset>
      {creditsEnabled === false && <small>{t("directProvider")}</small>}
      {creditsEnabled && quote && <p role="status">{t("price", { credits: quote.price.totalCredits })}</p>}
      <div className="seed-actions">{creditsEnabled && quote
        ? <button className="primary" disabled={busy} type="button" onClick={generate}>{t("generate")}</button>
        : <button className="primary" disabled={creditsEnabled === undefined || !valid || busy} type="submit">{t(creditsEnabled ? "quote" : "generate")}</button>}
        <button type="button" disabled={busy} onClick={onClose}>{t("cancel")}</button></div>
    </form>}
    {opId && <div className="seed-preview" aria-live="polite">
      {previewReady ? <>
        <strong>{candidate.name}</strong>
        {op.data?.snapshot?.directionSource === "form" && <small>{t("formDirection")}</small>}
        {mode === "reference" && fileUrl && <label>{t("recording")}<audio src={fileUrl} controls /></label>}
        <label>{t("preview")}<Sample src={candidate.audioUrl} label={t("preview")} /></label>
        {op.data?.snapshot?.providerPrompt && <details><summary>{t("sentPrompt")}</summary>
          <p style={{whiteSpace: "pre-wrap", overflowWrap: "anywhere"}}>{op.data.snapshot.providerPrompt}</p></details>}
        <div className="seed-actions"><button className="primary" disabled={busy} onClick={save}>{t("save")}</button>
          {!candidate.savedAt && <button disabled={busy} onClick={discard}>{t("discard")}</button>}</div>
      </> : <>
        {(!op.data || workingStates.includes(op.data.status)) && !op.isError && <ProcessingSpinner variant="wave" className="seed-generation-wave" />}
        <p>{t(unavailable || missing ? "unavailableCandidate" : op.isError ? "statusError" : op.data?.status === "reconciliation_required" ? "review" :
          op.data?.status === "failed" ? (["speech_direction_needs_english", "speech_direction_translation_unavailable"].includes(op.data.errorCode ?? "") ? "needsEnglish" : op.data.errorCode === "speech_invalid_wav" ? "unusableSample" : "generationFailed") : op.data?.status === "quoted" ? "notSubmitted" : "pending")}</p>
        {op.data?.status !== "failed" && <button disabled={busy || op.isFetching} onClick={() => void op.refetch()}>{t("check")}</button>}
        {(op.data?.status === "failed" || op.data?.status === "quoted" || unavailable || missing) && <button disabled={busy} onClick={reset}>{t("newQuote")}</button>}
      </>}
    </div>}
    {error && <p role="alert">{error}</p>}
    {busy && !opId && <ProcessingSpinner className="small-spinner" />}
  </section>;
}

export default function DubbingVoiceSetup(props: ReturnProps) {
  const { actor, identityScope } = useActor();
  return <Workspace key={identityScope} scope={identityScope} actorId={actor?.userId || ""} {...props} />;
}

function Workspace({ scope, actorId, onReturn }: ReturnProps & {scope: string; actorId: string}) {
  const { t } = useTranslation("seedSetup");
  const [pendingId] = useState(() => readActorScopedDraft({ actorId, feature, schemaVersion: 1, fallback: "" }));
  const [adding, setAdding] = useState(Boolean(pendingId));
  const [saved, setSaved] = useState<CustomVoice>();
  const [initialId, setInitialId] = useState(typeof pendingId === "string" ? pendingId : "");
  const catalog = useQuery({ queryKey: ["dubVoice", scope, "catalog"], queryFn: voiceApi.catalog });
  const model = catalog.data?.models.find(m => m.id === config.modelId);
  const enabled = Boolean(model?.capabilities.voiceDesign && model.enabled !== false && model.available !== false);
  return <section className="seed-setup">
    <header><h1>{t("title")}</h1>
      {onReturn && <button onClick={() => onReturn(saved)}>{t("return")}</button>}
      {!adding && <button className="primary" disabled={!enabled} onClick={() => { setSaved(undefined); setAdding(true); }}><Plus size={16} aria-hidden />{t("create")}</button>}
    </header>
    {catalog.isPending ? <ProcessingSpinner className="small-spinner" /> : catalog.isError
      ? <button onClick={() => void catalog.refetch()}>{t("reload")}</button> : !enabled && <p role="status">{t("unavailable")}</p>}
    {adding && (enabled || initialId) && model && catalog.data
      ? <Designer scope={scope} actorId={actorId} initialId={initialId} model={model} policy={catalog.data.policy}
        onReset={() => setInitialId("")} onClose={() => setAdding(false)} onSaved={voice => { setInitialId(""); setAdding(false); setSaved(voice); if (onReturn) onReturn(voice); }} />
      : <>{saved && <p role="status">{t("saved", { name: saved.name })}</p>}<SavedVoices scope={scope} maxTitleLength={Number(catalog.data?.policy.maxTitleLength) || undefined} /></>}
  </section>;
}
