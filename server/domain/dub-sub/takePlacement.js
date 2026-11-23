// Keep preview selection and the exporter on the same 25 ms end tolerance.
export const endToleranceMs = 25;
export function canExportTake(placement, durationMs, confirmedOverrunMs) {
  if (confirmedOverrunMs > 0) return placement.start >= 0 && placement.end <= placement.projectEnd &&
    confirmedOverrunMs === durationMs - placement.availableMs;
  return placement.fits;
}
export function takePlacement(cue, durationMs, projectDurationMs = cue.endMs) {
  const start = cue.startMs + (cue.offsetMs ?? 0);
  const availableMs = Math.max(0, Math.min(cue.endMs,projectDurationMs) - start);
  const end = start + durationMs;
  return {start,end,availableMs,projectEnd:projectDurationMs,
    fits:start >= 0 && end <= Math.min(cue.endMs,projectDurationMs) + endToleranceMs};
}
