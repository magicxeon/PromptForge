import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  apiMediaBlob,
  getIdentitySnapshot,
  ProcessingSpinner,
  useActor,
} from "../../lib/canonical";
import { projectsApi, type Project, type Cue, timeLabel } from "./projectApi";
import i18n from "../../app/i18n";
import en from "../../locales/en/dubTimeline.json";
import th from "../../locales/th/dubTimeline.json";
import config from "./editor-config.json";
import "./timeline.css";
import { activeCharacters } from "./dubbingCharacters";

i18n.addResourceBundle("en", "dubTimeline", en);
i18n.addResourceBundle("th", "dubTimeline", th);

type Props = {
  historyControls: ReactNode;
  p: Project;
  ms: number;
  playing: boolean;
  following: boolean;
  sourceMuted: boolean;
  mutedSpeakers?: ReadonlySet<string>;
  togglePreviewAudio: (speaker?: string) => void;
  selected: string;
  lang: string;
  seek: (ms: number) => void;
  select: (cue: Cue, language?: string) => void;
  change: (cue: Cue) => void;
  add: (ms: number) => void;
  locked: boolean;
};
type Take = Cue["takes"][string];
type Clip = { cue: Cue; start: number; end: number; take?: Take; badge?: { name: string; color: string; voice: string } };
type Lane = {
  id: string;
  kind: "source" | "subtitle" | "take";
  language?: string;
  speaker?: string;
  clips: Clip[];
  maxEnds: number[];
  locked: boolean;
};
type Actions = Pick<Props, "select" | "change" | "seek" | "add" | "togglePreviewAudio">;
const ROW = 38,
  RULER = 30,
  LABEL = 132,
  OVERSCAN = 100,
  MAX_CLIPS = 64,
  MAX_WAVES = 16;

function indexLane(lane: Omit<Lane, "maxEnds">): Lane {
  lane.clips.sort((a, b) => a.start - b.start);
  let maximum = -Infinity;
  return {
    ...lane,
    maxEnds: lane.clips.map((clip) => (maximum = Math.max(maximum, clip.end))),
  };
}
function visibleClips(lane: Lane, start: number, end: number) {
  let low = 0,
    high = lane.maxEnds.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (lane.maxEnds[mid] < start) low = mid + 1;
    else high = mid;
  }
  const result: Clip[] = [];
  for (let i = low; i < lane.clips.length && lane.clips[i].start <= end; i++)
    if (lane.clips[i].end >= start) result.push(lane.clips[i]);
  return result;
}

// Viewport-mounted takes alone retain peaks: no durable audio bytes or AudioBuffers.
// Project/actor lifetime; two reads at once; each take <=120s and encoded file <=16MiB.
function createWaveformReader() {
  let context: AudioContext | undefined,
    disposed = false,
    cursor = 0,
    lifetime = 0;
  const queues = [Promise.resolve(), Promise.resolve()];
  return {
    activate() {
      disposed = false;
    },
    dispose() {
      disposed = true;
      lifetime++;
      if (context) void context.close();
      context = undefined;
    },
    read(take: Take, signal: AbortSignal): Promise<number[]> {
      const epoch = getIdentitySnapshot().epoch,
        version = lifetime,
        slot = cursor++ % queues.length;
      const current = () =>
        !disposed &&
        version === lifetime &&
        !signal.aborted &&
        getIdentitySnapshot().ready &&
        getIdentitySnapshot().epoch === epoch;
      const job = queues[slot]
        .catch(() => {})
        .then(async () => {
          if (!current() || take.durationMs > 120000 || take.durationMs <= 0)
            throw new Error("waveform_unavailable");
          const blob = await apiMediaBlob(take.audioUrl, signal);
          if (!current() || blob.size > 16 * 1024 * 1024)
            throw new Error("waveform_unavailable");
          context ??= new AudioContext({ sampleRate: 16000 });
          const decoded = await context.decodeAudioData(
            await blob.arrayBuffer(),
          );
          if (!current() || decoded.duration > 120)
            throw new Error("waveform_unavailable");
          const bins = Math.min(1024, decoded.length),
            peaks = new Array<number>(bins).fill(0);
          for (
            let channel = 0;
            channel < Math.min(2, decoded.numberOfChannels);
            channel++
          ) {
            const pcm = decoded.getChannelData(channel);
            for (let bin = 0; bin < bins; bin++) {
              const from = Math.floor((bin * pcm.length) / bins),
                to = Math.floor(((bin + 1) * pcm.length) / bins);
              for (let sample = from; sample < to; sample++)
                peaks[bin] = Math.max(peaks[bin], Math.abs(pcm[sample]));
            }
          }
          if (!current()) throw new Error("waveform_unavailable");
          return peaks;
        });
      queues[slot] = job.then(
        () => {},
        () => {},
      );
      return job;
    },
  };
}
type WaveformReader = ReturnType<typeof createWaveformReader>;

function paintPeaks(
  ctx: CanvasRenderingContext2D,
  peaks: number[],
  width: number,
  height: number,
  from = 0,
  to = 1,
) {
  ctx.clearRect(0, 0, width, height);
  for (let x = 0; x < width; x++) {
    const first = Math.max(
      0,
      Math.floor((from + ((to - from) * x) / width) * peaks.length),
    );
    const last = Math.min(
      peaks.length,
      Math.max(
        first + 1,
        Math.ceil((from + ((to - from) * (x + 1)) / width) * peaks.length),
      ),
    );
    let peak = 0;
    for (let index = first; index < last; index++)
      peak = Math.max(peak, Math.abs(peaks[index] || 0));
    if (peak > 0)
      ctx.fillRect(
        x,
        (height - peak * height) / 2,
        1,
        Math.max(1, peak * height),
      );
  }
}

const TakeWave = memo(function TakeWave({
  take,
  reader,
  scope,
  projectId,
  from,
  to,
  width,
}: {
  take: Take;
  reader: WaveformReader;
  scope: string;
  projectId: string;
  from: number;
  to: number;
  width: number;
}) {
  const { t } = useTranslation("dubTimeline"),
    canvas = useRef<HTMLCanvasElement>(null);
  const query = useQuery({
    queryKey: ["dub-take-peaks", scope, projectId, take.id, take.audioUrl],
    queryFn: ({ signal }) => reader.read(take, signal),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
  useEffect(() => {
    const el = canvas.current;
    if (!el || !query.data) return;
    el.width = Math.max(1, Math.ceil(width));
    el.height = 26;
    const ctx = el.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#665087";
      paintPeaks(ctx, query.data, el.width, el.height, from, to);
    }
  }, [query.data, from, to, width]);
  return query.isError ? (
    <span className="dub-wave-message" title={t("waveError")}>
      {t("waveErrorShort")}
    </span>
  ) : (
    <>
      <canvas
        ref={canvas}
        className="dub-take-wave"
        data-ready={!!query.data}
        aria-label={t("takeWaveform")}
      />
      {query.isPending && <ProcessingSpinner className="dub-wave-spinner" />}
    </>
  );
});

function adjustedClip(
  clip: Clip,
  mode: "move" | "start" | "end",
  delta: number,
  duration: number,
): Cue {
  const cue = clip.cue;
  if (clip.take) {
    const start = Math.max(
      0,
      Math.min(
        Math.max(0, duration - clip.take.durationMs),
        clip.start + delta,
      ),
    );
    return { ...cue, offsetMs: Math.round(start - cue.startMs) };
  }
  if (mode === "start")
    return {
      ...cue,
      startMs: Math.round(
        Math.max(
          0,
          Math.min(cue.endMs - config.minimumCueMs, cue.startMs + delta),
        ),
      ),
    };
  if (mode === "end")
    return {
      ...cue,
      endMs: Math.round(
        Math.min(
          duration,
          Math.max(cue.startMs + config.minimumCueMs, cue.endMs + delta),
        ),
      ),
    };
  const start = Math.round(
    Math.max(
      0,
      Math.min(duration - (cue.endMs - cue.startMs), cue.startMs + delta),
    ),
  );
  return { ...cue, startMs: start, endMs: start + cue.endMs - cue.startMs };
}

const CueClip = memo(function CueClip({
  clip,
  language,
  left,
  width,
  scale,
  duration,
  chosen,
  text,
  locked,
  actions,
  waveform,
}: {
  clip: Clip;
  language?: string;
  left: number;
  width: number;
  scale: number;
  duration: number;
  chosen: boolean;
  text: string;
  locked: boolean;
  actions: Actions;
  waveform?: {
    reader: WaveformReader;
    scope: string;
    projectId: string;
    from: number;
    to: number;
    width: number;
  };
}) {
  const { t } = useTranslation("dubTimeline"),
    node = useRef<HTMLDivElement>(null);
  const drag = useRef<{
      x: number;
      mode: "move" | "start" | "end";
      moved: boolean;
    } | null>(null),
    suppressClick = useRef(false);
  const startDrag = (
    event: PointerEvent<HTMLButtonElement>,
    mode: "move" | "start" | "end",
  ) => {
    if (locked || event.button !== 0) return;
    drag.current = { x: event.clientX, mode, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (!state || !node.current) return;
    const delta = event.clientX - state.x;
    if (Math.abs(delta) < 3 && !state.moved) return;
    state.moved = true;
    node.current.style.transform = `translateX(${state.mode === "end" ? 0 : delta}px)`;
    if (state.mode !== "move")
      node.current.style.width = `${Math.max(8, width + (state.mode === "start" ? -delta : delta))}px`;
  };
  const finish = (
    event: PointerEvent<HTMLButtonElement>,
    cancelled = false,
  ) => {
    const state = drag.current;
    drag.current = null;
    if (node.current) {
      node.current.style.transform = "";
      node.current.style.width = `${width}px`;
    }
    if (!state?.moved || cancelled || locked) return;
    suppressClick.current = true;
    const next = adjustedClip(
      clip,
      state.mode,
      Math.round((event.clientX - state.x) / scale),
      duration,
    );
    actions.change(next);
    actions.select(next, language);
  };
  const keyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    mode?: "start" | "end",
  ) => {
    if (locked || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const delta =
      (event.key === "ArrowLeft" ? -1 : 1) *
      (event.ctrlKey || event.metaKey ? 500 : 50);
    const next = adjustedClip(
      clip,
      mode || (event.altKey ? "start" : event.shiftKey ? "end" : "move"),
      delta,
      duration,
    );
    actions.change(next);
    actions.select(next, language);
  };
  const pointerProps = {
    onPointerMove: move,
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => finish(event),
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) =>
      finish(event, true),
  };
  return (
    <div
      ref={node}
      data-cue-id={clip.cue.id}
      className={`dub-timeline-clip ${chosen ? "current" : ""} ${clip.take ? "is-take" : ""}`}
      style={{ left, width }}
    >
      <button
        type="button"
        className={clip.badge ? "dub-cue-button has-cast" : "dub-cue-button"}
        aria-pressed={chosen}
        data-start-ms={clip.start}
        title={[`${timeLabel(clip.start)} – ${timeLabel(clip.end)} (${timeLabel(clip.end - clip.start)})`, clip.badge?.name, clip.badge?.voice, text].filter(Boolean).join(" · ")}
        aria-label={[text || t("emptyCue"), timeLabel(clip.start), clip.badge?.name, clip.badge?.voice].filter(Boolean).join(" · ")}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          actions.select(clip.cue, language);
        }}
        onKeyDown={(event) => keyboard(event)}
        onPointerDown={(event) => startDrag(event, "move")}
        {...pointerProps}
      >
        {waveform && clip.take && <TakeWave take={clip.take} {...waveform} />}
        <span>{text || t("emptyCue")}</span>
        {clip.badge && <small aria-hidden="true" className="dub-cast-badge" style={{ borderColor: clip.badge.color }}>
          {width > 110 ? clip.badge.name : ""}
        </small>}
        {clip.take && clip.end > clip.cue.endMs && (
          <span className="dub-take-overrun" title={t("overrun")}>
            !
          </span>
        )}
      </button>
      {chosen && !clip.take && !locked && (
        <>
          <button
            type="button"
            className="dub-trim start"
            aria-label={t("trimStart")}
            onKeyDown={(event) => keyboard(event, "start")}
            onPointerDown={(event) => startDrag(event, "start")}
            {...pointerProps}
          />
          <button
            type="button"
            className="dub-trim end"
            aria-label={t("trimEnd")}
            onKeyDown={(event) => keyboard(event, "end")}
            onPointerDown={(event) => startDrag(event, "end")}
            {...pointerProps}
          />
        </>
      )}
    </div>
  );
});

const TimelineLane = memo(function TimelineLane({
  lane,
  index,
  scale,
  duration,
  viewLeft,
  viewWidth,
  selected,
  actions,
  peaks,
  reader,
  scope,
  projectId,
  globalLocked,
  waveBudget,
  muted,
}: {
  lane: Lane;
  index: number;
  scale: number;
  duration: number;
  viewLeft: number;
  viewWidth: number;
  selected: string;
  actions: Actions;
  peaks?: number[];
  reader: WaveformReader;
  scope: string;
  projectId: string;
  globalLocked: boolean;
  waveBudget: number;
  muted: boolean;
}) {
  const { t } = useTranslation("dubTimeline"),
    { t: dub } = useTranslation("dub"),
    canvas = useRef<HTMLCanvasElement>(null);
  const start = Math.max(0, (viewLeft - OVERSCAN) / scale),
    end = (viewLeft + viewWidth + OVERSCAN) / scale;
  const visible = useMemo(
    () => visibleClips(lane, start, end),
    [lane, start, end],
  );
  const dense =
    visible.length > MAX_CLIPS ||
    (visible.length > 8 &&
      visible.every((clip) => (clip.end - clip.start) * scale < 8));
  const clips = dense
    ? visible.filter((clip) => clip.cue.id === selected).slice(0, 1)
    : visible;
  const label =
    lane.kind === "source"
      ? t("originalAudio")
      : lane.kind === "subtitle"
        ? t("subtitleTrack", { language: dub(`lang.${lane.language}`) })
        : t("takeTrack", {
            speaker: lane.speaker || t("unnamedSpeaker"),
            language: dub(`lang.${lane.language}`),
          });
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    el.width = Math.max(1, Math.ceil(viewWidth));
    el.height = ROW - 6;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, el.width, el.height);
    if (lane.kind === "source") {
      ctx.fillStyle = "#557c70";
      if (peaks)
        paintPeaks(
          ctx,
          peaks,
          el.width,
          el.height,
          viewLeft / scale / duration,
          (viewLeft + viewWidth) / scale / duration,
        );
    } else if (dense) {
      ctx.fillStyle = lane.kind === "take" ? "#c5b7da" : "#bed9c5";
      for (const clip of visible)
        ctx.fillRect(
          Math.floor(clip.start * scale - viewLeft),
          6,
          Math.max(1, (clip.end - clip.start) * scale - 1),
          ROW - 18,
        );
    }
  }, [lane.kind, peaks, viewWidth, viewLeft, scale, duration, dense, visible]);
  const pointerTime = (clientX: number, target: HTMLElement) =>
    Math.max(
      0,
      Math.min(
        duration,
        (clientX - target.getBoundingClientRect().left + viewLeft) / scale,
      ),
    );
  return (
    <div
      className={`dub-timeline-lane lane-${lane.kind}`}
      style={{ top: RULER + index * ROW }}
      aria-label={label}
    >
      <div className="dub-timeline-label" title={label}>
        {lane.kind === "subtitle" ? label : <label className="dub-track-preview">
          <input type="checkbox" checked={!muted} onChange={() => actions.togglePreviewAudio(lane.speaker)} />
          <span>{label}</span>
        </label>}
        {lane.locked && lane.kind !== "source" && <span> · {t("locked")}</span>}
      </div>
      <canvas
        ref={canvas}
        className="dub-lane-overview"
        style={{ left: LABEL + viewLeft, width: viewWidth }}
        aria-label={
          lane.kind === "source"
            ? t("originalWaveform")
            : t("overview", { track: label })
        }
        onClick={(event) => {
          const ms = pointerTime(event.clientX, event.currentTarget);
          const clip = visible.find(
            (item) => item.start <= ms && item.end >= ms,
          );
          if (clip) actions.select(clip.cue, lane.language);
          else actions.seek(ms);
        }}
        onDoubleClick={(event) => {
          const time = pointerTime(event.clientX, event.currentTarget);
          if (
            !globalLocked &&
            !lane.locked &&
            lane.kind === "subtitle" &&
            !visible.some((clip) => clip.start <= time && clip.end >= time)
          )
            actions.add(time);
        }}
      />
      {clips.map((clip, clipIndex) => {
        const rawLeft = clip.start * scale,
          rawRight = clip.end * scale;
        const left = Math.max(rawLeft, viewLeft - OVERSCAN),
          right = Math.min(rawRight, viewLeft + viewWidth + OVERSCAN);
        const waveform =
          clip.take &&
          !dense &&
          clipIndex < waveBudget &&
          right - left >= 12 &&
          rawRight > viewLeft &&
          rawLeft < viewLeft + viewWidth
            ? {
                reader,
                scope,
                projectId,
                from: (left - rawLeft) / (rawRight - rawLeft),
                to: (right - rawLeft) / (rawRight - rawLeft),
                width: right - left,
              }
            : undefined;
        const text =
          lane.kind === "take"
            ? lane.speaker || t("unnamedSpeaker")
            : lane.language === "source"
              ? clip.cue.text
              : clip.cue.translations[lane.language!] || "";
        return (
          <CueClip
            key={clip.cue.id}
            clip={clip}
            language={lane.language}
            left={LABEL + left}
            width={Math.max(8, right - left)}
            scale={scale}
            duration={duration}
            chosen={selected === clip.cue.id}
            text={text}
            locked={globalLocked || lane.locked}
            actions={actions}
            waveform={waveform}
          />
        );
      })}
      {lane.kind === "take" && dense && (
        <span
          className="dub-density-note"
          style={{ left: LABEL + viewLeft + 4 }}
        >
          {t("zoomWaveforms")}
        </span>
      )}
    </div>
  );
});

const Playhead = memo(function Playhead({
  ms,
  scale,
  duration,
  height,
}: {
  ms: number;
  scale: number;
  duration: number;
  height: number;
}) {
  const offset = Math.max(0, Math.min(ms * scale, duration * scale - 2));
  return (
    <div
      className="dub-timeline-playhead"
      style={{
        transform: `translateX(${LABEL + offset}px)`,
        height,
      }}
      aria-hidden="true"
    />
  );
});

export function Timeline(props: Props) {
  const { p, ms, selected, lang, locked, playing, following } = props;
  const { t } = useTranslation("dubTimeline"),
    { identityScope, isLoading } = useActor();
  const scroll = useRef<HTMLDivElement>(null),
    latest = useRef(props);
  const manualScroll = useRef(false);
  function suspendFollow() {
    if (playing) manualScroll.current = true;
  }
  latest.current = props;
  const actions = useMemo<Actions>(
    () => ({
      seek: (value) => latest.current.seek(value),
      select: (cue, language) => latest.current.select(cue, language),
      change: (cue) => latest.current.change(cue),
      add: (value) => latest.current.add(value),
      togglePreviewAudio: (speaker) => latest.current.togglePreviewAudio(speaker),
    }),
    [],
  );
  const [zoom, setZoom] = useState(1),
    [viewport, setViewport] = useState({
      left: 0,
      top: 0,
      width: 800,
      height: 330,
    });
  const duration = useMemo(
    () =>
      p.durationMs ||
      p.cues.reduce((maximum, cue) => Math.max(maximum, cue.endMs), 1000),
    [p.durationMs, p.cues],
  );
  const characters = useQuery({
    queryKey: ["dubVoice", identityScope, "characters"], queryFn: activeCharacters,
    enabled: !isLoading && Object.values(p.characterMappings).some(mapping => Object.keys(mapping).length > 0),
  });
  const lanes = useMemo(() => {
    const names = new Map(characters.data?.map(character => [character.id, character.name]));
    const result: Lane[] = [
      indexLane({ id: "audio", kind: "source", clips: [], locked: true }),
    ];
    for (const language of ["source", ...p.targetLanguages])
      result.push(
        indexLane({
          id: `sub:${language}`,
          kind: "subtitle",
          language,
          locked: !!p.tracks[language]?.locked,
          clips: p.cues.map((cue) => {
            const profile = language !== "source" && cue.speaker ? p.speakerProfiles?.[cue.speaker] : undefined;
            return { cue, start: cue.startMs, end: cue.endMs,
              badge: profile && cue.speaker ? { name: profile.name, color: profile.color, voice: names.get(p.characterMappings[language]?.[cue.speaker]) || "" } : undefined };
          }),
        }),
      );
    const speakers = new Map<string, Clip[]>();
    for (const cue of p.cues) {
      const take = cue.takes[lang];
      if (!take) continue;
      const speaker = cue.speaker || "",
        clips = speakers.get(speaker) || [];
      const start = cue.startMs + (cue.offsetMs || 0);
      clips.push({ cue, take, start, end: start + take.durationMs });
      speakers.set(speaker, clips);
    }
    for (const [speaker, clips] of speakers)
      result.push(
        indexLane({
          id: `take:${speaker}`,
          kind: "take",
          speaker,
          language: lang,
          clips,
          locked: !!p.tracks[lang]?.locked,
        }),
      );
    return result;
  }, [p.cues, p.targetLanguages, p.tracks, p.speakerProfiles, p.characterMappings, characters.data, lang]);
  const selectedCue = useMemo(
    () => p.cues.find((cue) => cue.id === selected),
    [p.cues, selected],
  );
  const reader = useMemo(createWaveformReader, [identityScope, p.id]);
  useEffect(() => {
    reader.activate();
    return () => reader.dispose();
  }, [reader]);
  const peaks = useQuery({
    queryKey: ["dub-peaks", identityScope, p.id, p.mediaUrl],
    queryFn: ({ signal }) => projectsApi.peaks(p.id, signal),
    enabled: !!p.mediaUrl && !isLoading,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    const measure = () =>
      setViewport((value) => ({
        ...value,
        width: Math.max(100, el.clientWidth - LABEL),
        height: el.clientHeight,
      }));
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, []);
  const contentWidth = Math.max(1, viewport.width * zoom),
    scale = contentWidth / duration;
  // Paint a bounded window ahead of the scroll position. Native scrolling
  // moves the existing waveform between tiles without rasterizing every frame.
  const renderLeft = Math.min(viewport.left, contentWidth - viewport.width);
  const renderWidth = Math.min(contentWidth - renderLeft, viewport.width + OVERSCAN);
  const zoomLevels = useMemo(() => {
    const levels = [...config.timelineZoom];
    // 1x fits the whole video. Long projects may zoom further to edit short cues.
    while (
      (levels[levels.length - 1] * viewport.width) / (duration / 1000) < 80 &&
      levels.length < 14
    )
      levels.push(levels[levels.length - 1] * 2);
    return levels;
  }, [duration, viewport.width]);
  useLayoutEffect(() => { manualScroll.current = false; }, [playing, following]);
  useLayoutEffect(() => {
    const el = scroll.current;
    if (!el || !playing || !following || manualScroll.current || zoom === 1) return;
    const next = Math.min(contentWidth - viewport.width,
      Math.max(0, ms * scale - viewport.width * config.timelineFollowAnchor));
    if (Math.abs(el.scrollLeft - next) >= 0.5) el.scrollLeft = next;
  }, [playing, following, ms, zoom, scale, contentWidth, viewport.width]);
  useEffect(() => {
    const el = scroll.current;
    if (!el || latest.current.playing || zoom === 1 || !selectedCue) return;
    const left = selectedCue.startMs * scale,
      right = selectedCue.endMs * scale;
    if (left < el.scrollLeft || right > el.scrollLeft + viewport.width)
      el.scrollLeft = Math.max(0, left - viewport.width * config.timelineFollowAnchor);
  }, [selected, scale, viewport.width, zoom]);
  const firstLane = Math.max(0, Math.floor((viewport.top - RULER) / ROW) - 1),
    lastLane = Math.min(
      lanes.length,
      Math.ceil((viewport.top + viewport.height) / ROW) + 1,
    );
  const visibleLanes = useMemo(
    () => lanes.slice(firstLane, lastLane),
    [lanes, firstLane, lastLane],
  );
  const takeLaneCount = Math.max(
    1,
    visibleLanes.filter((lane) => lane.kind === "take").length,
  );
  const tickStep = Math.max(1000, 10 ** Math.ceil(Math.log10(90 / scale))),
    ticks = [];
  for (
    let time = Math.ceil(renderLeft / scale / tickStep) * tickStep;
    time <= (renderLeft + renderWidth) / scale;
    time += tickStep
  )
    ticks.push(time);
  const height = RULER + lanes.length * ROW,
    selectionLocked = locked || !!p.tracks[lang]?.locked;
  return (
    <section
      className="dub-timeline dub-virtual-timeline"
      aria-label={t("timeline")}
    >
      <header>
        <b>{t("timeline")}</b>
        {props.historyControls}
        <button type="button" popoverTarget="dub-timeline-options"
          title={t("timingOptions")} aria-label={t("timingOptions")}><SlidersHorizontal size={15} /></button>
        <label>
          {t("zoom")}
          <select
            aria-label={t("zoomLabel")}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          >
            {zoomLevels.map((value) => (
              <option key={value} value={value}>
                {value === 1 ? t("fit") : `${value}×`}
              </option>
            ))}
          </select>
        </label>
      </header>
      {peaks.isFetching && (
        <p role="status">
          <ProcessingSpinner className="small-spinner" />{" "}
          {t("originalWaveform")}
        </p>
      )}
      {peaks.isError && (
        <p role="status">
          {t("waveError")}{" "}
          <button type="button" onClick={() => void peaks.refetch()}>
            {t("retry")}
          </button>
        </p>
      )}
      <div
        className="dub-time-scroll dub-timeline-viewport"
        data-fit={zoom === 1}
        ref={scroll}
        style={{ height: height + 16 }}
        tabIndex={0}
        aria-label={t("scrollTimeline")}
        onWheelCapture={suspendFollow}
        onPointerDownCapture={suspendFollow}
        onKeyDownCapture={suspendFollow}
        onScroll={(event) => {
          const el = event.currentTarget;
          const left = Math.floor(el.scrollLeft / OVERSCAN) * OVERSCAN;
          const top = el.scrollTop;
          setViewport((value) => value.left === left && value.top === top ? value : { ...value, left, top });
        }}
      >
        <div
          className="dub-timeline-content"
          style={{ width: zoom === 1 ? "100%" : LABEL + contentWidth, height }}
        >
          <div className="dub-timeline-ruler">
            <span className="dub-timeline-label">{t("tracks")}</span>
            <div
              className="dub-ruler-ticks"
              style={{ left: LABEL + renderLeft, width: renderWidth }}
              onClick={(event) =>
                actions.seek(
                  Math.min(
                    duration,
                    Math.max(
                      0,
                      (event.clientX -
                        event.currentTarget.getBoundingClientRect().left +
                        renderLeft) /
                        scale,
                    ),
                  ),
                )
              }
            >
              {ticks.map((time) => (
                <small
                  key={time}
                  style={{ left: time * scale - renderLeft }}
                >
                  {timeLabel(time).slice(0, 8)}
                </small>
              ))}
            </div>
          </div>
          {!isLoading &&
            visibleLanes.map((lane, index) => (
              <TimelineLane
                key={lane.id}
                lane={lane}
                muted={lane.kind === "source" ? props.sourceMuted : !!props.mutedSpeakers?.has(lane.speaker || "")}
                index={firstLane + index}
                scale={scale}
                duration={duration}
                viewLeft={renderLeft}
                viewWidth={renderWidth}
                selected={selected}
                actions={actions}
                peaks={lane.kind === "source" ? peaks.data?.peaks : undefined}
                reader={reader}
                scope={identityScope}
                projectId={p.id}
                globalLocked={locked}
                waveBudget={Math.floor(MAX_WAVES / takeLaneCount)}
              />
            ))}
          <Playhead ms={ms} scale={scale} duration={duration} height={height} />
        </div>
      </div>
      <div id="dub-timeline-options" popover="auto" className="dub-timing-options"
        onFocusCapture={suspendFollow} onKeyDownCapture={suspendFollow}>
        <p className="dub-timeline-help">{t("keyboardHelp")}</p>
        {selectedCue && (
        <div className="dub-timeline-time-fields" key={selectedCue.id}>
          <b>{t("selectedCue")}</b>
          {(["startMs", "endMs"] as const).map((field) => (
            <label key={field}>
              {t(field)}
              <input
                type="number"
                aria-label={t(`edit_${field}`)}
                min={0}
                max={duration}
                step={50}
                value={selectedCue[field]}
                disabled={selectionLocked}
                onChange={(event) => {
                  const value = event.target.valueAsNumber;
                  if (
                    !Number.isFinite(value) ||
                    value < 0 ||
                    value > duration ||
                    (field === "startMs"
                      ? value > selectedCue.endMs - config.minimumCueMs
                      : value < selectedCue.startMs + config.minimumCueMs)
                  )
                    return;
                  actions.change({
                    ...selectedCue,
                    [field]: Math.round(value),
                  });
                }}
              />
            </label>
          ))}
          {selectedCue.takes[lang] && (
            <label>
              {t("offset")}
              <input
                type="number"
                aria-label={t("offset")}
                step={50}
                value={selectedCue.offsetMs || 0}
                disabled={selectionLocked}
                onChange={(event) => {
                  if (Number.isFinite(event.target.valueAsNumber))
                    actions.change(
                      adjustedClip(
                        {
                          cue: selectedCue,
                          take: selectedCue.takes[lang],
                          start:
                            selectedCue.startMs + (selectedCue.offsetMs || 0),
                          end: selectedCue.endMs,
                        },
                        "move",
                        event.target.valueAsNumber -
                          (selectedCue.offsetMs || 0),
                        duration,
                      ),
                    );
                }}
              />
            </label>
          )}
        </div>
      )}
      </div>
    </section>
  );
}
