import { significantPauses } from "../assets/AudioAssetService.js";
import { validSpeechWindows } from "../generation/speechWindows.js";
import config from "../../config/dub-scene-transcription.json" with {type:"json"};
import { endToleranceMs, speechHorizonMs, takePlacement } from "./takePlacement.js";

const policy = config.timedDialogue.alignment;

// Intersect the acceptable offset range for each measured boundary. If the
// ranges do not intersect, moving the entire waveform cannot fix the cadence.
export async function fitTakeOffset(project, cue, language, take, voice, actor, acceptRhythmMismatch = false, skipInternalPauses = false, batchTiming = false) {
  const current = cue.offsetMs ?? 0;
  const projectEnd = project.durationMs ?? cue.endMs;
  const placement = takePlacement(cue,take.durationMs,projectEnd);
  const reject = errorCode => ({offsetMs:current,errorCode,targetMs:placement.availableMs});
  let lower = -cue.startMs;
  const tail = Math.min(policy.speechTailMs,take.inputSnapshot?.speechTailMs ?? 0);
  const lastSpike = take.inputSnapshot?.speechWindows?.at(-1)?.endMs;
  const latestEnd = tail && Number.isFinite(lastSpike)
    ? Math.min(projectEnd,cue.startMs+speechHorizonMs(project,cue,language),Math.max(cue.endMs,cue.startMs+lastSpike+tail))
    : batchTiming
    ? Math.min(cue.endMs + policy.batchTailAllowanceMs,projectEnd)
    : Math.min(cue.endMs,projectEnd) + endToleranceMs;
  let upper = latestEnd - cue.startMs - take.durationMs;
  const limit = (lo,hi) => {
    lower = Math.max(lower,Math.ceil(lo));
    upper = Math.min(upper,Math.floor(hi));
    return lower <= upper;
  };
  if (lower > upper) return reject("dub_take_exceeds_window");
  for (const neighbor of project.cues) {
    if (neighbor.id === cue.id) continue;
    const audio = neighbor.takes?.[language];
    const placed = Number.isFinite(audio?.durationMs) && audio.durationMs > 0;
    const start = neighbor.startMs + (placed ? neighbor.offsetMs ?? 0 : 0);
    const end = placed ? start + audio.durationMs : neighbor.endMs;
    // An uncast neighboring cue reserves its slot until its audio is known.
    if (neighbor.startMs < cue.startMs) {
      if (!limit(end - cue.startMs, Infinity)) return reject("dub_take_overlap");
    } else if (!limit(-Infinity,start - cue.startMs - take.durationMs)) return reject("dub_take_overlap");
  }
  const expected = take.inputSnapshot?.speechWindows;
  if (take.inputSnapshot?.boundaryTimingOnly && !expected) {
    // Other languages share this offset. Preserve their position if already placed.
    const shared = Object.entries(cue.takes ?? {}).some(([lang,audio])=>lang!==language && audio?.id);
    const offsetMs = shared ? current : 0;
    const slot = takePlacement({...cue,offsetMs},take.durationMs,projectEnd);
    if (offsetMs<0 || (batchTiming ? slot.end > latestEnd : !slot.fits)) return reject("dub_take_exceeds_window");
    if (offsetMs<lower || offsetMs>upper) return reject("dub_take_overlap");
    return {offsetMs,errorCode:null,targetMs:slot.availableMs};
  }
  // A director can accept the performance at its existing position. Capture
  // physical limits before narrowing the interval to match speech boundaries.
  const fitsCurrent = batchTiming ? placement.start >= 0 && placement.end <= latestEnd : placement.fits;
  const canKeepPosition = acceptRhythmMismatch && fitsCurrent && current >= lower && current <= upper;
  const rhythmMismatch = reason => reject(canKeepPosition ? null : "dub_take_rhythm_" + reason);
  if (!expected) {
    if (skipInternalPauses) return reject("dub_take_rhythm_unmeasurable");
    if (!fitsCurrent) return reject("dub_take_exceeds_window");
    if (current < lower || current > upper) return reject("dub_take_overlap");
    const reasons = (take.rhythmReview?.reasons ?? []).filter(reason => !batchTiming || reason !== "pause");
    const reason = reasons[0];
    if (reason && reasons.every(r => ["onset","ending","pause"].includes(r)))
      return rhythmMismatch(reason);
    return reject(reason ? "dub_take_rhythm_" + reason : null);
  }
  if (!validSpeechWindows(expected, cue.endMs-cue.startMs)) return reject("dub_take_rhythm_unmeasurable");
  let actual;
  try { actual = await voice.measureDubTake(actor,take.id); }
  catch (error) {
    if (["speech_invalid_wav","output_unavailable","voice_record_not_found"].includes(error.code))
      return reject("dub_take_rhythm_unmeasurable");
    throw error;
  }
  if (!actual.length) return reject("dub_take_rhythm_unmeasurable");
  const matchBoundary = (wanted, measured, tolerance) => limit(wanted-measured-tolerance,wanted-measured+tolerance);
  if (!matchBoundary(expected[0].startMs,actual[0].startMs,policy.onsetToleranceMs))
    return rhythmMismatch("onset");
  const endDelta = expected.at(-1).endMs-actual.at(-1).endMs;
  if (!limit(endDelta-policy.endingToleranceMs,endDelta+tail+policy.endingToleranceMs))
    return rhythmMismatch("ending");
  const checkPauses = !batchTiming && !skipInternalPauses;
  const wantedPauses = checkPauses ? significantPauses(expected) : [];
  const measuredPauses = checkPauses ? significantPauses(actual) : [];
  if (wantedPauses.length !== measuredPauses.length) return rhythmMismatch("pause");
  for (const [i, wanted] of wantedPauses.entries()) {
    const measured = measuredPauses[i];
    const minimumOverlap = (wanted.endMs-wanted.startMs)/2;
    if (measured.endMs-measured.startMs < minimumOverlap ||
        !matchBoundary(wanted.startMs, measured.startMs, policy.pauseToleranceMs) ||
        !matchBoundary(wanted.endMs, measured.endMs, policy.pauseToleranceMs) ||
        !limit(wanted.startMs+minimumOverlap-measured.endMs, wanted.endMs-minimumOverlap-measured.startMs))
      return rhythmMismatch("pause");
  }
  if (current >= lower && current <= upper) return reject(null);
  if (Object.entries(cue.takes ?? {}).some(([lang,audio])=>lang!==language && audio?.id))
    return reject(canKeepPosition ? null : "dub_take_shared_offset");
  const offsetMs = Math.round((lower+upper)/2);
  return {offsetMs,errorCode:null,targetMs:takePlacement({...cue,offsetMs},take.durationMs,projectEnd).availableMs};
}
