// Keep preview selection and the exporter on the same 25 ms end tolerance.
import config from "../../config/dub-scene-transcription.json" with { type: "json" };
export const endToleranceMs = 25;

export function speechHorizonMs(project, cue, language) {
  let end = project.durationMs ?? cue.endMs;
  for (const next of project.cues) {
    if (next.id === cue.id || next.startMs < cue.startMs) continue;
    const offset = next.takes?.[language] ? Math.min(0, next.offsetMs ?? 0) : 0;
    end = Math.min(end, next.startMs + offset);
  }
  return Math.max(0, end - cue.startMs - Math.max(0, cue.offsetMs ?? 0));
}

export function bufferedTiming(windows, targetMs, horizonMs) {
  const end = windows?.at(-1)?.endMs;
  if (end == null || targetMs == null) return {targetDurationMs:targetMs};
  const speechTailMs = Math.min(config.timedDialogue.alignment.speechTailMs, Math.max(0,horizonMs-end));
  return {targetDurationMs:Math.max(targetMs,end+speechTailMs),speechTailMs};
}
export function canExportTake(placement) {
  return placement.start >= 0 && placement.end > placement.start && placement.end <= placement.projectEnd;
}
export function takePlacement(cue, durationMs, projectDurationMs = cue.endMs) {
  const start = cue.startMs + (cue.offsetMs ?? 0);
  const availableMs = Math.max(0, Math.min(cue.endMs,projectDurationMs) - start);
  const end = start + durationMs;
  return {start,end,availableMs,projectEnd:projectDurationMs,
    fits:start >= 0 && end <= Math.min(cue.endMs,projectDurationMs) + endToleranceMs};
}
