import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/Button";
import { voiceApi } from "../api/voiceStudioApi";
export type VoiceAudioPreview = {
  id: string;
  audioUrl: string;
  displayTitle: string;
};

type Playback = {
  play: (takes: VoiceAudioPreview[]) => Promise<void>;
  stop: () => void;
  download: (take: VoiceAudioPreview) => Promise<void>;
  playingId: string | null;
  title: string | null;
  pending: boolean;
  error: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  togglePlayback: () => void;
  seek: (seconds: number) => void;
};
const Context = createContext<Playback | null>(null);
export function useVoicePlayback() {
  return useContext(Context)!;
}
export function VoicePlayback({ children }: { children: ReactNode }) {
  const { t } = useTranslation("voice-studio");
  const audio = useRef<HTMLAudioElement>(null);
  const url = useRef("");
  const epoch = useRef(0);
  const [playing, setPlaying] = useState<VoiceAudioPreview | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const queue = useRef<VoiceAudioPreview[]>([]);
  function stop() {
    epoch.current++;
    audio.current?.pause();
    audio.current?.removeAttribute("src");
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = "";
    queue.current = [];
    setPlaying(null);
    setPending(false);
    setError("");
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }
  useEffect(
    () => () => {
      epoch.current++;
      audio.current?.pause();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );
  async function load(take: VoiceAudioPreview) {
    const current = ++epoch.current;
    setPending(true);
    setError("");
    try {
      const blob = await voiceApi.audio(take.audioUrl);
      if (epoch.current !== current) return;
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = URL.createObjectURL(blob);
      setPlaying(take);
      if (audio.current) {
        audio.current.src = url.current;
        await audio.current.play();
      }
    } catch {
      if (epoch.current === current) setError(t("playbackFailed"));
    } finally {
      if (epoch.current === current) setPending(false);
    }
  }
  async function play(takes: VoiceAudioPreview[]) {
    stop();
    queue.current = takes.slice(1);
    if (takes[0]) await load(takes[0]);
  }
  async function download(take: VoiceAudioPreview) {
    try {
      const blob = await voiceApi.audio(take.audioUrl);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${take.displayTitle.replace(/[<>:"/\\|?*]/g, "_") || take.id}.wav`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setError(t("downloadFailed"));
    }
  }
  function togglePlayback() {
    const player = audio.current;
    if (!player) return;
    if (player.paused)
      void player.play().catch(() => setError(t("playbackFailed")));
    else player.pause();
  }
  function seek(seconds: number) {
    if (audio.current && Number.isFinite(seconds))
      audio.current.currentTime = Math.max(0, Math.min(duration, seconds));
  }
  return (
    <Context.Provider
      value={{
        play,
        stop,
        download,
        playingId: playing?.id || null,
        title: playing?.displayTitle || null,
        pending,
        error,
        isPlaying,
        currentTime,
        duration,
        togglePlayback,
        seek,
      }}
    >
      {children}
      <div
        className="voice-playback"
        hidden={!playing && !pending && !error}
        aria-live="polite"
      >
        {playing || pending ? (
          <span>{playing?.displayTitle || t("loading")}</span>
        ) : null}
        <audio
          ref={audio}
          controls
          hidden={!playing && !pending}
          preload="none"
          aria-label={t("audioPlayer")}
          onTimeUpdate={(event) =>
            setCurrentTime(event.currentTarget.currentTime)
          }
          onLoadedMetadata={(event) =>
            setDuration(
              Number.isFinite(event.currentTarget.duration)
                ? event.currentTarget.duration
                : 0,
            )
          }
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            const next = queue.current.shift();
            if (next) void load(next);
          }}
        />
        {playing || pending ? (
          <Button onClick={stop}>{t("stop")}</Button>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </Context.Provider>
  );
}

/** Modal-accessible transport for the same single audio element; it never loads another source. */
export function VoicePlaybackControls() {
  const { t } = useTranslation("voice-studio");
  const player = useVoicePlayback();
  if (!player.title && !player.pending && !player.error) return null;
  const time = (seconds: number) =>
    `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0")}`;
  return (
    <section className="voice-modal-playback" aria-label={t("audioPlayer")}>
      {player.title ? <strong>{player.title}</strong> : null}
      {player.pending ? <p role="status">{t("loading")}</p> : null}
      {player.title ? (
        <>
          <div className="voice-actions">
            <Button type="button" onClick={player.togglePlayback}>
              {player.isPlaying ? t("pauseAudio") : t("resumeAudio")}
            </Button>
            <Button type="button" onClick={player.stop}>
              {t("stop")}
            </Button>
            <span>
              {time(player.currentTime)} / {time(player.duration)}
            </span>
          </div>
          <label>
            {t("seekAudio")}
            <input
              aria-label={t("seekAudio")}
              type="range"
              min={0}
              max={player.duration || 0}
              step={0.1}
              value={Math.min(player.currentTime, player.duration || 0)}
              disabled={!player.duration}
              onChange={(event) => player.seek(Number(event.target.value))}
            />
          </label>
        </>
      ) : null}
      {player.error ? <p role="alert">{player.error}</p> : null}
    </section>
  );
}
