import type { Cue } from "./projectApi";

// Apply labels only when one detected speaker covers most of the existing cue.
// A clip crossing a speaker change stays available for manual assignment.
export function detectCueSpeakers(cues: Cue[], detected: Cue[]): Cue[] {
  const matches = cues.map(cue => {
    const coverage = new Map<string, number>();
    for (const segment of detected) {
      if (segment.startMs >= cue.endMs) break;
      const overlap = Math.min(cue.endMs, segment.endMs) - Math.max(cue.startMs, segment.startMs);
      if (segment.speaker && overlap > 0) coverage.set(segment.speaker, (coverage.get(segment.speaker) || 0) + overlap);
    }
    if (coverage.size !== 1) return;
    const [speaker, duration] = [...coverage][0];
    if (duration * 2 >= cue.endMs - cue.startMs) return speaker;
  });
  const known = new Map<string, Set<string>>();
  cues.forEach((cue, index) => {
    const label = matches[index];
    if (label && cue.speaker) {
      const names = known.get(label) ?? new Set<string>();
      names.add(cue.speaker); known.set(label, names);
    }
  });
  return cues.map((cue, index) => {
    const label = matches[index];
    if (cue.speaker || !label) return cue;
    const names = known.get(label);
    if (names && names.size > 1) return cue;
    return { ...cue, speaker: names ? [...names][0] : label,
      speakerVoiceType: detected.find(segment => segment.speaker === label && segment.speakerVoiceType)?.speakerVoiceType };
  });
}
