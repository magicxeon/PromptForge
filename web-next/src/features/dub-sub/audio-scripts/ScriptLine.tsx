import type { CSSProperties } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, CircleAlert, Download, Mic, Play, Plus, SlidersHorizontal, Square, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CustomVoice, DialogueRow, VoiceCatalog, VoiceCharacter } from "../../../../../web/src/features/voice-studio/schemas/voiceStudioSchemas";
import { ProcessingSpinner } from "../../../lib/canonical";
import type { useAudioScriptActions } from "./useAudioScriptActions";
import { VoiceSample } from "./ScriptSpeaker";

type AudioKey = "speech_rate" | "pitch_rate" | "loudness_rate";
type Bounds = { min: number; max: number; step: number; default: number };
export type AudioControls = Partial<Record<AudioKey, Bounds>>;

type Props = {
  row: DialogueRow;
  index: number;
  count: number;
  current: boolean;
  busy: boolean;
  choicesReady: boolean;
  canGenerate: boolean;
  characters: VoiceCharacter[];
  voices: CustomVoice[];
  controls?: AudioControls;
  policy: VoiceCatalog["policy"];
  actions: ReturnType<typeof useAudioScriptActions>;
  update: (changes: Partial<DialogueRow>) => void;
  move: (delta: number) => void;
  remove: () => void;
  newSpeaker: () => void;
};

export function ScriptLine({ row, index, count, current, busy, choicesReady, canGenerate, characters, voices, controls, policy, actions, update, move, remove, newSpeaker }: Props) {
  const { t, i18n } = useTranslation("audioScripts");
  const character = characters.find(c => c.id === row.characterPresetId);
  const voice = voices.find(v => v.id === character?.voiceId);
  const takes = actions.takes[row.id] ?? [];
  const selected = takes.find(take => take.id === row.selectedTakeId);
  const error = actions.errors[row.id];
  const pending = actions.activeRowId === row.id;
  const resumable = Boolean(row.activeOperationId);
  const status = error ? "failed" : pending ? "generating" : resumable ? "awaiting" : current ? "ready" : row.selectedTakeId ? "stale" : "draft";
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 });
  const renderControl = (key: AudioKey, label: string) => {
    const bounds = controls?.[key];
    if (!bounds) return null;
    const value = row.audioConfig?.[key] ?? bounds.default;
    return <label className="as-range"><span>{t(label)} <output>{value > 0 ? "+" : ""}{number.format(value)}</output></span>
      <input type="range" aria-label={t(label)} min={bounds.min} max={bounds.max} step={bounds.step} value={value}
        onChange={e => update({ audioConfig: { ...row.audioConfig, [key]: Number(e.target.value) } })} /></label>;
  };
  const renderDelivery = (field: "emotion" | "intensity" | "method" | "pace", preset: string, label: string) => {
    const options = policy.stylePresets?.[preset] || [];
    if (!options.length) return null;
    return <label>{t(label)}<select value={row.delivery[field] || ""}
      onChange={e => update({ delivery: { ...row.delivery, [field]: e.target.value || undefined } })}>
      <option value="">{t("dubVoice:default")}</option>
      {options.map(v => <option key={v} value={v}>{field === "method" && v !== "natural" ? t(v) : t("dubVoice:" + v)}</option>)}
    </select></label>;
  };
  return <article className="as-line" id={"audio-line-" + row.id} tabIndex={-1}
    style={{ "--speaker-color": character?.color || "#8b9892" } as CSSProperties}
    aria-label={t("line", { number: index + 1 })}>
    <header className="as-line-head">
      <h3>{t("line", { number: index + 1 })}</h3>
      <span className="as-editing">{t("editing")}</span>
      <span className={"as-status as-" + status} role="status">
        {status === "generating" ? <ProcessingSpinner variant="wave" className="seed-generation-wave" /> : status === "ready" ? <Check size={14} aria-hidden /> : (status === "stale" || error) && <CircleAlert size={14} aria-hidden />}
        {t(status)}
      </span>
      <div className="as-order">
        <button type="button" disabled={busy || index === 0} title={t("up")} aria-label={t("up")} onClick={() => move(-1)}><ArrowUp size={16} /></button>
        <button type="button" disabled={busy || index === count - 1} title={t("down")} aria-label={t("down")} onClick={() => move(1)}><ArrowDown size={16} /></button>
        <button type="button" disabled={busy} title={t("remove")} aria-label={t("remove")} onClick={remove}><Trash2 size={16} /></button>
      </div>
    </header>
    <fieldset disabled={busy} className="as-line-fields">
      <div className="as-casting">
        <label>{t("speaker")}<select value={row.characterPresetId}
          onChange={e => update({ characterPresetId: e.target.value })}>
          <option value="">{t("choose")}</option>
          {!!row.characterPresetId && !character && <option value={row.characterPresetId}>{t("selectedVoiceMissing")}</option>}
          {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></label>
        <div className="as-actions"><button type="button" disabled={!choicesReady} onClick={newSpeaker}><Plus size={15} aria-hidden />{t("newSpeaker")}</button>
          {voice && <VoiceSample key={voice.id} voice={voice} playback={actions} />}</div>
      </div>
      <label className="as-spoken">{t("text")}<textarea rows={3} placeholder={t("textPlaceholder")} maxLength={policy.maxTextLength}
        value={row.text} onChange={e => update({ text: e.target.value })} /></label>
    </fieldset>
    {error && <p className="as-error" role="alert">{error}</p>}
    <div className="as-line-actions as-actions">
      <button type="button" className="primary" disabled={busy || (!resumable && (!canGenerate || !row.text.trim() || !voice))} onClick={() => void actions.generate(row.id)}>
        <Mic size={16} aria-hidden />{t(resumable ? "dubVoice:check" : "generate")}
      </button>
      {!row.text.trim() ? <small>{t("needsText")}</small> : !voice && choicesReady && <small>{t("needsSpeaker")}</small>}
      {row.selectedTakeId && <>
        {actions.playing === row.id ? <button type="button" onClick={actions.stop}><Square size={15} aria-hidden />{t("stop")}</button>
          : <button type="button" disabled={busy} onClick={() => void actions.play(row.id, row.selectedTakeId!)}><Play size={15} aria-hidden />{t("play")}</button>}
        <button type="button" disabled={busy || !current} onClick={() => void actions.download(row.id)}><Download size={15} aria-hidden />{t("download")}</button>
        {status === "stale" && <button type="button" disabled={busy} onClick={() => void actions.select(row.id, row.selectedTakeId!)}>{t("accept")}</button>}
        {selected && <small>{t("time", { seconds: number.format(selected.durationMs / 1000) })}</small>}
      </>}
    </div>
    <fieldset disabled={busy} className="as-performance" aria-labelledby={"as-performance-" + row.id}>
      <div className="as-delivery">
        <h4 id={"as-performance-" + row.id}><SlidersHorizontal size={17} aria-hidden />{t("performance")}</h4>
        {renderDelivery("emotion", "emotion", "dubVoice:emotion")}
        {controls?.speech_rate ? renderControl("speech_rate", "speed") : renderDelivery("pace", "pace", "speed")}
        <label>{t("targetDuration")}<input type="number" min="0" step="0.001" value={(row.targetDurationMs ?? 0) / 1000}
          onChange={e => {
            const ms = Math.round(Number(e.target.value) * 1000);
            if (e.target.validity.valid && Number.isSafeInteger(ms)) update({ targetDurationMs: ms || undefined });
          }} /><small>{t("autoDuration")}</small></label>
      </div>
      <details className="as-details"><summary>{t("moreDirection")}<ChevronDown size={16} aria-hidden /></summary>
        <div className="as-advanced">
          {renderDelivery("intensity", "intensity", "dubVoice:intensity")}
          {renderDelivery("method", "delivery", "method")}
          {renderControl("pitch_rate", "pitch")}{renderControl("loudness_rate", "volume")}
          <label>{t("pause")}<input type="number" min="0" step="0.001" max={Number(policy.maxPauseAfterMs) / 1000}
            value={(row.pauseAfterMs || 0) / 1000}
            onChange={e => { if (e.target.validity.valid) update({ pauseAfterMs: Math.round(Number(e.target.value) * 1000) }); }} /></label>
          <label className="as-direction">{t("dubVoice:direction")}<textarea rows={2} maxLength={policy.maxStyleLength}
            value={row.delivery.direction || ""} onChange={e => update({ delivery: { ...row.delivery, direction: e.target.value } })} /></label>
        </div>
      </details>
    </fieldset>
    {!!takes.length && <details className="as-takes"><summary>{t("takes", { count: takes.length })}</summary>
      <ul>{takes.map((take, i) => <li key={take.id}>
        <span><strong>{t("dubVoice:takeNumber", { number: take.takeNumber || takes.length - i })}</strong> · {t("time", { seconds: number.format(take.durationMs / 1000) })}</span>
        <button type="button" disabled={busy} onClick={() => void actions.play(row.id, take.id)}>{t("play")}</button>
        {take.id === row.selectedTakeId && current ? <span className="as-status as-ready"><Check size={14} aria-hidden />{t("ready")}</span>
          : <button type="button" disabled={busy} onClick={() => void actions.select(row.id, take.id)}>{t("use")}</button>}
        <small>{take.inputSnapshot.text}</small>
      </li>)}</ul>
    </details>}
  </article>;
}
