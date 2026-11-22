import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { voiceApi } from "../../../../../web/src/features/voice-studio/api/voiceStudioApi";
import type { CustomVoice, VoiceCharacter } from "../../../../../web/src/features/voice-studio/schemas/voiceStudioSchemas";
import { assertIdentityEpoch } from "../../../../../web/src/lib/auth/actorStore";
import { getIdentitySnapshot, ProcessingSpinner } from "../../../lib/canonical";
import type { useAudioScriptActions } from "./useAudioScriptActions";
import { Dialog } from "../Dialog";

const VoiceSetup = lazy(() => import("../DubbingVoiceSetup"));

type Playback = Pick<ReturnType<typeof useAudioScriptActions>, "playing" | "playSample" | "stopSample">;

export function VoiceSample({ voice, playback }: { voice: CustomVoice; playback: Playback }) {
  const { t } = useTranslation("audioScripts");
  const [failed,setFailed] = useState(false);
  const key = useId() + "/" + voice.id;
  const {playing,playSample,stopSample} = playback;
  const active = playing === key;
  useEffect(() => () => stopSample(key), [key,stopSample]);
  return <>
    <button type="button" aria-pressed={active} onClick={() => {
      setFailed(false);
      void playSample(key,voice.audioUrl,()=>setFailed(true));
    }}>
      {active ? <Square size={15} fill="currentColor" aria-hidden /> : <Play size={15} aria-hidden />}
      {t(active ? "seedSetup:stopSample" : "sample")}
    </button>
    {failed && <small role="alert">{t("dub:casting.audioError")}</small>}
  </>;
}

type Props = {
  playback: Playback;
  voices: CustomVoice[];
  characters: VoiceCharacter[];
  language: string;
  color: string;
  onClose: () => void;
  onUse: (character: VoiceCharacter) => void;
  onRefresh: () => Promise<unknown>;
};
export function ScriptSpeaker({ voices, characters, language, color, playback, onClose, onUse, onRefresh }: Props) {
  const { t } = useTranslation("audioScripts");
  const [name, setName] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [setup, setSetup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  const selected = voices.find(v => v.id === voiceId);
  async function save() {
    if (lock.current || !name.trim() || !selected) return;
    const { epoch } = getIdentitySnapshot();
    lock.current = true;
    setFailed(false);
    setSaving(true);
    try {
      const existing = characters.find(c => c.name === name.trim() && c.voiceId === selected.id && c.voiceKind === "custom");
      const character = existing || await voiceApi.saveCharacter({ name: name.trim(), voiceId: selected.id, voiceKind: "custom", color });
      assertIdentityEpoch(epoch);
      await onRefresh();
      assertIdentityEpoch(epoch);
      onUse(character);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
      lock.current = false;
    }
  }
  if (setup) return <Dialog label={t("dub:casting.setup")} onClose={() => { setSetup(false); void onRefresh(); }}>
    <Suspense fallback={<ProcessingSpinner />}>
      <VoiceSetup onReturn={voice => {
        setSetup(false);
        if (voice?.language === language) setVoiceId(voice.id);
        void onRefresh();
      }} />
    </Suspense>
  </Dialog>;
  return <Dialog label={t("newSpeaker")} onClose={() => { if (!saving) onClose(); }}>
    <form className="as-dialog" onSubmit={e => { e.preventDefault(); void save(); }}>
      <h2>{t("newSpeaker")}</h2>
      <label>{t("speakerName")}<input required autoFocus value={name} onChange={e => setName(e.target.value)} /></label>
      <label>{t("voice")}<select value={voiceId} onChange={e => setVoiceId(e.target.value)}>
        <option value="">{t("voicePick")}</option>
        {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select></label>
      {selected && <VoiceSample key={selected.id} voice={selected} playback={playback} />}
      {!voices.length && <p>{t("noVoices")}</p>}
      <button type="button" onClick={() => setSetup(true)}>{t("dub:casting.setup")}</button>
      {failed && <p role="alert">{t("speakerError")}</p>}
      <div className="as-actions"><button type="button" disabled={saving} onClick={onClose}>{t("cancel")}</button>
        <button className="primary" disabled={!name.trim() || !selected || saving}>{saving && <ProcessingSpinner />}{t("useSpeaker")}</button></div>
    </form>
  </Dialog>;
}
