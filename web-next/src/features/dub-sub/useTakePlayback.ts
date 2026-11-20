import { useEffect, useRef } from "react";
import { speakerGain } from "./SpeakerMixer";
import type { Cue, Project } from "./projectApi";
type Take = Cue["takes"][string];
type Player = {
  audio: HTMLAudioElement;
  source?: MediaElementAudioSourceNode;
  gain?: GainNode;
};
function dispose(player: Player) {
  player.audio.pause();
  player.audio.removeAttribute("src");
  player.audio.load();
  player.source?.disconnect();
  player.gain?.disconnect();
}
export function useTakePlayback(
  cues: Cue[],
  language: string,
  timeMs: number,
  playing: boolean,
  volume: number,
  mixer: Project["mixer"],
  audition: (Take & { cueId: string }) | null,
) {
  const players = useRef(new Map<string, Player>()),
    context = useRef<AudioContext | null>(null);
  useEffect(() => {
    const entries = players.current;
    return () => {
      for (const player of entries.values()) dispose(player);
      entries.clear();
      if (context.current) void context.current.close().catch(() => {});
      context.current = null;
    };
  }, []);
  useEffect(() => {
    const needed = new Set<string>();
    for (const cue of cues) {
      const take = audition?.cueId === cue.id ? audition : cue.takes[language];
      if (!take) continue;
      const elapsed = timeMs - cue.startMs - (cue.offsetMs || 0);
      if (elapsed < 0 || elapsed >= take.durationMs || volume === 0) continue;
      const key = cue.id + "/" + take.id;
      needed.add(key);
      let player = players.current.get(key);
      if (!player) {
        const audio = new Audio(take.audioUrl);
        player = { audio };
        players.current.set(key, player);
      }
      if (playing && !player.gain && typeof AudioContext !== "undefined") {
        context.current ??= new AudioContext();
        const ctx = context.current;
        player.source = ctx.createMediaElementSource(player.audio);
        player.gain = ctx.createGain();
        player.source.connect(player.gain).connect(ctx.destination);
        if (ctx.state === "suspended") void ctx.resume().catch(() => {});
      }
      const gain =
        volume *
        (cue.gain ?? 1) *
        speakerGain(mixer[language] || {}, cue.speaker || "");
      if (player.gain) player.gain.gain.value = gain;
      else player.audio.volume = Math.min(1, gain);
      if (Math.abs(player.audio.currentTime - elapsed / 1000) > 0.12)
        player.audio.currentTime = elapsed / 1000;
      if (playing && player.audio.paused)
        void player.audio.play().catch(() => {});
      if (!playing) player.audio.pause();
    }
    for (const [id, player] of players.current)
      if (!needed.has(id)) {
        dispose(player);
        players.current.delete(id);
      }
  }, [cues, language, timeMs, playing, volume, mixer, audition]);
}
