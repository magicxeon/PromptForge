import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';
import { AssetDeliveryService } from './AssetDeliveryService.js';
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
