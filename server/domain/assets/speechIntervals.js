import createVad from "@echogarden/fvad-wasm";

const rate = 16000;
const frameMs = 10;
const frameSamples = rate * frameMs / 1000;
let runtime;

// WebRTC's aggressive speech classifier can hang over a pause or admit clean tones.
// Reject near-silent and single-frequency frames before forming spoken runs.
function plausibleFrame(samples) {
  let energy = 0, midEnergy = 0, neighbourEnergy = 0, cross = 0;
  for (let i = 2; i < samples.length; i++) {
    const value = samples[i], mid = samples[i - 1], neighbours = value + samples[i - 2];
    energy += value * value;
    midEnergy += mid * mid;
    neighbourEnergy += neighbours * neighbours;
    cross += mid * neighbours;
  }
  if (energy < (samples.length - 2) * 52 ** 2 || midEnergy === 0) return false;
  // A sinusoid obeys x[n]+x[n-2] = 2*cos(w)*x[n-1]. Speech spans multiple frequencies.
  return (neighbourEnergy - cross * cross / midEnergy) / energy > 0.00018;
}

// A sustained repeating waveform (including a chord of harmonics) provides no reliable syllable timing.
function stationaryTone(pcm, startMs, endMs) {
  if (endMs - startMs < 180) return false;
  const first = startMs * 16 + 160;
  const last = Math.floor(endMs * 16) - 160;
  for (let lag = 18; lag <= 230; lag++) {
    let difference = 0, energy = 0;
    for (let i = first; i < first + 240; i += 3) {
      const sample = pcm.readInt16LE(i * 2);
      difference += (sample - pcm.readInt16LE((i + lag) * 2)) ** 2;
      energy += sample ** 2;
    }
    if (!energy || difference > energy * 0.003) continue;
    difference = 0;
    energy = 0;
    for (let i = first; i + lag < last; i += 11) {
      const sample = pcm.readInt16LE(i * 2);
      difference += (sample - pcm.readInt16LE((i + lag) * 2)) ** 2;
      energy += sample ** 2;
    }
    if (energy && difference < energy * 0.003) return true;
  }
  return false;
}

// Raw 16 kHz, mono, signed little-endian PCM. All returned times are relative to sample zero.
export async function detectSpeechIntervals(pcm) {
  if (!Buffer.isBuffer(pcm) || pcm.length < frameSamples * 2) return [];
  const wasm = await (runtime ??= createVad().catch(error => {
    runtime = undefined;
    throw error;
  }));
  const vad = wasm._fvad_new();
  const pointer = wasm._malloc(frameSamples * 2);
  const intervals = [];
  try {
    if (!vad || !pointer || wasm._fvad_set_mode(vad, 3) || wasm._fvad_set_sample_rate(vad, rate))
      throw new Error("Speech detector initialization failed");
    const frame = wasm.HEAP16.subarray(pointer / 2, pointer / 2 + frameSamples);
    let start = -1, last = -1, activeMs = 0;
    function finish() {
      if (activeMs >= 90) intervals.push({startMs:start, endMs:last + frameMs});
      start = -1; activeMs = 0;
    }
    for (let offset = 0; offset < pcm.length - 1; offset += frameSamples * 2) {
      const available = Math.min(frameSamples, Math.floor((pcm.length - offset) / 2));
      for (let i = 0; i < available; i++) frame[i] = pcm.readInt16LE(offset + 2 * i);
      if (available < frameSamples) frame.fill(0,available);
      const time = offset * 1000 / (rate * 2);
      if (wasm._fvad_process(vad, pointer, frameSamples) === 1 && plausibleFrame(frame)) {
        if (start < 0) start = time;
        last = time;
        activeMs += frameMs;
      } else if (start >= 0 && time - last >= 170) finish();
    }
    if (start >= 0) finish();
    const duration = Math.floor(pcm.length / (rate * 2) * 1000);
    if (intervals.length) intervals.at(-1).endMs = Math.min(intervals.at(-1).endMs,duration);
    return intervals.filter(span => !stationaryTone(pcm, span.startMs, span.endMs));
  } finally {
    if (pointer) wasm._free(pointer);
    if (vad) wasm._fvad_free(vad);
  }
}
