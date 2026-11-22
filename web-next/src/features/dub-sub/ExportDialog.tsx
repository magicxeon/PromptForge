import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  projectsApi,
  timeLabel,
  type Project,
  type Export,
} from "./projectApi";
import { ProcessingSpinner } from "../../lib/canonical";
import { speakerGain } from "./SpeakerMixer";
import { Dialog } from "./Dialog";
import config from "./editorConfig";
import { canExportTake, takePlacement } from "../../../../server/domain/dub-sub/takePlacement.js";
export function ExportDialog({
  p,
  language,
  timeMs,
  save,
  done,
  close,
  jump,
  sourceGain = 1,
  dubGain = 1,
}: {
  p: Project;
  language: string;
  timeMs: number;
  save: () => Promise<Project>;
  done: (f: Export) => void;
  close: () => void;
  jump: (id: string) => void;
  sourceGain?: number;
  dubGain?: number;
}) {
  const { t } = useTranslation("dub"),
    [format, setFormat] = useState("mp4"),
    [lang, setLang] = useState(language),
    [captions, setCaptions] = useState([language]),
    [burn, setBurn] = useState(true);
  const [withVoice, setVoice] = useState(
      !!p.cues.some((c) => c.takes[language]),
    ),
    [keepScene, setKeepScene] = useState(true),
    [error, setError] = useState(""),
    [pending, setPending] = useState<"frame" | "export" | null>(null),
    [result, setResult] = useState<Export | null>(null),
    [frame, setFrame] = useState("");
  const busy = pending !== null;
  useEffect(
    () => () => {
      if (frame) URL.revokeObjectURL(frame);
    },
    [frame],
  );
  const audible = p.cues.filter(
    (c) => speakerGain(p.mixer[lang] || {}, c.speaker || "") > 0,
  );
  const voiceTracks =
    format === "wav" || (format === "mp4" && withVoice)
      ? audible
          .filter((c) => c.takes[lang])
          .map((c) => ({
            cue: c,
            start: c.startMs + (c.offsetMs || 0),
            end: c.startMs + (c.offsetMs || 0) + c.takes[lang].durationMs,
          }))
          .sort((a, b) => a.start - b.start)
      : [];
  const clash = voiceTracks.find(
    (clip, i) =>
      clip.start < 0 || (i > 0 && clip.start < voiceTracks[i - 1].end - 25),
  );
  const issue =
    clash?.cue ||
    p.cues.find(
      (c) =>
        (format !== "wav" &&
          (format === "mp4" ? captions : [lang]).some(
            (l) => !(l === "source" ? c.text : c.translations[l])?.trim(),
          )) ||
        ((format === "wav" || (format === "mp4" && withVoice)) &&
          audible.includes(c) &&
          (!c.takes[lang] ||
            !canExportTake(takePlacement(c,c.takes[lang].durationMs,p.durationMs ?? undefined),
              c.takes[lang].durationMs,c.takes[lang].confirmedOverrunMs))),
    );
  async function run(preview: boolean) {
    if (busy) return;
    setPending(preview ? "frame" : "export");
    setError("");
    try {
      const current = await save(),
        body = {
          format,
          language: lang,
          burnIn: burn,
          includeDubbing: withVoice,
          captionLanguages: captions,
          sceneAudio: p.hasAudio !== false && keepScene && (format === "wav" || (format === "mp4" && withVoice)),
          sourceGain: format === "wav" || (format === "mp4" && withVoice) ? Number(keepScene) : sourceGain,
          dubGain,
        };
      if (preview) {
        const blob = await projectsApi.frame(p.id, {
          revision: current.revision,
          timeMs,
          captionLanguages: captions,
        });
        setFrame(URL.createObjectURL(blob));
      } else {
        const file = await projectsApi.export(current, body);
        if (body.sceneAudio && file.sceneAudioProcessor !== "bandit-v2")
          throw new Error("dub_scene_export_unconfirmed");
        setResult(file);
        done(file);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
    }
  }
  return (
    <Dialog
      label={t("export")}
      onClose={() => {
        if (!busy) close();
      }}
    >
      <header className="dub-export-heading">
        <h2>{t("export")}</h2>
        <small>{p.name}</small>
      </header>
      {busy && <div className="dub-export-status" role="status">
        <ProcessingSpinner variant="wave" className="seed-generation-wave" />
        {t(pending === "frame" ? "preparingFrame" : "preparingExport", {format:format.toUpperCase()})}
      </div>}
      {result && <div className="dub-export-status" role="status">
        {t("exportReady", {format:result.format.toUpperCase()})}
      </div>}
      {!busy && !result && <fieldset className="dub-export-options">
        <label>
          {t("format")}
          <select
            value={format}
            onChange={(e) => {
              const next = e.target.value;
              setFormat(next);
              if (lang === "source" && ["mp4", "wav"].includes(next))
                setLang(p.targetLanguages[0]);
            }}
          >
            {config.formats.map((f) => (
              <option key={f} value={f}>{t("exportType." + f)}</option>
            ))}
          </select>
        </label>
        {(format === "mp4" || format === "wav") && (
          <fieldset className="dub-export-group">
            <legend>{t("exportSound")}</legend>
            {format === "mp4" && <div className="dub-export-choices">
              <label><input type="radio" name="export-sound" checked={!withVoice} onChange={() => setVoice(false)} />{t("exportOriginal")}</label>
              <label><input type="radio" name="export-sound" checked={withVoice} onChange={() => setVoice(true)} />{t("exportDub")}</label>
            </div>}
            {(format === "wav" || withVoice) && <>
              <label>{t("dubLanguage")}
                <select value={lang} onChange={e => setLang(e.target.value)}>
                  {p.targetLanguages.map(l => <option key={l} value={l}>{t("lang." + l)}</option>)}
                </select>
              </label>
              {p.hasAudio !== false && <label className="dub-export-toggle">
                <input type="checkbox" checked={keepScene} onChange={e => setKeepScene(e.target.checked)} />
                {t("keepSceneAudio")}
              </label>}
            </>}
          </fieldset>
        )}
        {(format === "srt" || format === "vtt") && <label>
          {t("exportSubLang")}
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            {[
              ...(format === "srt" || format === "vtt" ? ["source"] : []),
              ...p.targetLanguages,
            ].map((l) => (
              <option key={l} value={l}>
                {t("lang." + l)}
              </option>
            ))}
          </select>
        </label>}
        {format === "mp4" && (
            <fieldset className="dub-export-group">
              <legend>{t("captions")}</legend>
              <div className="dub-export-choices">
              {["source", ...p.targetLanguages].map((l) => (
                <label className="dub-inline" key={l}>
                  <input
                    type="checkbox"
                    checked={captions.includes(l)}
                    disabled={!captions.includes(l) && captions.length >= 2}
                    onChange={(e) => {
                      setCaptions(
                        e.target.checked
                          ? [...captions, l]
                          : captions.filter((i) => i !== l),
                      );
                      setFrame("");
                    }}
                  />
                  {t("lang." + l)}
                </label>
              ))}
              </div>
            {captions.length > 0 && <label className="dub-export-toggle">
              <input
                type="checkbox"
                checked={burn}
                onChange={(e) => {setBurn(e.target.checked); setFrame("");}}
              />
              {t("burn")}
            </label>}
            {burn && captions.length > 0 && (
              <button
                disabled={!captions.length}
                onClick={() => void run(true)}
              >
                {t("frame")} · {timeLabel(timeMs)}
              </button>
            )}
            {frame && (
              <img
                className="dub-source-preview"
                src={frame}
                alt={t("frame")}
              />
            )}
            </fieldset>
        )}
        {issue && (
          <button onClick={() => jump(issue.id)}>
            {t("checkCue")} {timeLabel(issue.startMs)} ·{" "}
            {issue.speaker || issue.text}
          </button>
        )}
      </fieldset>}
      <footer>
        <button disabled={busy} onClick={close}>
          {t("close")}
        </button>
        {result ? <a className="dub-export-download" href={result.url} download>
          {t("download")} {result.format.toUpperCase()}
        </a> : !busy && <button
          className="primary"
          disabled={busy || !!issue || (!p.cues.length && format !== "mp4")}
          onClick={() => void run(false)}
        >
          {t("export")}
        </button>}
      </footer>
      {error && (
        <p role="alert">{t("errors." + error, { defaultValue: error })}</p>
      )}
    </Dialog>
  );
}
