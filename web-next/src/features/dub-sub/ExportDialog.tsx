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
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [frame, setFrame] = useState("");
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
            c.startMs + (c.offsetMs || 0) + c.takes[lang].durationMs >
              c.endMs + 25)),
    );
  async function run(preview: boolean) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const current = await save(),
        body = {
          format,
          language: lang,
          burnIn: burn,
          includeDubbing: withVoice,
          captionLanguages: captions,
          sourceGain,
          dubGain,
        };
      if (preview) {
        const blob = await projectsApi.frame(p.id, {
          revision: current.revision,
          timeMs,
          captionLanguages: captions,
        });
        setFrame(URL.createObjectURL(blob));
      } else done(await projectsApi.export(current, body));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      label={t("export")}
      onClose={() => {
        if (!busy) close();
      }}
    >
      <h2>{t("export")}</h2>
      <small>
        {p.name} · r{p.revision}
      </small>
      <fieldset disabled={busy}>
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
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label>
          {t(format === "mp4" || format === "wav" ? "voice" : "target")}
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
        </label>
        {format === "mp4" && (
          <>
            <fieldset>
              <legend>{t("captions")}</legend>
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
            </fieldset>
            <label>
              <input
                type="checkbox"
                checked={burn}
                onChange={(e) => setBurn(e.target.checked)}
              />
              {t("burn")}
            </label>
            <label>
              <input
                type="checkbox"
                checked={withVoice}
                onChange={(e) => setVoice(e.target.checked)}
              />
              {t("includeVoice")}
            </label>
            {burn && (
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
          </>
        )}
        {issue && (
          <button onClick={() => jump(issue.id)}>
            {t("checkCue")} {timeLabel(issue.startMs)} ·{" "}
            {issue.speaker || issue.text}
          </button>
        )}
      </fieldset>
      <footer>
        <button disabled={busy} onClick={close}>
          {t("close")}
        </button>
        <button
          className="primary"
          disabled={busy || !!issue || (!p.cues.length && format !== "mp4")}
          onClick={() => void run(false)}
        >
          {busy ? <ProcessingSpinner /> : t("export")}
        </button>
      </footer>
      {error && (
        <p role="alert">{t("errors." + error, { defaultValue: error })}</p>
      )}
    </Dialog>
  );
}
