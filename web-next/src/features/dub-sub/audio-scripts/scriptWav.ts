// Join the canonical mono PCM16 takes without resampling. Slice the Blob so
// assembling a long script never requires decoding all its samples into memory.
export async function assembleScriptWav(lines: {read: () => Promise<Blob>; pauseAfterMs: number}[]) {
  const parts: BlobPart[] = [];
  let sampleRate = 0, length = 0;
  for (const line of lines) {
    const blob = await line.read();
    const header = new DataView(await blob.slice(0,12).arrayBuffer());
    if (header.byteLength < 12 || header.getUint32(0) !== 0x52494646 || header.getUint32(8) !== 0x57415645) throw Error("audio_invalid");
    let rate = 0, samples = 0;
    for (let pos = 12; pos + 8 <= blob.size;) {
      const chunk = new DataView(await blob.slice(pos,pos + 24).arrayBuffer());
      const type = chunk.getUint32(0), size = chunk.getUint32(4,true), end = pos + 8 + size;
      if (end > blob.size) throw Error("audio_invalid");
      if (type === 0x666d7420) {
        if (size < 16 || chunk.getUint16(8,true) !== 1 || chunk.getUint16(10,true) !== 1 || chunk.getUint16(22,true) !== 16) throw Error("audio_invalid");
        rate = chunk.getUint32(12,true);
      }
      if (type === 0x64617461) {
        if (size % 2) throw Error("audio_invalid");
        parts.push(blob.slice(pos + 8,end));
        samples += size;
      }
      pos = end + size % 2;
    }
    if (!samples || !rate || (sampleRate && sampleRate !== rate)) throw Error("audio_invalid");
    sampleRate = rate;
    const silence = 2 * Math.round(line.pauseAfterMs * rate / 1000);
    if (!Number.isSafeInteger(silence) || silence < 0) throw Error("audio_invalid");
    length += samples + silence;
    if (length + 36 > 0xffffffff) throw Error("audio_too_large");
    if (silence) parts.push(new Uint8Array(silence));
  }
  if (!length) throw Error("audio_empty");
  const header = new DataView(new ArrayBuffer(44));
  header.setUint32(0,0x52494646);
  header.setUint32(4,36 + length,true);
  header.setUint32(8,0x57415645);
  header.setUint32(12,0x666d7420);
  header.setUint32(16,16,true);
  header.setUint16(20,1,true);
  header.setUint16(22,1,true);
  header.setUint32(24,sampleRate,true);
  header.setUint32(28,sampleRate * 2,true);
  header.setUint16(32,2,true);
  header.setUint16(34,16,true);
  header.setUint32(36,0x64617461);
  header.setUint32(40,length,true);
  return new Blob([header.buffer,...parts],{type:"audio/wav"});
}
