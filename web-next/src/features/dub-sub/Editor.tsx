import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useActor,
  ProcessingSpinner,
  pollingPolicy,
} from "../../lib/canonical";
import {
  projectsApi,
  newCue,
  parseSubtitles,
  timeLabel,
  type Project,
  type Cue,
  type Track,
  type Export,
} from "./projectApi";
import config from "./editorConfig";
import { useTakePlayback } from "./useTakePlayback";
import { SpeakerMixer } from "./SpeakerMixer";
import { SubtitleInspector } from "./SubtitleInspector";
import { DialogueList } from "./DialogueList";
import { Timeline } from "./Timeline";
import { ExportDialog } from "./ExportDialog";
import { Dialog } from "./Dialog";
import { subtitleFamily, wrapSubtitle } from "./subtitleFonts";
import { useDubDraft } from "./useDubDraft";
const Voice = lazy(() =>
  import("./DubVoice").then((m) => ({ default: m.DubVoice })),
);
function releaseMedia(el: HTMLMediaElement) {
  el.pause();
  el.removeAttribute("src");
  el.load();
}
export default function Editor() {
  const { id = "" } = useParams(),
    { identityScope } = useActor();
  const query = useQuery({
    queryKey: ["dub-project", identityScope, id],
    queryFn: () => projectsApi.read(id),
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchInterval: (q) =>
      pollingPolicy.comparison(
        !!q.state.data?.operations?.some((o) => o.status === "running"),
      ),
    refetchIntervalInBackground: false,
  });
  return query.data ? (
    <Work key={id} initial={query.data} />
  ) : query.error ? (
    <p role="alert">{query.error.message}</p>
  ) : (
    <ProcessingSpinner />
  );
}
function Work({ initial }: { initial: Project }) {
  const { t } = useTranslation("dub"),
    model = useDubDraft(initial),
    p = model.draft,
    client = useQueryClient(),
    loc = useLocation();
  const { identityScope } = useActor();
  const returned = loc.state?.resume;
  const resume = returned?.scope === identityScope &&
    initial.cues.some((c) => c.id === returned.cueId) &&
    initial.targetLanguages.includes(returned.language) ? returned : undefined;
  const fromVoice = resume?.panel === "voice";
  const [lang, setLang] = useState<string>(
      initial.targetLanguages.includes(resume?.language)
        ? resume.language
        : initial.targetLanguages[0] || "source",
    ),
    [selected, setSelected] = useState<string>(
      initial.cues.some((c) => c.id === resume?.cueId)
        ? resume.cueId
        : initial.cues[0]?.id || "",
    );
  const [inspectorOpen, setInspectorOpen] = useState(fromVoice),
    [compact, setCompact] = useState(
      () => window.innerWidth <= config.compactWidth,
    );
  useEffect(() => {
    const mq = matchMedia("(max-width: " + config.compactWidth + "px)");
    const sync = () => setCompact(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const [panel, setPanel] = useState<"tracks" | "font" | "voice">(fromVoice ? "voice" : "tracks"),
    [styleLang, setStyleLang] = useState(lang);
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [time, setTime] = useState<number>(Number.isFinite(resume?.timeMs) ? Math.min(initial.durationMs || 0, Math.max(0, resume.timeMs)) : 0),
    [loop, setLoop] = useState(false);
  const [ratio, setRatio] = useState(16 / 9),
    [height, setHeight] = useState(0),
    stage = useRef<HTMLDivElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const [sourceVol, setSourceVol] = useState(1),
    [dubVol, setDubVol] = useState(1),
    [exports, setExports] = useState<Export[]>(p.exports || []);
  const [exportOpen, openExport] = useState(false);
  const [imported, setImported] = useState<Cue[] | null>(null),
    [follow, setFollow] = useState(false);
  const [audition, setAudition] = useState<{
    cueId: string;
    id: string;
    durationMs: number;
    audioUrl: string;
  } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [timelineSelection, revealTimelineCue] = useState<{ id: string }>();
  const cue = p.cues.find((c) => c.id === selected),
    active = p.cues.find((c) => c.startMs <= time && c.endMs > time);
  const duration = p.durationMs || 0,
    track = (l: string): Track => ({
      ...config.defaultStyle,
      ...(!p.tracks[l] && l === "source" ? { visible: false, y: 70 } : {}),
      ...p.tracks[l],
    });
  const style = track(styleLang);
  const edit = (patch: Partial<Project>) =>
    model.edit((prev) => ({ ...prev, ...patch }));
  const update = (c: Cue) =>
    model.edit((prev) => ({
      ...prev,
      cues: prev.cues
        .map((row) => (row.id === c.id ? c : row))
        .sort((a, b) => a.startMs - b.startMs),
    }));
  const setStyle = (key: string, patch: Partial<Track>) =>
    edit({ tracks: { ...p.tracks, [key]: { ...track(key), ...patch } } });
  const seek = (ms: number) => {
    if (video.current) video.current.currentTime = Math.max(0, ms) / 1000;
    setTime(ms);
  };
  const select = (c: Cue) => {
    setAudition(null);
    setSelected(c.id);
    seek(c.startMs);
  };
  function add(ms: number) {
    if (duration < config.minimumCueMs) return;
    const start = Math.round(
        Math.min(duration - config.minimumCueMs, Math.max(0, ms)),
      ),
      c = newCue(start, Math.min(start + config.defaultCueMs, duration));
    edit({ cues: [...p.cues, c].sort((a, b) => a.startMs - b.startMs) });
    select(c);
  }
  function split() {
    if (!cue || time <= cue.startMs || time >= cue.endMs) return;
    const next = { ...newCue(time, cue.endMs), speaker: cue.speaker };
    edit({
      cues: p.cues.flatMap((c) =>
        c.id === cue.id ? [{ ...c, endMs: time }, next] : [c],
      ),
    });
    select(next);
  }
  function merge() {
    if (!cue) return;
    const next = p.cues[p.cues.indexOf(cue) + 1];
    if (!next) return;
    edit({
      cues: p.cues
        .filter((c) => c !== next)
        .map((c) =>
          c !== cue
            ? c
            : {
                ...cue,
                endMs: Math.max(cue.endMs, next.endMs),
                text: [cue.text, next.text].filter(Boolean).join(" "),
                translations: Object.fromEntries(
                  p.targetLanguages.map((l) => [
                    l,
                    [cue.translations[l], next.translations[l]]
                      .filter(Boolean)
                      .join(" "),
                  ]),
                ),
              },
        ),
    });
  }
  async function operation(
    label: string,
    fn: (saved: Project) => Promise<void>,
  ) {
    if (busy) return;
    setBusy(label);
    setError("");
    try {
      const saved = await model.save();
      await fn(saved);
      await client.invalidateQueries({ queryKey: ["dub-projects"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function process(step: "transcribe" | "translate", cueId?: string) {
    await operation(step, async (saved) => {
      if (step === "transcribe" && p.cues.length) {
        const result = await projectsApi.detect(p.id, "transcribe", {
          revision: saved.revision,
          preview: true,
        });
        setImported(result.cues);
        return;
      }
      const next = await projectsApi.process(p.id, step, {
        revision: saved.revision,
        language: lang,
        ...(cueId ? { cueIds: [cueId] } : {}),
        overwrite:
          step === "translate" && p.cues.some((c) => c.translations[lang]),
      });
      model.accept(next);
      if (!next.cues.some((c) => c.id === selected))
        setSelected(next.cues[0]?.id || "");
    });
  }
  const lastServer = useRef(initial);
  useEffect(() => {
    if (lastServer.current === initial) return;
    if (!model.dirty && !busy && initial.revision >= p.revision) {
      model.accept(initial);
      setExports(initial.exports || []);
      if (!initial.cues.some((c) => c.id === selected))
        setSelected(initial.cues[0]?.id || "");
    }
    lastServer.current = initial;
  }, [initial, model.dirty, busy, p.revision, selected, model.accept]);
  const started = useRef(false);
  useEffect(() => {
    if (
      loc.state?.startTranscription &&
      !started.current &&
      !initial.cues.length
    ) {
      started.current = true;
      window.history.replaceState({ ...window.history.state, usr: null }, "");
      void process("transcribe");
    }
  }, []);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ob = new ResizeObserver(() => setHeight(el.clientHeight));
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  useEffect(() => {
    const el = video.current;
    if (el && p.mediaUrl && !el.hasAttribute("src")) el.src = p.mediaUrl;
    return () => {
      if (el) releaseMedia(el);
    };
  }, [p.mediaUrl]);
  useTakePlayback(p.cues, lang, time, playing, dubVol, p.mixer, audition);
  const onTime = () => {
    const ms = Math.round((video.current?.currentTime || 0) * 1000);
    if (loop && playing && cue && ms >= cue.endMs) {
      seek(cue.startMs);
      return;
    }
    setTime(ms);
    if (
      follow &&
      playing &&
      !(document.activeElement instanceof HTMLInputElement) &&
      !(document.activeElement instanceof HTMLTextAreaElement)
    ) {
      const row = p.cues.find((c) => c.startMs <= ms && ms < c.endMs);
      if (row) setSelected(row.id);
    }
  };
  const fileInput = useRef<HTMLInputElement>(null);
  const clock = useRef(onTime);
  clock.current = onTime;
  useEffect(() => {
    const el = video.current;
    if (!el || !playing) return;
    let frame = 0,
      alive = true;
    const tick = () => {
      if (!alive) return;
      clock.current();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
    };
  }, [playing]);
  return (
    <section className="dub-editor">
      <header className="dub-bar">
        <Link to="/dub-sub">‹ {t("projects")}</Link>
        <input
          disabled={!!busy}
          aria-label={t("name")}
          maxLength={100}
          value={p.name}
          onChange={(e) => edit({ name: e.target.value })}
        />
        <small role="status">
          {t(model.saving ? "saving" : model.dirty ? "unsaved" : "saved")}
        </small>
        <button
          disabled={!!busy || !model.dirty}
          onClick={() => void model.save().catch(() => {})}
        >
          {t("save")}
        </button>
        <button
          className="primary"
          disabled={!!busy || !p.mediaUrl}
          onClick={() => openExport(true)}
        >
          {t("export")}
        </button>
      </header>
      {(error || model.error) && (
        <p className="dub-error" role="alert">
          {t("errors." + (error || model.error), {
            defaultValue: error || model.error,
          })}{" "}
          {model.error && (
            <button
              onClick={() => {
                if (confirm(t("overwrite")))
                  void projectsApi
                    .read(p.id)
                    .then(model.accept)
                    .catch((e) => setError(e.message));
              }}
            >
              {t("reload")}
            </button>
          )}
        </p>
      )}
      {p.operations?.some((op) =>
        ["running", "interrupted", "failed"].includes(op.status),
      ) && (
        <details>
          <summary>{t("activity")}</summary>
          {p.operations.slice(-6).map((op) => (
            <p key={op.id}>
              {t(op.kind === "exports" ? "export" : op.kind)} ·{" "}
              {t("op." + op.status)} {op.code}
            </p>
          ))}
          <button
            disabled={model.dirty || !!busy}
            onClick={() =>
              void projectsApi
                .read(p.id)
                .then((next) => {
                  model.accept(next);
                  setExports(next.exports || []);
                })
                .catch((e) => setError(e.message))
            }
          >
            {t("refresh")}
          </button>
        </details>
      )}
      {busy && (
        <p role="status">
          <ProcessingSpinner /> {t(busy)}
        </p>
      )}
      {model.blocker.state === "blocked" && (
        <Dialog label={t("unsaved")} onClose={() => model.blocker.reset?.()}>
          <p>{t("unsaved")}</p>
          <button onClick={() => model.blocker.reset?.()}>{t("cancel")}</button>
          <button
            onClick={() =>
              void model
                .save()
                .then(() => model.blocker.proceed?.())
                .catch(() => {})
            }
          >
            {t("save")}
          </button>
          <button onClick={() => model.blocker.proceed?.()}>
            {t("discard")}
          </button>
        </Dialog>
      )}
      <fieldset className="dub-layout" disabled={!!busy}>
        <DialogueList
          cues={p.cues}
          language={lang}
          languages={p.targetLanguages}
          activeId={active?.id}
          selected={selected}
          following={follow}
          reveal={timelineSelection}
          onSelect={select}
          onLanguage={(l) => {
            setLang(l);
            setAudition(null);
          }}
          onAdd={() => add(time)}
          locked={track(lang).locked}
        />
        <section className="dub-preview">
          <div className="dub-stage" ref={stage}>
            <div
              className="dub-picture"
              onPointerDown={(e) => {
                if (panel !== "font" || style.locked) return;
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerUp={(e) => {
                if (
                  panel !== "font" ||
                  style.locked ||
                  !e.currentTarget.hasPointerCapture(e.pointerId)
                )
                  return;
                const box = e.currentTarget.getBoundingClientRect();
                setStyle(styleLang, {
                  x: Math.round(
                    Math.max(
                      0,
                      Math.min(100, (100 * (e.clientX - box.left)) / box.width),
                    ),
                  ),
                  y: Math.round(
                    Math.max(
                      0,
                      Math.min(100, (100 * (e.clientY - box.top)) / box.height),
                    ),
                  ),
                });
              }}
              style={{
                width: height ? "min(100%, " + height * ratio + "px)" : "100%",
                aspectRatio: ratio,
              }}
            >
              {!p.mediaUrl && (
                <label className="dub-upload">
                  {t("upload")}
                  <input
                    type="file"
                    accept="video/mp4,video/webm,.mp4,.mov,.webm,.mkv"
                    disabled={!!busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        void operation("upload", async (saved) =>
                          model.accept(
                            await projectsApi.upload(saved.id, file),
                          ),
                        );
                    }}
                  />
                </label>
              )}
              {p.mediaUrl && (
                <video
                  ref={video}
                  src={p.mediaUrl}
                  preload="metadata"
                  playsInline
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    setRatio(v.videoWidth / v.videoHeight || 16 / 9);
                    if (resume && Number.isFinite(resume.timeMs))
                      v.currentTime = Math.max(
                        0,
                        Math.min(v.duration, resume.timeMs / 1000),
                      );
                  }}
                  onTimeUpdate={onTime}
                  onSeeked={onTime}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />
              )}
              {active &&
                ["source", ...p.targetLanguages].map((l) => {
                  const s = track(l),
                    text =
                      l === "source" ? active.text : active.translations[l];
                  return (
                    s.visible &&
                    text && (
                      <div
                        key={l}
                        className="dub-caption"
                        lang={l === "source" ? p.sourceLanguage : l}
                        style={{
                          left: s.x + "%",
                          top: s.y + "%",
                          fontSize: s.size / 10.8 + "cqh",
                          color:
                            s.color === "yellow"
                              ? config.colors.yellow
                              : config.colors.white,
                          fontFamily: subtitleFamily(
                            s.font,
                            l === "source"
                              ? String(p.detectedLanguage || p.sourceLanguage)
                              : l,
                          ),
                          maxWidth: "96%",
                        }}
                      >
                        {wrapSubtitle(
                          text,
                          l === "source"
                            ? String(p.detectedLanguage || p.sourceLanguage)
                            : l,
                          s.maxChars,
                        )}
                      </div>
                    )
                  );
                })}
            </div>
          </div>
          <div className="dub-transport">
            <button
              aria-label={t("previous")}
              onClick={() => {
                const c = [...p.cues]
                  .reverse()
                  .find((c) => c.startMs < time - 1);
                if (c) select(c);
              }}
            >
              ‹
            </button>
            <button
              disabled={!p.mediaUrl}
              onClick={() =>
                playing
                  ? video.current?.pause()
                  : void video.current?.play().catch((e) => setError(e.message))
              }
            >
              {t(playing ? "pause" : "play")}
            </button>
            <button
              aria-label={t("next")}
              onClick={() => {
                const c = p.cues.find((c) => c.startMs > time);
                if (c) select(c);
              }}
            >
              ›
            </button>
            <output>{timeLabel(time)}</output>
            <input
              aria-label={t("seek")}
              type="range"
              min={0}
              max={duration || 1}
              value={time}
              onChange={(e) => seek(+e.target.value)}
            />
            <button
              disabled={!cue}
              aria-pressed={loop}
              onClick={() => {
                setLoop(!loop);
                if (!loop && cue) seek(cue.startMs);
              }}
            >
              {t("loop")}
            </button>
            <button
              onClick={() =>
                void stage.current
                  ?.requestFullscreen()
                  .catch((e) => setError(e.message))
              }
            >
              {t("expand")}
            </button>
          </div>
        </section>
        {compact && (
          <button
            className="dub-open-inspector"
            onClick={() => setInspectorOpen(true)}
          >
            {t("editCue")} · {t("tracks")}
          </button>
        )}
        <aside className="dub-inspector" hidden={compact && !inspectorOpen}>
          <header>
            <h2>{t(panel)}</h2>
            {compact && (
              <button onClick={() => setInspectorOpen(false)}>
                {t("close")}
              </button>
            )}
            {panel !== "tracks" && (
              <button onClick={() => setPanel("tracks")}>
                ‹ {t("tracks")}
              </button>
            )}
          </header>
          {panel === "tracks" ? (
            <>
              {["source", ...p.targetLanguages].map((l) => (
                <div className="dub-track" key={l}>
                  <label>
                    <input
                      type="checkbox"
                      checked={track(l).visible}
                      onChange={(e) =>
                        setStyle(l, { visible: e.target.checked })
                      }
                    />
                    {t("lang." + l)}
                  </label>
                  <button
                    onClick={() => {
                      setStyleLang(l);
                      setPanel("font");
                    }}
                  >
                    {t("font")}
                  </button>
                </div>
              ))}
              {p.targetLanguages.length < config.maxTargets && (
                <label>
                  {t("addLanguage")}
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        edit({
                          targetLanguages: [
                            ...p.targetLanguages,
                            e.target.value,
                          ],
                        });
                        setLang(e.target.value);
                      }
                    }}
                  >
                    <option value="">＋</option>
                    {config.languages
                      .filter(
                        (l) =>
                          !p.targetLanguages.includes(l) &&
                          l !== p.sourceLanguage,
                      )
                      .map((l) => (
                        <option key={l} value={l}>
                          {t("lang." + l)}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <div className="dub-tools">
                <button
                  disabled={!p.mediaUrl}
                  onClick={() => {
                    if (!p.cues.length || confirm(t("overwrite")))
                      void process("transcribe");
                  }}
                >
                  {t("transcribe")}
                </button>
                <button
                  disabled={!p.cues.length || track(lang).locked}
                  onClick={() => {
                    if (
                      !p.cues.some((c) => c.translations[lang]) ||
                      confirm(t("overwrite"))
                    )
                      void process("translate");
                  }}
                >
                  {t("translate")}
                </button>
                <button
                  disabled={!p.mediaUrl}
                  onClick={() =>
                    void operation("ocr", async (saved) => {
                      const result = await projectsApi.detect(p.id, "ocr", {
                        revision: saved.revision,
                        language:
                          p.sourceLanguage === "auto" ? "zh" : p.sourceLanguage,
                      });
                      setImported(result.cues);
                    })
                  }
                >
                  {t("ocr")}
                </button>
                <button onClick={() => fileInput.current?.click()}>
                  {t("import")}
                </button>
                <input
                  hidden
                  ref={fileInput}
                  type="file"
                  accept=".vtt,.srt"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    try {
                      if (file) {
                        if (file.size > 2_000_000) throw Error();
                        const cues = parseSubtitles(await file.text());
                        if (cues.some((c) => c.endMs > duration)) throw Error();
                        setImported(cues);
                      }
                    } catch {
                      setError(t("badSubtitle"));
                    }
                  }}
                />
              </div>
              <label className="dub-inline">
                <input
                  type="checkbox"
                  checked={follow}
                  onChange={(e) => setFollow(e.target.checked)}
                />
                {t("follow")}
              </label>
              <label>
                {t("originalVolume")}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step=".05"
                  value={sourceVol}
                  onChange={(e) => {
                    setSourceVol(+e.target.value);
                    if (video.current) video.current.volume = +e.target.value;
                  }}
                />
              </label>
              <label>
                {t("dubVolume")}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step=".05"
                  value={dubVol}
                  onChange={(e) => setDubVol(+e.target.value)}
                />
              </label>
              <SpeakerMixer
                p={p}
                language={lang}
                change={(mixer) => edit({ mixer })}
              />
              {cue && (
                <>
                  <label>
                    {t("speaker")}
                    <input
                      value={cue.speaker || ""}
                      onChange={(e) =>
                        update({ ...cue, speaker: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    {t("original")}
                    <textarea
                      disabled={track("source").locked}
                      value={cue.text}
                      onChange={(e) => update({ ...cue, text: e.target.value })}
                    />
                  </label>
                  <label>
                    {t("lang." + lang)}
                    <textarea
                      disabled={track(lang).locked}
                      value={cue.translations[lang] || ""}
                      onChange={(e) =>
                        update({
                          ...cue,
                          translations: {
                            ...cue.translations,
                            [lang]: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <div className="dub-pair">
                    {(["startMs", "endMs"] as const).map((key) => (
                      <label key={key}>
                        {t(key)}
                        <input
                          type="number"
                          min={0}
                          max={duration}
                          value={cue[key]}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (
                              v >= 0 &&
                              v <= duration &&
                              (key === "startMs"
                                ? v < cue.endMs
                                : v > cue.startMs)
                            )
                              update({ ...cue, [key]: v });
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <button onClick={() => setPanel("voice")}>
                    {t("direct")}
                  </button>
                  <details>
                    <summary>{t("editCue")}</summary>
                    <div className="dub-tools">
                      <button
                        disabled={track(lang).locked || !cue.text.trim()}
                        onClick={() => {
                          if (
                            !cue.translations[lang] ||
                            confirm(t("overwrite"))
                          )
                            void process("translate", cue.id);
                        }}
                      >
                        {t("translateCue")}
                      </button>
                      <button
                        onClick={split}
                        disabled={time <= cue.startMs || time >= cue.endMs}
                      >
                        {t("split")}
                      </button>
                      <button onClick={merge} disabled={p.cues.at(-1) === cue}>
                        {t("merge")}
                      </button>
                      <button
                        onClick={() => {
                          edit({ cues: p.cues.filter((c) => c.id !== cue.id) });
                          setSelected("");
                        }}
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </details>
                </>
              )}
            </>
          ) : panel === "font" ? (
            <SubtitleInspector
              language={styleLang}
              script={
                styleLang === "source"
                  ? String(p.detectedLanguage || p.sourceLanguage)
                  : styleLang
              }
              style={style}
              change={(patch) => setStyle(styleLang, patch)}
              convert={(to) =>
                void operation("variant", async (saved) => {
                  const cc =
                    to === "cn"
                      ? await import("opencc-js/t2cn")
                      : await import("opencc-js/cn2t");
                  const convert = cc.Converter({
                    from: to === "cn" ? "tw" : "cn",
                    to,
                  });
                  edit({
                    cues: saved.cues.map((c) =>
                      styleLang === "source"
                        ? { ...c, text: convert(c.text) }
                        : {
                            ...c,
                            translations: {
                              ...c.translations,
                              [styleLang]: convert(
                                c.translations[styleLang] || "",
                              ),
                            },
                          },
                    ),
                  });
                })
              }
            />
          ) : (
            cue && (
              <Suspense fallback={<ProcessingSpinner />}>
                <label>
                  {t("spoken")}
                  <textarea
                    value={
                      cue.voiceBindings[lang]?.dubText ??
                      cue.translations[lang] ??
                      ""
                    }
                    onChange={(e) => {
                      const dubText = e.target.value;
                      update({
                        ...cue,
                        voiceBindings: {
                          ...cue.voiceBindings,
                          [lang]: { ...cue.voiceBindings[lang], dubText },
                        },
                      });
                    }}
                  />
                </label>
                <Voice
                  key={cue.id + lang}
                  projectId={p.id}
                  cueId={cue.id}
                  targetMs={cue.endMs - cue.startMs}
                  speaker={cue.speaker || ""}
                  language={lang}
                  initialSelection={resume?.cueId === cue.id && resume.language === lang ? resume.voice : undefined}
                  initialModel={resume?.cueId === cue.id && resume.language === lang ? resume.modelId : undefined}
                  libraryLink={(voice, modelId) => (
                    <Link to={"/dub-sub/voice?" + new URLSearchParams({
                      view: "voices", project: p.id, cue: cue.id, language: lang,
                      ms: String(time), voice, model: modelId,
                    })}>Voice Studio ↗</Link>
                  )}
                  defaultCharacterId={
                    cue.speaker
                      ? p.characterMappings[lang]?.[cue.speaker]
                      : undefined
                  }
                  onAudition={(take) => {
                    setAudition({ cueId: cue.id, ...take });
                    seek(cue.startMs);
                    void video.current
                      ?.play()
                      .catch((e) => setError(e.message));
                  }}
                  text={
                    cue.voiceBindings[lang]?.dubText ??
                    cue.translations[lang] ??
                    (p.sourceLanguage === lang ? cue.text : "")
                  }
                  binding={
                    cue.voiceBindings[lang]?.documentId &&
                    cue.voiceBindings[lang]?.rowId
                      ? {
                          ...cue.voiceBindings[lang],
                          documentId: cue.voiceBindings[lang].documentId!,
                          rowId: cue.voiceBindings[lang].rowId!,
                        }
                      : undefined
                  }
                  onBind={async (binding) => {
                    model.edit((prev) => ({
                      ...prev,
                      cues: prev.cues.map((c) =>
                        c.id === cue.id
                          ? {
                              ...c,
                              voiceBindings: {
                                ...c.voiceBindings,
                                [lang]: {
                                  ...c.voiceBindings[lang],
                                  ...binding,
                                },
                              },
                            }
                          : c,
                      ),
                    }));
                    await model.save();
                  }}
                  onUse={async (take) => {
                    setAudition(null);
                    model.edit((prev) => ({
                      ...prev,
                      cues: prev.cues.map((c) =>
                        c.id === cue.id
                          ? { ...c, takes: { ...c.takes, [lang]: take } }
                          : c,
                      ),
                    }));
                    await model.save();
                  }}
                />
                {cue.speaker && cue.voiceBindings[lang]?.characterId && (
                  <button
                    disabled={
                      p.characterMappings[lang]?.[cue.speaker] ===
                      cue.voiceBindings[lang]?.characterId
                    }
                    onClick={() =>
                      edit({
                        characterMappings: {
                          ...p.characterMappings,
                          [lang]: {
                            ...p.characterMappings[lang],
                            [cue.speaker!]:
                              cue.voiceBindings[lang].characterId!,
                          },
                        },
                      })
                    }
                  >
                    {t("defaultVoice")}
                  </button>
                )}
                {cue.takes[lang] && (
                  <>
                    <label>
                      {t("offset")}
                      <input
                        type="number"
                        step={10}
                        value={cue.offsetMs || 0}
                        onChange={(e) =>
                          update({ ...cue, offsetMs: +e.target.value })
                        }
                      />
                    </label>
                    <label>
                      {t("gain")}
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step=".05"
                        value={cue.gain ?? 1}
                        onChange={(e) =>
                          update({ ...cue, gain: +e.target.value })
                        }
                      />
                    </label>
                  </>
                )}
                {cue.takes[lang] && (
                  <p>
                    {timeLabel(cue.takes[lang].durationMs)}{" "}
                    {cue.takes[lang].durationMs > cue.endMs - cue.startMs &&
                      t("overrun")}
                  </p>
                )}
              </Suspense>
            )
          )}
        </aside>
      </fieldset>
      <div className="dub-tools">
        <button
          disabled={!!busy || !model.canUndo}
          onClick={() => model.step(true)}
        >
          {t("undo")}
        </button>
        <button
          disabled={!!busy || !model.canRedo}
          onClick={() => model.step(false)}
        >
          {t("redo")}
        </button>
      </div>
      <Timeline
        p={p}
        ms={time}
        selected={selected}
        lang={lang}
        seek={seek}
        select={(c, language) => {
          if (language && p.targetLanguages.includes(language)) setLang(language);
          select(c);
          revealTimelineCue({ id: c.id });
        }}
        change={update}
        add={add}
        locked={
          !!busy ||
          ["source", ...p.targetLanguages].some((l) => track(l).locked)
        }
      />
      {imported && (
        <Dialog label={t("import")} onClose={() => setImported(null)}>
          <h2>
            {t("import")} · {imported.length}
          </h2>
          <div className="dub-import-rows">
            {imported.slice(0, 12).map((c) => (
              <p key={c.id}>
                {timeLabel(c.startMs)} · {c.text}
              </p>
            ))}
          </div>
          <button onClick={() => setImported(null)}>{t("cancel")}</button>
          <button
            onClick={() => {
              edit({ cues: imported });
              select(imported[0]);
              setImported(null);
            }}
          >
            {t("replace")}
          </button>
        </Dialog>
      )}
      {exportOpen && (
        <ExportDialog
          p={p}
          language={lang}
          timeMs={time}
          sourceGain={sourceVol}
          dubGain={dubVol}
          save={model.save}
          jump={(id) => {
            const c = p.cues.find((row) => row.id === id);
            openExport(false);
            if (c) select(c);
            setPanel("tracks");
            setInspectorOpen(true);
          }}
          close={() => openExport(false)}
          done={(file) => {
            setExports((prev) => [
              ...prev.filter((x) => x.id !== file.id),
              file,
            ]);
            void client.invalidateQueries({ queryKey: ["dub-projects"] });
            openExport(false);
          }}
        />
      )}
      {exports.length > 0 && (
        <footer className="dub-downloads">
          {exports.map((x) => (
            <a key={x.id} href={x.url} download>
              {t("download")} {x.format.toUpperCase()} · r{x.revision}
              {x.revision < p.revision && " · " + t("previousExport")}
            </a>
          ))}
        </footer>
      )}
    </section>
  );
}
