import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useBlocker, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Mic, Play, Plus, Save, Square } from "lucide-react";
import { voiceApi } from "../../../../../web/src/features/voice-studio/api/voiceStudioApi";
import type { DialogueRow, VoiceDocument } from "../../../../../web/src/features/voice-studio/schemas/voiceStudioSchemas";
import { assertIdentityEpoch } from "../../../../../web/src/lib/auth/actorStore";
import { getIdentitySnapshot, ProcessingSpinner, useActor } from "../../../lib/canonical";
import { useWorkspaceCredits } from "../../../lib/workspaceConfig";
import { Dialog } from "../Dialog";
import { loadDubbingChoices } from "../dubbingCharacters";
import config from "../editor-config.json";
import { scriptsPath } from "./AudioScripts";
import { ScriptLine, type AudioControls } from "./ScriptLine";
import { ScriptSpeaker } from "./ScriptSpeaker";
import { useAudioScriptActions } from "./useAudioScriptActions";

export default function AudioScriptEditor() {
  const { id = "" } = useParams();
  const { identityScope } = useActor();
  const { t } = useTranslation("audioScripts");
  const doc = useQuery({ queryKey: ["audio-scripts", identityScope, id], queryFn: () => voiceApi.document(id), refetchOnWindowFocus: false });
  if (doc.isPending) return <p role="status"><ProcessingSpinner /> {t("loading")}</p>;
  if (doc.isError || doc.data.kind !== "audio-script" || doc.data.archivedAt) return <section>
    <p role="alert">{t("scriptUnavailable")}</p><Link to={scriptsPath}>{t("title")}</Link>
    {doc.isError && <button onClick={() => void doc.refetch()}>{t("retry")}</button>}
  </section>;
  return <Editor key={identityScope + "/" + id} initial={doc.data} scope={identityScope} />;
}

function Editor({ initial, scope }: { initial: VoiceDocument; scope: string }) {
  const { t, i18n } = useTranslation("audioScripts");
  const client = useQueryClient();
  const creditsEnabled = useWorkspaceCredits();
  const [draft, setDraft] = useState(initial);
  const saved = useRef(initial);
  const latest = useRef(initial);
  const activeSave = useRef<Promise<VoiceDocument> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [speakerRow, setSpeakerRow] = useState("");
  const [removeId, setRemoveId] = useState("");
  const [focusRow, setFocusRow] = useState("");
  const catalog = useQuery({ queryKey: ["dubVoice", scope, "catalog"], queryFn: voiceApi.catalog });
  const choices = useQuery({ queryKey: ["dub-speaker-choices", scope, draft.language], queryFn: () => loadDubbingChoices(draft.language) });
  const model = catalog.data?.models.find(m => m.id === draft.modelId);
  const voices = choices.data?.voices ?? [];
  const characters = choices.data?.characters.filter(c => c.voiceKind === "custom" && voices.some(v => v.id === c.voiceId)) || [];
  const dirty = draft !== saved.current;
  const publish = useCallback((next: VoiceDocument) => {
    latest.current = next;
    setDraft(next);
  }, []);
  const apply = useCallback((next: VoiceDocument) => {
    saved.current = next;
    publish(next);
    setSaveError("");
    client.setQueryData(["audio-scripts", scope, next.id], next);
    void client.invalidateQueries({ queryKey: ["audio-scripts", scope, "list"] });
  }, [client, publish, scope]);
  const persist = useCallback(async () => {
    if (activeSave.current) return activeSave.current;
    const snapshot = latest.current;
    if (snapshot === saved.current) return snapshot;
    const { epoch } = getIdentitySnapshot();
    setSaving(true);
    const request = voiceApi.saveDocument(snapshot).then(doc => {
      assertIdentityEpoch(epoch);
      apply(doc);
      return doc;
    }).catch((e: unknown) => {
      const conflict = e && typeof e === "object" && ("status" in e && e.status === 409 || "code" in e && e.code === "voice_revision_conflict");
      setSaveError(conflict ? "conflict" : "saveError");
      throw e;
    }).finally(() => { activeSave.current = null; setSaving(false); });
    activeSave.current = request;
    return request;
  }, [apply]);
  const actions = useAudioScriptActions({ document: draft, persist, apply, creditsEnabled });
  const busy = saving || actions.busy || actions.pendingCredits !== null;
  const canGenerate = Boolean(model && model.available !== false && model.enabled !== false && creditsEnabled !== undefined);
  const blocker = useBlocker(dirty || actions.busy);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!focusRow) return;
    const line = window.document.getElementById("audio-line-" + focusRow);
    line?.focus();
    setFocusRow("");
  }, [focusRow]);
  function updateRow(id: string, changes: Partial<DialogueRow>) {
    const doc = latest.current;
    publish({ ...doc, rows: doc.rows.map(row => {
      if (row.id !== id) return row;
      const next = { ...row, ...changes };
      if (("text" in changes || "characterPresetId" in changes || "delivery" in changes || "audioConfig" in changes) && next.selectedTakeId) {
        next.selectedTakeCurrent = false;
      }
      return next;
    }) });
  }
  function addRow() {
    const doc = latest.current;
    const row = { id: crypto.randomUUID(), enabled: true, text: "", characterPresetId: doc.rows.at(-1)?.characterPresetId || "", delivery: {}, selectedTakeId: null, pauseAfterMs: 0 };
    publish({ ...doc, rows: [...doc.rows, row] });
    setFocusRow(row.id);
  }
  function move(index: number, delta: number) {
    const rows = [...latest.current.rows];
    const to = index + delta;
    if (to < 0 || to >= rows.length) return;
    const [row] = rows.splice(index, 1);
    rows.splice(to, 0, row);
    publish({ ...latest.current, rows });
    setFocusRow(row.id);
  }
  const enabled = draft.rows.filter(r => r.enabled);
  const missing = enabled.filter(r => !r.selectedTakeId || !r.selectedTakeCurrent);
  const complete = Boolean(enabled.length && !missing.length && !busy);
  const eligible = missing.every(row => row.text.trim() && characters.some(c => c.id === row.characterPresetId));
  const removeIndex = draft.rows.findIndex(row => row.id === removeId);
  const policy = catalog.data?.policy;
  const languages = new Intl.DisplayNames([i18n.language], { type: "language" });
  return <section className="audio-scripts as-editor">
    <Link className="as-back" to={scriptsPath}><ArrowLeft size={15} aria-hidden />{t("title")}</Link>
    <header className="as-page-head">
      <div><h1>{draft.title}</h1><span className="as-meta">{languages.of(draft.language)} · {t("lineCount", { count: draft.rows.length })}</span></div>
      <div className="as-actions"><span role="status">{t(saving ? "saving" : dirty ? "unsaved" : "saved")}</span>
        <button disabled={!dirty || busy} onClick={() => void persist().catch(() => {})}><Save size={16} aria-hidden />{t("save")}</button></div>
    </header>
    {saveError && <p role="alert" className="as-error">{t(saveError)} {saveError === "conflict" && <button onClick={async () => {
      const { epoch } = getIdentitySnapshot();
      try { const fresh = await voiceApi.document(initial.id); assertIdentityEpoch(epoch); apply(fresh); } catch { setSaveError("saveError"); }
    }}>{t("reload")}</button>}</p>}
    {!!actions.errors._ && <p className="as-error" role="alert">{actions.errors._}</p>}
    <section aria-label={t("whole")} className="as-whole">
      <div><h2>{t("whole")}</h2><span role="status">{t("readyCount", { ready: enabled.length - missing.length, total: enabled.length })}</span></div>
      <div className="as-actions">
        <button className="primary" disabled={busy || !canGenerate || !missing.length || !eligible} onClick={() => void actions.generate()}>
          <Mic size={16} aria-hidden />{t("generateMissing", { count: missing.length })}
        </button>
        {actions.playing === "all" ? <button onClick={actions.stop}><Square size={16} aria-hidden />{t("stop")}</button>
          : <button disabled={!complete} onClick={() => void actions.play()}><Play size={16} aria-hidden />{t("playAll")}</button>}
        <button disabled={!complete} onClick={() => void actions.download()}><Download size={16} aria-hidden />{t("downloadAll")}</button>
      </div>
      {!!missing.length && <p className="as-missing">{t("missing", { lines: missing.map(row => draft.rows.indexOf(row) + 1).join(", ") })}</p>}
    </section>
    {catalog.isPending && <p role="status"><ProcessingSpinner /> {t("loading")}</p>}
    {catalog.isError && <p role="alert">{t("loadError")} <button onClick={() => void catalog.refetch()}>{t("retry")}</button></p>}
    {choices.isPending && <p role="status"><ProcessingSpinner /> {t("voiceLoading")}</p>}
    {choices.isError && <p role="alert">{t("voiceError")} <button onClick={() => void choices.refetch()}>{t("retry")}</button></p>}
    {choices.isSuccess && !voices.length && <p className="as-voice-note">{t("noVoices")}</p>}
    {policy && <div className="as-lines">{draft.rows.map((row, index) => <ScriptLine key={row.id} row={row} index={index}
      count={draft.rows.length} current={Boolean(row.selectedTakeId && row.selectedTakeCurrent)} busy={busy} canGenerate={canGenerate}
      choicesReady={choices.isSuccess} characters={characters} voices={voices} policy={policy} controls={model?.capabilities.audioControls as AudioControls | undefined}
      actions={actions} update={changes => updateRow(row.id, changes)} move={delta => move(index, delta)}
      remove={() => setRemoveId(row.id)} newSpeaker={() => setSpeakerRow(row.id)} />)}</div>}
    <button className="as-add-line" disabled={busy || !policy || draft.rows.length >= policy.maxRows} onClick={addRow}><Plus size={17} aria-hidden />{t("addLine")}</button>
    {speakerRow && <ScriptSpeaker playback={actions} voices={voices} characters={characters} language={draft.language}
      color={config.speakerColors[characters.length % config.speakerColors.length]}
      onClose={() => setSpeakerRow("")} onRefresh={() => choices.refetch()}
      onUse={c => { updateRow(speakerRow, { characterPresetId: c.id }); setSpeakerRow(""); }} />}
    {removeIndex !== -1 && <Dialog label={t("remove")} onClose={() => setRemoveId("")}><div className="as-dialog">
      <p>{t("removeConfirm", { number: removeIndex + 1 })}</p><div className="as-actions"><button onClick={() => setRemoveId("")}>{t("cancel")}</button>
        <button onClick={() => { const rows = latest.current.rows.filter(r => r.id !== removeId); publish({ ...latest.current, rows }); setRemoveId(""); setFocusRow(rows[Math.min(removeIndex, rows.length - 1)]?.id || ""); }}>{t("remove")}</button></div>
    </div></Dialog>}
    {actions.pendingCredits !== null && <Dialog label={t("confirmGen")} onClose={actions.cancelConfirmation}><div className="as-dialog">
      <h2>{t("confirmGen")}</h2><p>{t("cost", { credits: actions.pendingCredits })}</p><div className="as-actions">
        <button onClick={actions.cancelConfirmation}>{t("cancel")}</button><button className="primary" onClick={() => void actions.confirmGeneration()}>{t("confirmGen")}</button>
      </div></div></Dialog>}
    {blocker.state === "blocked" && <Dialog label={t("unsaved")} onClose={blocker.reset}><div className="as-dialog">
      <p>{t(actions.busy ? "generating" : "unsaved")}</p><div className="as-actions"><button onClick={blocker.reset}>{t("cancel")}</button>
        {!actions.busy && <><button onClick={blocker.proceed}>{t("leave")}</button><button className="primary" disabled={saving} onClick={() => void persist().then(blocker.proceed).catch(() => blocker.reset())}>{t("saveLeave")}</button></>}
      </div></div></Dialog>}
  </section>;
}
