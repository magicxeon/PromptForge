import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { voiceApi } from "../../../../web/src/features/voice-studio/api/voiceStudioApi";
import type { CustomVoice } from "../../../../web/src/features/voice-studio/schemas/voiceStudioSchemas";
import { assertIdentityEpoch } from "../../../../web/src/lib/auth/actorStore";
import { getIdentitySnapshot, ProcessingSpinner, useActor } from "../../lib/canonical";
import { usePrivateImage } from "../../components/media/MediaImage";
import { Dialog } from "./Dialog";
import config from "./editorConfig";
import { activeCharacters } from "./dubbingCharacters";
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
      name: cue.speaker, gender: "unknown", style: "", voiceNames: {},
      color: config.speakerColors[rows.length % config.speakerColors.length],
    };
    rows.push({ ...profile, speaker: cue.speaker, start: cue.startMs, end: cue.endMs });
  }
  return rows;
}

async function loadChoices(language: string) {
  const { epoch } = getIdentitySnapshot();
  const voices: CustomVoice[] = [];
  let cursor: string | undefined;
  do {
    assertIdentityEpoch(epoch);
    const params = new URLSearchParams({ saved: "true", limit: "50" });
    if (cursor) params.set("cursor", cursor);
    const page = await voiceApi.customVoices(params);
    voices.push(...page.items.filter(v => v.modelId === "dola-seed-audio" && v.language === language && v.savedAt && v.lifecycleState === "ready"));
    cursor = page.nextCursor || undefined;
  } while (cursor);
  assertIdentityEpoch(epoch);
  const characters = await activeCharacters();
  return { voices, characters };
}

export function SpeakerReview({ project, language, setup, openSetup, returnToEditor, onClose, onSave }: {
  project: Project; language: string; setup: boolean; openSetup: () => void; returnToEditor: () => void; onClose: () => void;
  onSave: (profiles: Project["speakerProfiles"], mappings: Project["characterMappings"]) => Promise<void>;
}) {
  const { t } = useTranslation("dub");
  const { identityScope } = useActor();
  const client = useQueryClient();
  const choices = useQuery({ queryKey: ["dub-speaker-choices", identityScope, language], queryFn: () => loadChoices(language) });
  const [rows, setRows] = useState(() => speakerRows(project));
  const [editing, setEditing] = useState("");
  const [sample, setSample] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const media = usePrivateImage(sample || undefined);
  const original = useRef<HTMLAudioElement>(null);
  const until = useRef(0);
  function change(key: string, patch: Partial<Row>) {
    setRows(prev => prev.map(row => row.speaker === key ? { ...row, ...patch } : row));
  }
  function listen(row: Row) {
    const el = original.current;
    if (!el) return;
    setSample(""); el.pause(); until.current = row.end / 1000;
    el.currentTime = row.start / 1000;
    void el.play().catch(() => setErr(t("casting.audioError")));
  }
  useEffect(() => {
    if (!setup && editing) document.getElementById("dub-preset-" + editing)?.focus();
  }, [setup, editing]);
  async function save() {
    if (lock.current || !choices.data) return;
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
      await onSave(profiles, { ...project.characterMappings, [language]: mappings });
      onClose();
    } catch (e) { setErr((e as Error).message); }
    finally { lock.current = false; setBusy(false); }
  }
  if (setup) return <Suspense fallback={<ProcessingSpinner />}><Setup onReturn={voice => {
    if (voice?.language === language && editing) change(editing, { voice: voice.id });
    void choices.refetch(); returnToEditor();
  }} /></Suspense>;
  return <Dialog label={t("casting.title")} onClose={() => { if (!busy) onClose(); }}>
    <div className="dub-casting">
      <header><h2>{t("casting.title")}</h2><p>{t("casting.summary", { count: rows.length, language: t("languages." + language, { defaultValue: language }) })}</p></header>
      {choices.isLoading && <ProcessingSpinner />}
      {choices.isError && <button onClick={() => void choices.refetch()}>{t("casting.retry")}</button>}
      {rows.length === 0 && <p>{t("casting.empty")}</p>}
      <audio preload="none" src={project.mediaUrl || undefined} ref={original} onTimeUpdate={e => {
        if (e.currentTarget.currentTime >= until.current) e.currentTarget.pause();
      }} />
      {rows.map(row => {
        const assigned = choices.data?.characters.find(c => c.id === project.characterMappings[language]?.[row.speaker]);
        const id = row.voice ?? assigned?.voiceId ?? project.characterMappings[language]?.[row.speaker] ?? "";
        const voice = choices.data?.voices.find(v => v.id === id);
        return <fieldset key={row.speaker} disabled={busy}>
          <legend><i style={{ background: row.color }} />{row.speaker} · {timeLabel(row.start)}</legend>
          <label>{t("casting.name")}<input maxLength={120} value={row.name} onChange={e => change(row.speaker, { name: e.target.value })} /></label>
          <label>{t("casting.color")}<input type="color" value={row.color} onChange={e => change(row.speaker, { color: e.target.value })} /></label>
          <label>{t("casting.gender")}<select value={row.gender} onChange={e => change(row.speaker, { gender: e.target.value })}>
            {["unknown","female","male","other"].map(g => <option value={g} key={g}>{t("casting." + g)}</option>)}</select></label>
          <label>{t("casting.style")}<input maxLength={300} value={row.style} onChange={e => change(row.speaker, { style: e.target.value })} /></label>
          <label>{t("casting.voice")}<select aria-label={t("casting.voice")} id={"dub-preset-" + row.speaker} value={id} onChange={e => change(row.speaker, { voice: e.target.value })}>
            <option value="">{t("casting.unassigned")}</option>
            {id && !voice && <option value={id} disabled>{assigned?.name || t("casting.unavailable")}</option>}
            {choices.data?.voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
          <div className="dub-cast-actions">
            <button disabled={!project.mediaUrl} onClick={() => listen(row)}>{t("casting.original")}</button>
            <button disabled={!voice} onClick={() => { original.current?.pause(); setSample(voice?.audioUrl || ""); }}>{t("casting.listen")}</button>
            <button onClick={() => { original.current?.pause(); setSample(""); setEditing(row.speaker); openSetup(); }}>{t("casting.setup")}</button>
          </div>
        </fieldset>;
      })}
      {media.url && <audio controls autoPlay key={media.url} src={media.url} />}
      {(err || media.error) && <p role="alert">{err || t("casting.audioError")}</p>}
      <footer><button onClick={onClose} disabled={busy}>{t("cancel")}</button>
        <button className="primary" disabled={busy || !choices.data || !rows.length || rows.some(r => !r.name.trim())} onClick={() => void save()}>{t("casting.save")}</button></footer>
    </div>
  </Dialog>;
}
