import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';
import { AssetDeliveryService } from './AssetDeliveryService.js';
import { detectSpeechIntervals } from './speechIntervals.js';
import dubScenePolicy from '../../config/dub-scene-transcription.json' with {type:'json'};
const alignment = dubScenePolicy.timedDialogue.alignment;
export function inspectWav(bytes) {
  const invalid = () => { throw Object.assign(new Error('Invalid WAV output.'), { code: 'speech_invalid_wav' }); };
  if (!Buffer.isBuffer(bytes) || bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE'
    || bytes.readUInt32LE(4) + 8 !== bytes.length) invalid();
  let format, dataBytes = 0;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const length = bytes.readUInt32LE(offset + 4), end = offset + 8 + length;
    if (end > bytes.length) invalid();
    const kind = bytes.toString('ascii', offset, offset + 4);
    if (kind === 'fmt ') {
      if (length < 16) invalid();
      format = { encoding: bytes.readUInt16LE(offset + 8), channels: bytes.readUInt16LE(offset + 10), sampleRateHz: bytes.readUInt32LE(offset + 12),
        byteRate: bytes.readUInt32LE(offset + 16), blockAlign: bytes.readUInt16LE(offset + 20), bits: bytes.readUInt16LE(offset + 22) };
    }
    if (kind === 'data') dataBytes += length;
    offset = end + length % 2;
  }
  if (!format || format.encoding !== 1 || format.channels !== 1 || format.bits !== 16 || format.sampleRateHz !== 24000
    || format.blockAlign !== 2 || format.byteRate !== 48000 || !dataBytes || dataBytes % 2) invalid();
  return { durationMs: Math.round(dataBytes / format.byteRate * 1000), sampleRateHz: format.sampleRateHz, channels: format.channels };
}
function monoPcmWav(data, sampleRateHz) {
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(data.length + 36, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRateHz, 24); header.writeUInt32LE(sampleRateHz * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

// An aligned take must preserve RIFF metadata and PCM sample boundaries. With
// multiple data chunks the take can still be auditioned but is not rewritten.
function singleDataOffset(bytes) {
  let offset = null;
  for (let at = 12; at + 8 <= bytes.length;) {
    const length = bytes.readUInt32LE(at + 4);
    if (bytes.toString('ascii', at, at + 4) === 'data') {
      if (offset !== null) return null;
      offset = at;
    }
    at += 8 + length + length % 2;
  }
  return offset;
}

// Average each three 24 kHz samples into two 16 kHz VAD samples. The
// provider's original PCM stays untouched for playback.
function vadPcm(pcm) {
  const result = Buffer.alloc(Math.floor(pcm.length/6)*4);
  for (let i=0,j=0; j<result.length; i+=6,j+=4) {
    const a=pcm.readInt16LE(i), b=pcm.readInt16LE(i+2), c=pcm.readInt16LE(i+4);
    result.writeInt16LE(Math.round((2*a+b)/3),j);
    result.writeInt16LE(Math.round((b+2*c)/3),j+2);
  }
  return result;
}

export function significantPauses(spans) {
  return spans.slice(1).flatMap((s,i)=>s.startMs-spans[i].endMs >= alignment.significantPauseMs
    ? [{startMs:spans[i].endMs,endMs:s.startMs}] : []);
}

export async function alignCueSpeech(bytes, windows, maxBytes, detect=detectSpeechIntervals) {
  inspectWav(bytes);
  const offset = singleDataOffset(bytes);
  const pcmStart = offset === null ? 0 : offset + 8;
  const pcmLength = offset === null ? 0 : bytes.readUInt32LE(offset + 4);
  const pcm = bytes.subarray(pcmStart,pcmStart+pcmLength);
  let spans = [];
  if (pcm.length) {
    try { spans = await detect(vadPcm(pcm)); }
    catch { /* An unavailable classifier leaves the generated take for manual review. */ }
  }
  if (!spans.length) return {bytes,review:{status:'review',reasons:['unmeasurable'],actualStartMs:null,actualEndMs:null,shiftMs:0}};
  const desiredShift = windows[0].startMs - spans[0].startMs;
  // Never cut a breath or a quiet consonant. Remove only whole leading PCM
  // frames equal to zero, or add silence to delay an early onset once.
  let shiftMs = 0;
  if (desiredShift < -10) {
    let leading = 0;
    while (leading < Math.min(pcm.length,-desiredShift*48) && pcm.readInt16LE(leading) === 0) leading += 2;
    shiftMs = -Math.floor(leading/48);
  } else if (desiredShift > 10 && desiredShift <= (maxBytes-bytes.length)/48) shiftMs = desiredShift;
  if (shiftMs !== 0) {
    const delta = shiftMs*48;
    bytes = Buffer.concat([bytes.subarray(0,pcmStart),Buffer.alloc(Math.max(delta,0)),
      bytes.subarray(pcmStart+Math.max(-delta,0))]);
    bytes.writeUInt32LE(pcmLength+delta,offset+4);
    bytes.writeUInt32LE(bytes.length-8,4);
    for (const s of spans) { s.startMs += shiftMs; s.endMs += shiftMs; }
  }
  const actualStartMs = Math.round(spans[0].startMs), actualEndMs = Math.round(spans.at(-1).endMs);
  const reasons = [];
  if (Math.abs(actualStartMs-windows[0].startMs)>alignment.onsetToleranceMs) reasons.push('onset');
  if (Math.abs(actualEndMs-windows.at(-1).endMs)>alignment.endingToleranceMs) reasons.push('ending');
  const expected = significantPauses(windows), actual = significantPauses(spans);
  // Pauses are ordered. Check both added and missing pauses as well as shifted boundaries.
  const pausesMatch = expected.length === actual.length && expected.every((gap,index)=>{
    const p = actual[index];
    return Math.abs(p.startMs-gap.startMs)<=alignment.pauseToleranceMs &&
      Math.abs(p.endMs-gap.endMs)<=alignment.pauseToleranceMs &&
      Math.min(p.endMs,gap.endMs)-Math.max(p.startMs,gap.startMs)>=(gap.endMs-gap.startMs)*.5;
  });
  if (!pausesMatch) reasons.push('pause');
  return {bytes,review:{status:reasons.length?'review':'matched',reasons,actualStartMs,actualEndMs,shiftMs}};
}

// Only remove digital silence beyond a cue boundary. Keep quiet consonants,
// breaths, provider metadata and the original take whenever the tail has sound.
export function trimSilentCueTail(bytes, targetMs) {
  const { durationMs, sampleRateHz } = inspectWav(bytes);
  if (durationMs <= targetMs) return bytes;
  const dataOffset = singleDataOffset(bytes);
  if (dataOffset === null) return bytes;
  const length = bytes.readUInt32LE(dataOffset + 4);
  const keep = Math.floor(targetMs * sampleRateHz / 1000) * 2;
  const cut = dataOffset + 8 + keep;
  const end = dataOffset + 8 + length;
  if (bytes.subarray(cut, end).some(value => value !== 0)) return bytes;
  const trimmed = Buffer.concat([bytes.subarray(0, cut), bytes.subarray(end)]);
  trimmed.writeUInt32LE(keep, dataOffset + 4);
  trimmed.writeUInt32LE(trimmed.length - 8, 4);
  return trimmed;
}

export async function normalizeSeedWav(bytes, maxBytes) {
  const invalid = () => Object.assign(new Error('Unusable Seed WAV.'), { code: 'speech_invalid_wav' });
  if (!Buffer.isBuffer(bytes) || bytes.length < 44 || bytes.length > maxBytes ||
      bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw invalid();
  try { inspectWav(bytes); return bytes; } catch { /* Decode other WAV encodings at the provider-output boundary. */ }
  const length = bytes.readUInt32LE(4);
  if (length !== 0xffffffff && length + 8 > bytes.length) throw invalid();
  const pcm = await new Promise((resolve, reject) => {
    const child = execFile(process.env.FFMPEG_PATH || 'ffmpeg', [
      '-nostdin', '-v', 'error', '-xerror', '-protocol_whitelist', 'pipe', '-f', 'wav', '-i', 'pipe:0',
      '-map', '0:a:0', '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', '-f', 's16le', 'pipe:1',
    ], { windowsHide: true, encoding: 'buffer', maxBuffer: maxBytes - 44, timeout: 15000 },
    (error, stdout) => error ? reject(invalid()) : resolve(stdout));
    child.stdin.on('error', () => {}); // A rejected stream can close stdin before execFile reports the exit.
    child.stdin.end(bytes);
  });
  if (!pcm.length || pcm.length % 2) throw invalid();
  return monoPcmWav(pcm, 24000);
}

export class AudioAssetService {
  constructor({ repository = assetRepo, outputsDirectory = OUTPUTS_DIR } = {}) { this.repository = repository; this.outputsDirectory = outputsDirectory; }
  async assertCapacity(maxAudioBytes) {
    await fs.mkdir(this.outputsDirectory, { recursive: true });
    const disk = await fs.statfs(this.outputsDirectory);
    if (disk.bavail * disk.bsize < maxAudioBytes * 2) throw Object.assign(new Error('Audio storage unavailable.'), { code: 'speech_storage_full', statusCode: 503 });
  }
  async findReferenceId(actor, operationId) {
    const asset = await this.repository.findBySourceJobIdForOwner(operationId + '-reference', actor.userId, 'generated_audio');
    return asset?.id || null;
  }
  async measureDubAudio(actor, assetId, maxBytes) {
    const asset = await this.repository.findByIdForOwner(assetId, actor.userId);
    if (!asset || asset.assetType !== 'generated_audio' || asset.status === 'deleted') return [];
    const delivery = new AssetDeliveryService({ outputsDirectory: this.outputsDirectory, assetRepository: this.repository });
    const { handle, stat } = await delivery.openOwnedOutput({actor, outputUrl:asset.publicUrl, reauthorize:async()=>actor});
    try {
      if (stat.size > maxBytes) return [];
      const bytes = await handle.readFile();
      inspectWav(bytes);
      const offset = singleDataOffset(bytes);
      if (offset === null) return [];
      const pcm = bytes.subarray(offset + 8, offset + 8 + bytes.readUInt32LE(offset + 4));
      try { return await detectSpeechIntervals(vadPcm(pcm)); }
      catch { return []; }
    } finally { await handle.close(); }
  }
  async referenceClip(actor, assetId, seconds, maxBytes) {
    const asset = await this.repository.findByIdForOwner(assetId, actor.userId);
    if (!asset || asset.assetType !== 'generated_audio' || asset.status === 'deleted')
      throw Object.assign(new Error('Reference unavailable.'), { code: 'speech_invalid_reference', statusCode: 404 });
    const delivery = new AssetDeliveryService({ outputsDirectory: this.outputsDirectory, assetRepository: this.repository });
    const { handle, stat } = await delivery.openOwnedOutput({ actor, outputUrl: asset.publicUrl, reauthorize: async () => actor });
    try {
      if (stat.size > maxBytes) throw Object.assign(new Error('Invalid reference size.'), { code: 'speech_invalid_reference' });
      // Rebuild a standard PCM WAV containing only the allowed audio window, without provider metadata.
      const bytes = await handle.readFile();
      const info = inspectWav(bytes);
      let data;
      for (let at = 12; at + 8 <= bytes.length;) {
        const length = bytes.readUInt32LE(at + 4);
        if (bytes.toString('ascii', at, at + 4) === 'data' && length > 0) {
          data = bytes.subarray(at + 8, at + 8 + Math.min(length, seconds * info.sampleRateHz * 2));
          break;
        }
        at += 8 + length + length % 2;
      }
      return monoPcmWav(data, info.sampleRateHz);
    } finally { await handle.close(); }
  }
  async register({ bytes, actorContext, jobId }) {
    const info = inspectWav(bytes);
    const existing = await this.repository.findBySourceJobIdForOwner(jobId, actorContext.userId, 'generated_audio');
    if (existing) return { ...info, outputAssetId: existing.id, outputUrl: existing.publicUrl };
    const key = `voice-studio/${randomUUID()}.wav`, filename = path.join(this.outputsDirectory, key), temporary = `${filename}.partial`;
    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(temporary, bytes, { flag: 'wx' });
    await fs.rename(temporary, filename);
    try {
      const asset = await this.repository.create({ assetType: 'generated_audio', mimeType: 'audio/wav', storageKey: key,
        publicUrl: `/outputs/${key}`, sizeBytes: bytes.length, sourceJobId: jobId, deduplicateSource: true,
        metadata: { ...info, immutable: true, checksum: createHash('sha256').update(bytes).digest('hex') } }, actorContext);
      // Concurrent recovery can finalize the same source first. Keep only the winner's bytes.
      if (asset.storageKey !== key) await fs.unlink(filename);
      return { ...info, outputAssetId: asset.id, outputUrl: asset.publicUrl };
    } catch (error) { await fs.unlink(filename).catch(() => {}); throw error; }
  }
  async remove({ actorContext, assetId }) {
    const asset = await this.repository.findByIdForOwner(assetId, actorContext.userId);
    if (!asset || asset.assetType !== 'generated_audio') throw Object.assign(new Error('Audio unavailable.'), { code: 'audio_not_found', statusCode: 404 });
    // Invalidate delivery first; deletion retries may finish a previously interrupted unlink.
    if (asset.status !== 'deleted') await this.repository.update(asset.id, draft => { draft.status = 'deleted'; draft.deletedAt = new Date().toISOString(); });
    if (!/^voice-studio\/[a-f0-9-]+\.wav$/.test(asset.storageKey)) throw new Error('Invalid audio storage key.');
    await fs.unlink(path.join(this.outputsDirectory, asset.storageKey)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}
export const audioAssetService = new AudioAssetService();
