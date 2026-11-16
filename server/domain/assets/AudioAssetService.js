import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';
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
export class AudioAssetService {
  constructor({ repository = assetRepo, outputsDirectory = OUTPUTS_DIR } = {}) { this.repository = repository; this.outputsDirectory = outputsDirectory; }
  async assertCapacity(maxAudioBytes) {
    await fs.mkdir(this.outputsDirectory, { recursive: true });
    const disk = await fs.statfs(this.outputsDirectory);
    if (disk.bavail * disk.bsize < maxAudioBytes * 2) throw Object.assign(new Error('Audio storage unavailable.'), { code: 'speech_storage_full', statusCode: 503 });
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
