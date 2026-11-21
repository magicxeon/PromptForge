import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { voiceApi } from "../../../../web/src/features/voice-studio/api/voiceStudioApi";
import { assertIdentityEpoch } from "../../../../web/src/lib/auth/actorStore";
import { getIdentitySnapshot, ProcessingSpinner, useActor } from "../../lib/canonical";
import { usePrivateImage } from "../../components/media/MediaImage";
import { Dialog } from "./Dialog";
import config from "./editorConfig";
import { loadDubbingChoices } from "./dubbingCharacters";
import { BatchControls } from "./BatchControls";
import { timeLabel, type Project } from "./projectApi";

const Setup = lazy(() => import("./DubbingVoiceSetup"));
type Profile = Project["speakerProfiles"][string];
type Row = Profile & { speaker: string; voice?: string; start: number; end: number };

function speakerRows(project: Project): Row[] {
  const seen = new Set<string>();
  const rows: Row[] = [];
  for (const cue of project.cues) {
    if (!cue.speaker || seen.has(cue.speaker)) continue;
    seen.add(cue.speaker);
    const profile = project.speakerProfiles?.[cue.speaker] ?? {
      name: cue.speaker, gender: cue.speakerVoiceType || "unknown", style: "", voiceNames: {},
      color: config.speakerColors[rows.length % config.speakerColors.length],
    };
    rows.push({ ...profile, speaker: cue.speaker, start: cue.startMs, end: cue.endMs });
  }
  return rows;
}

export function SpeakerReview({ project, language, setup, openSetup, returnToEditor, onClose, onSave, onLanguage, onReload, onDetect, onAssign }: {
  project: Project; language: string; setup: boolean; openSetup: () => void; returnToEditor: () => void; onClose: () => void;
  onSave: (profiles: Project["speakerProfiles"], mappings: Project["characterMappings"]) => Promise<Project>;
  onLanguage: (language: string) => void; onReload: () => Promise<void>;
  onDetect?: () => Promise<Project>; onAssign: (id:string, speaker:string) => Promise<Project>;
}) {
  const { t } = useTranslation("dub");
  const { identityScope } = useActor();
  const client = useQueryClient();
  const choices = useQuery({ queryKey: ["dub-speaker-choices", identityScope, language], queryFn: () => loadDubbingChoices(language) });
  const [rows, setRows] = useState(() => speakerRows(project));
  const [editing, setEditing] = useState("");
  const [sample, setSample] = useState<{speaker:string;url:string} | null>(null);
  const [originalSpeaker, setOriginalSpeaker] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [canExitBatch, setCanExitBatch] = useState(false);
  const [closing, setClosing] = useState(false);
  const [castVersion, setCastVersion] = useState(0);
  const blocked = busy || batchBusy || closing;
  const unassigned = project.cues.filter(c => !c.speaker?.trim());
  const availableVoices = new Set(choices.data?.voices.map(v => v.id));
  const characterVoices = new Map(choices.data?.characters.filter(c => c.voiceKind === "custom").map(c => [c.id,c.voiceId]));
  const castVoices = new Map(rows.map(row => [row.speaker, row.voice ?? characterVoices.get(project.characterMappings[language]?.[row.speaker])]));
  const missingInputs = project.cues.filter(c => {
    const binding = c.voiceBindings[language];
    const voice = binding?.characterId && !binding.usesSpeakerMapping ? characterVoices.get(binding.characterId) : castVoices.get(c.speaker || "");
    const text = binding?.dubText ?? c.translations[language] ?? (project.sourceLanguage === language ? c.text : "");
    return !text.trim() || !voice || !availableVoices.has(voice);
  });
  async function closeCasting() {
    if (closing || busy || (batchBusy && !canExitBatch)) return;
    if (canExitBatch) {
      setClosing(true);
      try { await onReload(); }
      catch (e) { setErr((e as Error).message); setClosing(false); return; }
    }
    onClose();
  }
  async function updateSpeakers(action: () => Promise<Project>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setErr("");
    try {
      const next = await action();
      setRows(previous => speakerRows(next).map(r => previous.find(v => v.speaker === r.speaker) ?? r));
      if (next.cues.every(c => !c.speaker)) setErr(t("casting.empty"));
    } catch (e) { setErr((e as Error).message); }
    finally { lock.current = false; setBusy(false); }
  }
  const lock = useRef(false);
  const media = usePrivateImage(sample?.url);
  const original = useRef<HTMLAudioElement>(null);
  const until = useRef(0);
  function change(key: string, patch: Partial<Row>) {
    setCastVersion(v => v+1);
    setRows(prev => prev.map(row => row.speaker === key ? { ...row, ...patch } : row));
  }
  function listen(row: Row) {
    const el = original.current;
    if (!el) return;
    if (originalSpeaker === row.speaker && !el.paused) { el.pause(); return; }
    setSample(null); setOriginalSpeaker(row.speaker); until.current = row.end / 1000;
    el.currentTime = row.start / 1000;
    void el.play().catch(() => { setOriginalSpeaker(""); setErr(t("casting.audioError")); });
  }
  useEffect(() => {
    if (!setup && editing) document.getElementById("dub-preset-" + editing)?.focus();
  }, [setup, editing]);
  async function save(close: boolean): Promise<Project> {
    if (lock.current || !choices.data) throw new Error(t("casting.unavailable"));
    lock.current = true; setBusy(true); setErr("");
    const { epoch } = getIdentitySnapshot();
    try {
      const characters = [...choices.data.characters];
      const mappings = { ...project.characterMappings[language] };
      const profiles = { ...project.speakerProfiles };
      for (const row of rows) {
        const voiceNames = { ...row.voiceNames };
        if (row.voice !== undefined) {
          const selected = choices.data.voices.find(v => v.id === row.voice);
          if (row.voice && !selected) throw new Error(t("casting.unavailable"));
          if (selected) {
            let character = characters.find(c => c.voiceKind === "custom" && c.voiceId === selected.id);
            if (!character) {
              assertIdentityEpoch(epoch);
              character = await voiceApi.saveCharacter({ name: selected.name, color: row.color, voiceKind: "custom", voiceId: selected.id });
              characters.push(character);
            }
            mappings[row.speaker] = character.id; voiceNames[language] = selected.name;
          } else { delete mappings[row.speaker]; delete voiceNames[language]; }
        }
        profiles[row.speaker] = { name: row.name.trim(), color: row.color, style: row.style.trim(), gender: row.gender, voiceNames };
      }
      assertIdentityEpoch(epoch);
      await client.invalidateQueries({ queryKey: ["dubVoice", identityScope, "characters"] });
      assertIdentityEpoch(epoch);
      const saved = await onSave(profiles, { ...project.characterMappings, [language]: mappings });
      if (close) onClose();
      return saved;
    } catch (e) { setErr((e as Error).message); throw e; }
    finally { lock.current = false; setBusy(false); }
  }
  if (setup) return <Suspense fallback={<ProcessingSpinner />}><Setup onReturn={voice => {
    if (voice?.language === language && editing) change(editing, { voice: voice.id });
    void choices.refetch(); returnToEditor();
  }} /></Suspense>;
  return <Dialog label={t("casting.batchTitle")} onClose={() => void closeCasting()}>
    <div className="dub-casting">
      <header className="dub-cast-header"><div><h2>{t("casting.batchTitle")}</h2>
        <p>{t("casting.summary", { count: rows.length, language: t("lang." + language) })}</p></div>
        <div className="dub-cast-toolbar">
        <label>{t("target")}<select value={language} disabled={blocked} onChange={e => {
          const next = e.target.value;
          if (choices.data && rows.length) void save(false).then(() => onLanguage(next)).catch(() => {});
          else onLanguage(next);
        }}>{project.targetLanguages.map(l => <option key={l} value={l}>{t("lang." + l)}</option>)}</select></label>
        <button disabled={blocked} onClick={() => {
          original.current?.pause(); setSample(null);
          setEditing(rows.find(r => !castVoices.get(r.speaker))?.speaker || "");
          openSetup();
        }}>{t("casting.setup")}</button></div></header>
      {choices.isLoading && <ProcessingSpinner />}
      {choices.isError && <button onClick={() => void choices.refetch()}>{t("casting.retry")}</button>}
      {unassigned.length > 0 && <section>
        {onDetect && <button disabled={blocked} onClick={() => void updateSpeakers(onDetect)}>{t("casting.detect")}</button>}
        <details><summary>{t("casting.unidentified", {count:unassigned.length})}</summary>
          {unassigned.map(c => <label key={c.id}>{timeLabel(c.startMs)} · {c.translations[language] || c.text}
            <input list="dub-known-speakers" disabled={blocked} placeholder={t("casting.name")} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} onBlur={e => {
              const name = e.target.value.trim(); if (name) void updateSpeakers(() => onAssign(c.id,name));
            }} /></label>)}
          <datalist id="dub-known-speakers">{rows.map(r => <option key={r.speaker} value={r.speaker} />)}</datalist>
        </details></section>}
      <audio preload="none" src={project.mediaUrl || undefined} ref={original} onPause={() => setOriginalSpeaker("")} onTimeUpdate={e => {
        if (e.currentTarget.currentTime >= until.current) e.currentTarget.pause();
      }} />
      {rows.map(row => {
        const assigned = choices.data?.characters.find(c => c.id === project.characterMappings[language]?.[row.speaker]);
        const id = row.voice ?? assigned?.voiceId ?? project.characterMappings[language]?.[row.speaker] ?? "";
        const voice = choices.data?.voices.find(v => v.id === id);
        return <fieldset key={row.speaker} className="dub-cast-row" disabled={blocked} aria-label={row.name}>
          <div className="dub-cast-person"><i style={{ background: row.color }} /><div><strong>{row.name}</strong>
            <small>{t("casting." + row.gender)} · {t("casting.cues",{count:project.cues.filter(c=>c.speaker===row.speaker).length})}</small></div></div>
          <label>{t("casting.voice")}<select aria-label={t("casting.voice")} id={"dub-preset-" + row.speaker} value={id} onChange={e => {setSample(null);change(row.speaker, { voice: e.target.value });}}>
            <option value="">{t("casting.unassigned")}</option>
            {id && !voice && <option value={id} disabled>{assigned?.name || t("casting.unavailable")}</option>}
            {choices.data?.voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
          <div className="dub-cast-actions">
            <button disabled={!project.mediaUrl} onClick={() => listen(row)}>{t(originalSpeaker === row.speaker ? "casting.stop" : "casting.original")}</button>
            <button disabled={!voice?.audioUrl} onClick={() => {
              original.current?.pause();
              setSample(sample?.speaker === row.speaker || !voice?.audioUrl ? null : {speaker:row.speaker,url:voice.audioUrl});
            }}>{t(sample?.speaker === row.speaker ? "casting.stop" : "casting.listen")}</button>
          </div>
          <details><summary>{t("casting.details")}</summary><div className="dub-cast-fields">
            <label>{t("casting.name")}<input maxLength={120} value={row.name} onChange={e => change(row.speaker, { name: e.target.value })} /></label>
            <label>{t("casting.gender")}<select value={row.gender} onChange={e => change(row.speaker, { gender: e.target.value })}>
              {["unknown","female","male","other"].map(g => <option value={g} key={g}>{t("casting." + g)}</option>)}</select></label>
            <label>{t("casting.color")}<input type="color" value={row.color} onChange={e => change(row.speaker, { color: e.target.value })} /></label>
            <label>{t("casting.style")}<input maxLength={300} value={row.style} onChange={e => change(row.speaker, { style: e.target.value })} /></label>
          </div></details>
        </fieldset>;
      })}
      {sample && media.url && <audio autoPlay key={sample.speaker + media.url} src={media.url} onEnded={() => setSample(null)} onError={() => { setSample(null); setErr(t("casting.audioError")); }} />}
      {(err || media.error) && <p role="alert">{err || t("casting.audioError")}</p>}
      {busy && <ProcessingSpinner />}
      <BatchControls project={project} language={language} onBusy={setBatchBusy} onReload={onReload} onCanExit={setCanExitBatch} castVersion={castVersion}
        missingInputs={missingInputs} closing={closing}
        canPrepare={!busy && !!choices.data && !project.tracks[language]?.locked && rows.every(r=>r.name.trim())}
        save={() => save(false)} />
      <footer className="dub-cast-footer"><button onClick={() => void closeCasting()} disabled={busy || (batchBusy && !canExitBatch)}>{t(canExitBatch ? "casting.pauseClose" : "casting.close")}</button>
        <button disabled={blocked || !choices.data || !rows.length || rows.some(r => !r.name.trim())} onClick={() => void save(true).catch(() => {})}>{t("casting.save")}</button></footer>
    </div>
  </Dialog>;
}
