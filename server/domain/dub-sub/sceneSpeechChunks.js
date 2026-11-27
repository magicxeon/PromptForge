import { detectSpeechIntervals } from "../assets/speechIntervals.js";

const bytesPerMs = 32; // 16 kHz mono PCM16

// Raise quiet passages for the detector alone. The provider receives the original samples.
export async function sceneSpeechIntervals(pcm) {
  const detection = Buffer.from(pcm);
  const blockBytes = 500 * bytesPerMs;
  for (let from = 0; from < detection.length; from += blockBytes) {
    const end = Math.min(from + blockBytes, detection.length);
    let peak = 0;
    for (let i = from; i < end; i += 2) peak = Math.max(peak, Math.abs(pcm.readInt16LE(i)));
    const gain = Math.min(24, 8000 / (peak || 1));
    if (gain <= 1) continue;
    for (let i = from; i < end; i += 2) detection.writeInt16LE(Math.round(pcm.readInt16LE(i) * gain), i);
  }
  return detectSpeechIntervals(detection);
}

export function planSceneChunks(spans, durationMs, policy) {
  const chunks = [];
  const maxCoreMs = policy.maxMs - 2 * policy.paddingMs;
  let current;
  function finish() {
    if (current) chunks.push({
      startMs: Math.max(0, current.startMs - policy.paddingMs),
      endMs: Math.min(durationMs, current.endMs + policy.paddingMs),
    });
    current = undefined;
  }
  for (const span of spans) {
    if (current && (span.startMs - current.endMs >= policy.skipPauseMs ||
        current.endMs - current.startMs >= policy.targetMs ||
        span.endMs - current.startMs > maxCoreMs)) finish();
    current ??= {startMs: span.startMs};
    current.endMs = span.endMs;
    // An uninterrupted monologue has no natural break. Keep context on both sides.
    while (current.endMs - current.startMs > maxCoreMs) {
      current.endMs = current.startMs + maxCoreMs;
      const boundary = current.endMs;
      finish();
      current = {startMs: boundary, endMs: span.endMs};
    }
  }
  finish();
  return chunks;
}

export function chunkWav(pcm, startMs, endMs) {
  const samples = pcm.subarray(startMs * bytesPerMs, endMs * bytesPerMs);
  const wav = Buffer.alloc(44 + samples.length);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples.length, 40);
  samples.copy(wav, 44);
  return wav;
}

const wordSegments = new Intl.Segmenter(undefined, {granularity:"word"});
function boundaryText(text) {
  const normalized = text.normalize("NFKC").toLowerCase().replace(/['’]/gu, "");
  return [...wordSegments.segment(normalized)].filter(word => word.isWordLike).map(word => word.segment).join(" ");
}

function boundaryMatch(left, right, overlapStart, overlapEnd) {
  if (left.speaker && right.speaker && left.speaker !== right.speaker) return null;
  const sharedMs = Math.min(left.endMs,right.endMs,overlapEnd) - Math.max(left.startMs,right.startMs,overlapStart);
  const shorterMs = Math.min(left.endMs-left.startMs, right.endMs-right.startMs);
  if (sharedMs <= 0 || sharedMs < 0.75 * shorterMs) return null;
  const first = boundaryText(left.text), second = boundaryText(right.text);
  if (!first || !second) return null;
  const startError = Math.abs(left.startMs-right.startMs);
  const endError = Math.abs(left.endMs-right.endMs);
  if (first === second && startError <= 250 && endError <= 250)
    return {error:startError+endError, keep:right.speaker && !left.speaker ? right : left};
  // A first-window prefix must stop at its cut. A second-window suffix must
  // start at its cut. The opposite endpoint anchors the surviving full phrase.
  if (first.length >= 3 && second.startsWith(first+" ") && startError <= 200 && overlapEnd-left.endMs <= 250)
    return {error:startError, keep:right};
  if (second.length >= 3 && first.endsWith(" "+second) && endError <= 200 && right.startMs-overlapStart <= 250)
    return {error:endError, keep:left};
  return null;
}

export function mergeSceneParts(parts) {
  const rows = [];
  let priorRows = [];
  for (const [index, part] of parts.entries()) {
    const previous = parts[index - 1];
    const candidates = priorRows.filter(i => rows[i].endMs > part.startMs);
    priorRows = [];
    for (const row of part.cues) {
      let best;
      if (previous && row.startMs < previous.endMs) {
        for (const [position, i] of candidates.entries()) {
          const match = boundaryMatch(rows[i],row,part.startMs,previous.endMs);
          if (match && (!best || match.error < best.error)) best = {...match, position, i};
        }
      }
      if (best) {
        rows[best.i] = best.keep;
        candidates.splice(best.position,1);
        priorRows.push(best.i);
      } else {
        priorRows.push(rows.length);
        rows.push(row);
      }
    }
  }
  return rows.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
}
