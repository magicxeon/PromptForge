import config from "./dubbing-voice-config.json";

// Seed receives the same bounded mono PCM16 WAV for quote and synthesis.
// Keep the recording in memory only while the user is preparing this voice.
export async function prepareSeedReference(file: File): Promise<string> {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!config.acceptedReferenceExtensions.includes(ext) || !file.size || file.size > config.maximumReferenceBytes)
    throw new Error("referenceFile");
  const decoder = new OfflineAudioContext(1, 1, config.referenceSampleRate);
  const audio = await decoder.decodeAudioData(await file.arrayBuffer()).catch(() => {
    throw new Error("referenceFile");
  });
  if (audio.duration > config.maximumReferenceSeconds || audio.length === 0)
    throw new Error("referenceDuration");
  const bytes = new Uint8Array(44 + audio.length * 2);
  const header = new DataView(bytes.buffer);
  const tag = (offset: number, value: string) => bytes.set(new TextEncoder().encode(value), offset);
  tag(0, "RIFF");
  header.setUint32(4, bytes.length - 8, true);
  tag(8, "WAVEfmt ");
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true);
  header.setUint16(22, 1, true);
  header.setUint32(24, audio.sampleRate, true);
  header.setUint32(28, audio.sampleRate * 2, true);
  header.setUint16(32, 2, true);
  header.setUint16(34, 16, true);
  tag(36, "data");
  header.setUint32(40, bytes.length - 44, true);
  const channels = Array.from({ length: audio.numberOfChannels }, (_, index) => audio.getChannelData(index));
  for (let i = 0; i < audio.length; i++) {
    let total = 0;
    for (const channel of channels) total += channel[i];
    const sample = Math.max(-1, Math.min(1, total / channels.length));
    header.setInt16(44 + i * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  const chunks = [];
  for (let start = 0; start < bytes.length; start += 16384)
    chunks.push(String.fromCharCode(...bytes.subarray(start, start + 16384)));
  return btoa(chunks.join(""));
}
