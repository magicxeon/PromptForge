import { detectSpeechIntervals } from "../assets/speechIntervals.js";
import { mediaCommand, videoInput } from "./DubMediaService.js";

const blockMs = 30000;
const contextMs = 250;
const ttlMs = 10 * 60 * 1000;
const maxBlocks = 128;
// Source media is immutable inside its actor/project/folder. Cache intervals only.
const cache = new Map();
const pending = new Map();

async function readBlock(source, index, durationMs) {
  const key = JSON.stringify([source,index]);
  const cached = cache.get(key);
  if (cached?.expires > Date.now()) return cached.spans;
  if (pending.has(key)) return pending.get(key);
  // Source rhythm is optional. Do not queue unbounded decoders during admission bursts.
  if (pending.size >= 4) return null;
  const task = (async () => {
    const start = index * blockMs, end = Math.min(start + blockMs,durationMs);
    const from = Math.max(0,start - contextMs), to = Math.min(durationMs,end + contextMs);
    const {stdout} = await mediaCommand([
      "-ss",String(from / 1000), ...videoInput(source), "-t",String((to - from) / 1000),
      "-map","0:a:0","-vn","-ac","1","-ar","16000","-c:a","pcm_s16le","-f","s16le","pipe:1",
    ], {encoding:"buffer", timeout:30000, maxBuffer: 1024 * 1024});
    let detected;
    try { detected = await detectSpeechIntervals(stdout); }
    catch { return null; }
    const spans = detected.map(span=>({
      startMs:Math.max(start,from+span.startMs), endMs:Math.min(end,from+span.endMs),
    })).filter(span=>span.endMs>span.startMs);
    for (const [id, entry] of cache) if (entry.expires <= Date.now()) cache.delete(id);
    while (cache.size >= maxBlocks) cache.delete(cache.keys().next().value);
    cache.set(key,{spans,expires:Date.now()+ttlMs});
    return spans;
  })();
  pending.set(key,task);
  try { return await task; } finally { pending.delete(key); }
}

// Slice an actor-owned, lazily decoded speech map at the current cue boundaries.
// Missing audio, non-speech and ambiguous runs leave the existing cue-duration flow in place.
export async function sourceRhythms(projects, actor, project, cues, verify) {
  const result = new Map();
  if (!project.media?.hasAudio || !cues.length || !(project.durationMs > 0)) return result;
  const source = await projects.repo.sceneSource(actor,project);
  const blocks = new Map();
  for (const cue of cues) {
    if (!Number.isSafeInteger(cue.startMs) || !Number.isSafeInteger(cue.endMs) ||
        cue.startMs < 0 || cue.endMs <= cue.startMs || cue.endMs > project.durationMs ||
        cue.endMs - cue.startMs > 60000) continue;
    const spans = [];
    let complete = true;
    for (let index=Math.floor(cue.startMs/blockMs); index<=Math.floor((cue.endMs-1)/blockMs); index++) {
      if (!blocks.has(index)) {
        if (blocks.size >= 120) { complete = false; break; }
        await verify?.();
        try { blocks.set(index, await readBlock(source,index,project.durationMs)); }
        catch (error) {
          if (!["dub_ffmpeg_unavailable","dub_media_processing_failed"].includes(error.code)) throw error;
          blocks.set(index,null);
        }
      }
      const block = blocks.get(index);
      if (!block) { complete = false; break; }
      for (const span of block) {
        const startMs = Math.max(cue.startMs,span.startMs) - cue.startMs;
        const endMs = Math.min(cue.endMs,span.endMs) - cue.startMs;
        if (endMs <= startMs) continue;
        const previous = spans.at(-1);
        if (previous && startMs - previous.endMs < 170) previous.endMs = endMs;
        else spans.push({startMs,endMs});
      }
    }
    // Tiny tails often belong to adjacent speakers. A very long unbroken detection
    // in a mixed film soundtrack isn't reliable evidence of one speaker's rhythm.
    if (!complete) continue;
    const usable = spans.filter(span=>span.endMs-span.startMs >= 90);
    if (usable.length && usable.length <= 8 && usable.every(span=>span.endMs-span.startMs <= 8000))
      result.set(cue.id,usable);
  }
  return result;
}
