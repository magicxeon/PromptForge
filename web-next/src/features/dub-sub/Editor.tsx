import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Pause, Play, Redo2, Undo2, PanelsTopLeft, SlidersHorizontal, Mic } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useActor,
  ProcessingSpinner,
  pollingPolicy,
} from "../../lib/canonical";
import {
  projectsApi,
  requestScenePreview,
  scenePreviewKey,
  type ScenePreview,
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
import { SubtitleCaption, SubtitleInspector } from "./SubtitleInspector";
import { subtitleLanguage } from "../../../../server/domain/dub-sub/subtitleFonts.js";
import { DialogueList } from "./DialogueList";
import { canExportTake, takePlacement } from "../../../../server/domain/dub-sub/takePlacement.js";
import { dubBatchApi, type TimingLine } from "./dubBatchApi";
import { TimingReview } from "./TimingReview";
import { Timeline } from "./Timeline";
import { ExportDialog } from "./ExportDialog";
import { useDubConfirmation } from "./useDubConfirmation";
import { Dialog } from "./Dialog";
import { SceneTranscription } from "./SceneTranscription";
import { useDubDraft } from "./useDubDraft";
import { SpeakerReview } from "./SpeakerReview";
import { detectCueSpeakers } from "./detectCueSpeakers";
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
    <Work key={JSON.stringify([identityScope, id])} initial={query.data} />
  ) : query.error ? (
    <p role="alert">{query.error.message}</p>
  ) : (
    <ProcessingSpinner />
  );
}
function Work({ initial }: { initial: Project }) {
  const confirmation = useDubConfirmation();
  const { t } = useTranslation("dub"),
    model = useDubDraft(initial),
    p = model.draft,
    client = useQueryClient(),
    loc = useLocation();
  const sourceSubtitleLanguage = useMemo(() => subtitleLanguage({
    sourceLanguage: p.sourceLanguage, detectedLanguage: p.detectedLanguage, cues: p.cues,
  }, "source"), [p.sourceLanguage, p.detectedLanguage, p.cues]);
  const { identityScope, actor, config: auth } = useActor();
  const sceneAvailable = actor?.role === "admin" && auth?.authMode === "development_bypass" && auth.development?.liveGeneration;
  const [createdPreview, setCreatedPreview] = useState(() =>
    client.getQueryData<ScenePreview>(scenePreviewKey(identityScope, initial.id)));
  const [sceneOpen, setSceneOpen] = useState(!!createdPreview);
  const navigate = useNavigate();
  const inVoiceSetup = loc.pathname.endsWith("/setup/voices");
  const [casting, setCasting] = useState(inVoiceSetup);
  function closeScene() {
    setSceneOpen(false);
    setCreatedPreview(undefined);
    client.removeQueries({ queryKey: scenePreviewKey(identityScope, initial.id), exact: true });
  }
  const [lang, setLang] = useState<string>(initial.targetLanguages[0] || "source"),
    [selected, setSelected] = useState<string>(initial.cues[0]?.id || "");
  const [inspectorOpen, setInspectorOpen] = useState(false),
    [compact, setCompact] = useState(
      () => window.innerWidth <= config.compactWidth,
    );
  useEffect(() => {
    const mq = matchMedia("(max-width: " + config.compactWidth + "px)");
    const sync = () => setCompact(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const [panel, setPanel] = useState<"tracks" | "font" | "voice">("tracks"),
    [styleLang, setStyleLang] = useState(lang);
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(() => loc.state?.sceneError
      ? t("scene.errors." + loc.state.sceneError, { defaultValue: t("scene.failed") }) : ""),
    [time, setTime] = useState(0),
    [loop, setLoop] = useState(false);
  const [ratio, setRatio] = useState(16 / 9),
    [height, setHeight] = useState(0),
    stage = useRef<HTMLDivElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const [sourceVol, setSourceVol] = useState(1),
    [dubVol, setDubVol] = useState(1),
    [exports, setExports] = useState<Export[]>(p.exports || []);
  const [sourceMuted, setSourceMuted] = useState(false);
  const [mutedSpeakers, setMutedSpeakers] = useState<Record<string, Set<string>>>({});
  function togglePreviewAudio(speaker?: string) {
    if (speaker === undefined) { setSourceMuted(value => !value); return; }
    setMutedSpeakers(previous => {
      const next = new Set(previous[lang]);
      if (next.has(speaker)) next.delete(speaker);
      else next.add(speaker);
      return { ...previous, [lang]: next };
    });
  }
  const [exportOpen, openExport] = useState(false);
  const [imported, setImported] = useState<Cue[] | null>(null),
    [follow, setFollow] = useState(true);
  const [audition, setAudition] = useState<{
    cueId: string;
    endMs: number;
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
  const translationCounts = useMemo(() => {
    const lines = p.cues.filter((row) => row.text.trim());
    return Object.fromEntries(p.targetLanguages.map((language) => {
      const translated = lines.filter((row) => row.translations[language]).length;
      return [language, { total: lines.length, translated }];
    }));
  }, [p.cues, p.targetLanguages]);
  const timingLocked = ["source", ...p.targetLanguages].some((l) => track(l).locked);
  const edit = (patch: Partial<Project>) =>
    model.edit((prev) => ({ ...prev, ...patch }));
  const update = (c: Cue) =>
    model.edit((prev) => ({
      ...prev,
      cues: prev.cues
        .map((row) => (row.id === c.id ? c : row))
        .sort((a, b) => a.startMs - b.startMs),
    }));
  const [timingProposal,setTimingProposal] = useState<{lang:string;revision:number;line:TimingLine}>();
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
    const rows = [cue, next];
    const sources = rows.filter(row => row.text.trim());
    const translationOrigins: Record<string, "gemini"> = {};
    for (const language of p.targetLanguages) {
      const contributors = rows.filter(row => row.translations[language]?.trim());
      if (contributors.length && contributors.every(row => row.translationOrigins?.[language] === "gemini"))
        translationOrigins[language] = "gemini";
    }
    edit({
      cues: p.cues
        .filter((c) => c !== next)
        .map((c) =>
          c !== cue
            ? c
            : {
                ...cue,
                sourceOrigin: sources.length && sources.every(row => row.sourceOrigin === "gemini") ? "gemini" : undefined,
                translationOrigins,
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
      const code = e && typeof e === "object" && "code" in e ? String(e.code) : "";
      setError(label === "translate"
        ? t("scene.errors." + code, { defaultValue: t("scene.translationFailed") })
        : label === "timed.check" ? t("errors."+code,{defaultValue:t("timed.failed")}) : (e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function translate(language: string, overwrite: boolean, line?: Cue) {
    const consent = t("scene.translateConsent", { language: t("lang." + language) });
    const replace = overwrite ? t(line ? "replaceLine" : "replaceTrack", { language: t("lang." + language) }) : "";
    if (!sceneAvailable) return;
    confirmation.ask({
      action: t(line ? "translateCue" : "retranslateAll"),
      message: [consent, replace].filter(Boolean).join("\n"),
      proceed: () => void operation("translate", async (saved) => {
        const next = await projectsApi.process(p.id, "translate", {
          revision: saved.revision,
          language,
          confirmed: true, requestId: crypto.randomUUID(),
          ...(line ? { cueIds: [line.id] } : {}),
          overwrite,
        });
        model.accept(next);
        if (!next.cues.some((c) => c.id === selected))
          setSelected(next.cues[0]?.id || "");
      }),
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
  useTakePlayback(p.cues, lang, time, playing, dubVol, p.mixer, audition, mutedSpeakers[lang]);
  const onTime = () => {
    const ms = Math.round((video.current?.currentTime || 0) * 1000);
    if (audition) {
      if (ms >= audition.endMs) {
        video.current?.pause();
        setPlaying(false);
        setAudition(null);
        seek(audition.endMs);
      } else setTime(ms);
      return;
    }
    if (loop && playing && cue && ms >= cue.endMs) {
      seek(cue.startMs);
      return;
    }
    setTime(ms);
    if (
      follow && !loop &&
      playing &&
      !(document.activeElement instanceof HTMLInputElement) &&
      !(document.activeElement instanceof HTMLTextAreaElement) &&
      !(document.activeElement instanceof HTMLSelectElement)
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
  function togglePlayback() {
    const el = video.current;
    if (!el) return;
    if (el.paused) void el.play().catch((e) => setError(e.message));
    else el.pause();
  }
  useEffect(() => {
    function handleSpace(event: KeyboardEvent) {
      if (event.code !== "Space" || event.defaultPrevented || event.isComposing ||
          event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
          document.querySelector('dialog[open], [aria-modal="true"]') ||
          (event.target instanceof Element && event.target.closest(
            'input, textarea, button, select, a[href], summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="slider"]'
          ))) return;
      if (!video.current) return;
      event.preventDefault();
      if (!event.repeat) togglePlayback();
    }
    window.addEventListener("keydown", handleSpace);
    return () => window.removeEventListener("keydown", handleSpace);
  }, []);
  return (
    <>
    {(casting || inVoiceSetup) && <SpeakerReview key={lang} project={p}
      language={p.targetLanguages.includes(lang) ? lang : p.targetLanguages[0]}
      onLanguage={setLang}
      onReload={async () => model.accept(await projectsApi.read(p.id))}
      onDetect={sceneAvailable && p.mediaUrl && p.hasAudio !== false && !timingLocked ? async () => {
        const saved = await model.save();
        const result = await requestScenePreview(saved, lang, crypto.randomUUID());
        const cues = detectCueSpeakers(saved.cues, result.cues);
        edit({ cues });
        return model.save();
      } : undefined}
      onAssign={async (id, speaker) => {
        model.edit(prev => ({ ...prev, cues: prev.cues.map(c => c.id === id ? { ...c, speaker } : c) }));
        return model.save();
      }}
      setup={inVoiceSetup} openSetup={() => navigate("/dub-sub/projects/" + p.id + "/setup/voices")}
      returnToEditor={() => navigate("/dub-sub/projects/" + p.id, { replace: true })}
      onClose={() => setCasting(false)} onSave={async (speakerProfiles, characterMappings) => {
        edit({ speakerProfiles, characterMappings }); return model.save();
      }} />}
    <section hidden={inVoiceSetup} className={inVoiceSetup ? "dub-editor-away" : "dub-editor"}>
      {confirmation.modal}
      <header className="dub-bar">
        <Link to="/dub-sub"><span aria-hidden="true">‹ </span>{t("projects")}</Link>
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
        <button disabled={!!busy || !p.cues.length} onClick={() => {
          video.current?.pause(); setCasting(true);
        }}>{t("casting.batchTitle")}</button>
        {compact && (
          <button className="dub-open-inspector" aria-expanded={inspectorOpen}
            aria-label={t("editCue") + " · " + t("tracks")}
            title={t("tracks")} onClick={() => setInspectorOpen(!inspectorOpen)}>
            <PanelsTopLeft size={16} />
          </button>
        )}
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
              onClick={() => confirmation.ask({
                action:t("reload"), message:t("overwrite"),
                proceed: () => void projectsApi
                    .read(p.id)
                    .then(model.accept)
                    .catch((e) => setError(e.message)),
              })}
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
          compact={compact}
          cues={p.cues}
          profiles={p.speakerProfiles}
          language={lang}
          languages={p.targetLanguages}
          activeId={active?.id}
          selected={selected}
          following={follow}
          reveal={timelineSelection}
          onSelect={select}
          onDirect={c => { video.current?.pause(); select(c); setPanel("voice"); setInspectorOpen(true); }}
          onUpdate={update}
          onLanguage={(l) => {
            setLang(l);
            setAudition(null);
          }}
          onAdd={() => add(time)}
          sourceLocked={track("source").locked}
          onTranscribe={sceneAvailable ? () => { video.current?.pause(); setSceneOpen(true); } : undefined}
          canTranscribe={!!p.mediaUrl && p.hasAudio !== false && !timingLocked && !!p.targetLanguages.length}
          targetLocked={track(lang).locked}
          timingLocked={timingLocked}
        />
        <section className="dub-preview">
          <div className="dub-stage" ref={stage}>
            <div
              className="dub-picture"
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
                  muted={sourceMuted}
                  preload="metadata"
                  playsInline
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    setRatio(v.videoWidth / v.videoHeight || 16 / 9);
                  }}
                  onTimeUpdate={onTime}
                  onSeeked={onTime}
                  onPlay={() => setPlaying(true)}
                  onPause={() => {setPlaying(false); setAudition(null);}}
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
                      <SubtitleCaption key={l} track={s} language={l} text={text} disabled={!!busy} aspectRatio={ratio}
                        script={l === "source" ? sourceSubtitleLanguage : l}
                        changeY={(y) => setStyle(l, { y })} />
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
              className="dub-play-toggle"
              aria-label={t(playing ? "pause" : "play")}
              title={t(playing ? "pause" : "play")}
              onClick={togglePlayback}
            >
              {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
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
                <section className="dub-track" key={l} aria-label={t("lang." + l)}>
                  <div className="dub-track-heading">
                    <label>
                      <input type="checkbox" checked={track(l).visible}
                        onChange={(e) => setStyle(l, { visible: e.target.checked })} />
                      {t("lang." + l)}
                    </label>
                    <button onClick={() => { setStyleLang(l); setPanel("font"); }}
                      aria-label={t("font") + " · " + t("lang." + l)} title={t("font")}>
                      <SlidersHorizontal size={15} aria-hidden="true" />
                    </button>
                  </div>
                  <details>
                    <summary>{t(l === "source" ? "sourceTools" : "translationTools")}</summary>
                    {l === "source" ? (
                      <div className="dub-tools">
                        <button disabled={!p.mediaUrl || timingLocked} onClick={() => void operation("ocr", async (saved) => {
                          const result = await projectsApi.detect(p.id, "ocr", {
                            revision: saved.revision, language: p.sourceLanguage === "auto" ? "zh" : p.sourceLanguage,
                          });
                          setImported(result.cues);
                        })}>{t("ocr")}</button>
                        <button disabled={timingLocked} onClick={() => fileInput.current?.click()}>{t("import")}</button>
                      </div>
                    ) : (
                      <div className="dub-tools">
                        {track(l).locked && (
                          <button onClick={() => setStyle(l, { locked: false })}>
                            {t("unlockLanguageTrack", { language: t("lang." + l) })}
                          </button>
                        )}
                        <button disabled={!sceneAvailable || track(l).locked || translationCounts[l].translated === translationCounts[l].total}
                          onClick={() => translate(l, false)}>{t("translateMissing")}</button>
                        <button disabled={!sceneAvailable || track(l).locked || !translationCounts[l].total}
                          onClick={() => translate(l, translationCounts[l].translated > 0)}>{t("retranslateAll")}</button>
                      </div>
                    )}
                  </details>
                </section>
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
              <details className="dub-audio-settings">
                <summary>{t("playbackSettings")}</summary>
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
              </details>
              {cue && (
                <section className="dub-cue-actions" aria-label={t("selectedLine")}>
                  <h3>{t("selectedLine")}</h3>
                  <small className="dub-cue-range">{timeLabel(cue.startMs)} – {timeLabel(cue.endMs)}</small>
                  <p className="dub-cue-excerpt">{cue.translations[lang]?.trim() || cue.text}</p>
                  <div className="dub-tools">
                    <button className="primary" onClick={() => setPanel("voice")}>
                      <Mic size={16} aria-hidden="true" /> {t("chooseVoice")}
                    </button>
                      <button disabled={!sceneAvailable || track(lang).locked || !cue.text.trim()}
                      onClick={() => translate(lang, !!cue.translations[lang], cue)}>{t("translateCue")}</button>
                  </div>
                  <details>
                    <summary>{t("arrangeTiming")}</summary>
                    <div className="dub-tools">
                      <button disabled={timingLocked || time <= cue.startMs || time >= cue.endMs} onClick={split}>{t("split")}</button>
                      <button disabled={timingLocked || p.cues.at(-1) === cue} onClick={merge}>{t("merge")}</button>
                    </div>
                    {!timingLocked && (time <= cue.startMs || time >= cue.endMs) && <small>{t("splitHint")}</small>}
                  </details>
                  <details>
                    <summary>{t("cueDetails")}</summary>
                  <label>
                    {t("speaker")}
                    <input
                      value={cue.speaker || ""}
                      onChange={(e) =>
                        update({ ...cue, speaker: e.target.value })
                      }
                    />
                  </label>
                  <div className="dub-pair">
                    {(["startMs", "endMs"] as const).map((key) => (
                      <label key={key}>
                        {t(key)}
                        <input
                          type="number"
                          disabled={timingLocked}
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
                  </details>
                  <div className="dub-cue-delete">
                    <button disabled={timingLocked} onClick={() => {
                      const remaining = p.cues.filter((c) => c.id !== cue.id);
                      edit({ cues: remaining });
                      setSelected(remaining[Math.min(p.cues.indexOf(cue), remaining.length - 1)]?.id || "");
                    }}>{t("deleteLine")}</button>
                  </div>
                </section>
              )}
            </>
          ) : panel === "font" ? (
            <SubtitleInspector
              language={styleLang}
              script={
                styleLang === "source"
                  ? sourceSubtitleLanguage
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
                {sceneAvailable && <button disabled={!!busy || !!p.tracks[lang]?.locked} onClick={()=>void operation("timed.check",async saved=>{
                  const [line] = await dubBatchApi.timing(saved.id,saved.revision,lang,[cue.id],true);
                  if (line) setTimingProposal({lang,revision:saved.revision,line});
                })}>{t("timed.shorten")}</button>}
                {timingProposal?.line.id === cue.id && timingProposal.lang === lang && timingProposal.revision === p.revision &&
                  <><TimingReview disabled={!!busy} lines={[timingProposal.line]} cues={[cue]} onRequest={director=>void operation("timed.check",async saved=>{
                    const [line] = await dubBatchApi.timing(saved.id,saved.revision,lang,[cue.id],true,director);
                    if (line) setTimingProposal({lang,revision:saved.revision,line});
                  })} onEdit={(_,text)=>setTimingProposal({
                    ...timingProposal,line:{...timingProposal.line,suggested:text}
                  })}/><button disabled={!timingProposal.line.suggested.trim() || !!p.tracks[lang]?.locked} onClick={()=>{
                    update({...cue,voiceBindings:{...cue.voiceBindings,[lang]:{...cue.voiceBindings[lang],dubText:timingProposal.line.suggested.trim()}}});
                    setTimingProposal(undefined);
                  }}>{t("timed.use")}</button><button onClick={()=>setTimingProposal(undefined)}>{t("cancel")}</button></>}
                <Voice
                  key={cue.id + lang}
                  projectId={p.id}
                  cueId={cue.id}
                  targetMs={cue.endMs - cue.startMs}
                  cueStartMs={cue.startMs}
                  cueOffsetMs={cue.offsetMs} projectDurationMs={p.durationMs ?? undefined}
                  loadSpeechWindows={async()=>{
                    const saved = await model.save();
                    return dubBatchApi.cueRhythm(saved.id,saved.revision,cue.id);
                  }}
                  suggestedDelivery={cue.suggestedDelivery?.[lang]}
                  overrides={cue.deliveryOverrides?.[lang]}
                  onDeliveryChange={value => update({ ...cue, deliveryOverrides: { ...cue.deliveryOverrides, [lang]: value } })}
                  speaker={cue.speaker || ""}
                  language={lang}
                  defaultCharacterId={
                    cue.speaker
                      ? p.characterMappings[lang]?.[cue.speaker]
                      : undefined
                  }
                  onAudition={(take) => {
                    const start = cue.startMs + (cue.offsetMs ?? 0);
                    const speechEnd = take.rhythmReview?.actualEndMs || take.durationMs;
                    setAudition({ cueId: cue.id, ...take, endMs:Math.min(duration,start + Math.min(speechEnd,take.durationMs)) });
                    seek(Math.max(0,start));
                    void video.current
                      ?.play()
                      .catch((e) => {setAudition(null); setError(e.message);});
                  }}
                  usedTakeId={cue.takes[lang]?.id}
                  internalPausesAccepted={cue.takes[lang]?.internalPausesAccepted}
                  onUseBoundaries={async (takeId,confirmedOverrunMs)=>{
                    const saved=await model.save();
                    model.accept(await projectsApi.useTakeBoundaries(saved,lang,cue.id,takeId,confirmedOverrunMs));
                  }}
                  onTakeDeleted={id=>{
                    if (audition?.id===id) {video.current?.pause();setAudition(null);}
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
                    {!canExportTake(takePlacement(cue,cue.takes[lang].durationMs,p.durationMs ?? undefined),
                      cue.takes[lang].durationMs,cue.takes[lang].confirmedOverrunMs) &&
                      t("overrun")}
                  </p>
                )}
              </Suspense>
            )
          )}
        </aside>
      </fieldset>
      <Timeline historyControls={<>
        <button
          aria-label={t("undo")} title={t("undo")}
          disabled={!!busy || !model.canUndo}
          onClick={() => model.step(true)}
        >
          <Undo2 size={15} />
        </button>
        <button
          aria-label={t("redo")} title={t("redo")}
          disabled={!!busy || !model.canRedo}
          onClick={() => model.step(false)}
        >
          <Redo2 size={15} />
        </button>
      </>}
        p={p}
        ms={time}
        playing={playing}
        following={follow}
        sourceMuted={sourceMuted}
        mutedSpeakers={mutedSpeakers[lang]}
        togglePreviewAudio={togglePreviewAudio}
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
        locked={!!busy || timingLocked}
      />
      {sceneOpen && sceneAvailable && (
        <SceneTranscription project={p} language={p.targetLanguages.includes(lang) ? lang : p.targetLanguages[0]}
          locked={timingLocked || !!busy} initialPreview={createdPreview}
          prepare={(languageStyle, storyContext) => {
            if (p.languageStyle !== languageStyle || p.storyContext !== storyContext) edit({ languageStyle, storyContext });
            return model.save();
          }}
          apply={(cues, language, detectedLanguage) => {
            edit({ cues, ...(p.sourceLanguage === "auto" ? { detectedLanguage } : {}) });
            setLang(language);
            select(cues[0]);
            closeScene();
            if (cues.some(row => row.speaker?.trim())) setCasting(true);
          }}
          close={closeScene} />
      )}
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
              if (imported[0]) select(imported[0]);
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
    </>
  );
}
