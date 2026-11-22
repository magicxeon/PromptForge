// Keep preview selection and the exporter on the same 25 ms end tolerance.
export const endToleranceMs = 25;
export function canExportTake(placement, durationMs, confirmedOverrunMs) {
  return placement.fits || (placement.start >= 0 && confirmedOverrunMs > 0 &&
    confirmedOverrunMs === durationMs - placement.availableMs);
}
export function takePlacement(cue, durationMs, projectDurationMs = cue.endMs) {
  const start = cue.startMs + (cue.offsetMs ?? 0);
  const availableMs = Math.max(0, Math.min(cue.endMs,projectDurationMs) - start);
  const end = start + durationMs;
  return {start,end,availableMs,fits:start >= 0 && end <= Math.min(cue.endMs,projectDurationMs) + endToleranceMs};
}
