import crypto from 'node:crypto';
import { promises as fs, createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';

const DEFAULT_MAX_BYTES = 500 * 1024 * 1024;

export class CinematicVideoAssetService {
  constructor({ assetRepository = assetRepo, outputsDirectory = OUTPUTS_DIR, fetchImpl = globalThis.fetch, maxBytes = DEFAULT_MAX_BYTES } = {}) {
    this.assetRepository = assetRepository;
    this.outputsDirectory = outputsDirectory;
    this.fetchImpl = fetchImpl;
    this.maxBytes = maxBytes;
  }

  async persistVideoOutput({ task, output }) {
    const existing = await this.assetRepository.findBySourceJobIdForOwner(task.id, task.ownerUserId, 'cinematic_video_output');
    if (existing) return toOutputAsset(existing);
    const extension = extensionForMime(output?.mimeType);
    const relativeKey = path.posix.join('cinematic-video', safeSegment(task.ownerUserId), `${safeSegment(task.id)}${extension}`);
    const destination = path.resolve(this.outputsDirectory, ...relativeKey.split('/'));
    assertWithin(destination, this.outputsDirectory);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.partial`;
    try {
      if (output?.filePath) await copyBoundedFile(output.filePath, temporary, this.maxBytes);
      else await downloadBounded(output?.temporaryProviderUrl, temporary, this.fetchImpl, this.maxBytes);
      const stat = await fs.stat(temporary);
      const contentHash = await hashFile(temporary);
      await fs.rename(temporary, destination);
      const publicUrl = `/outputs/${relativeKey}`;
      const asset = await this.assetRepository.create({
        assetType: 'cinematic_video_output',
        storageKey: relativeKey,
        publicUrl,
        mimeType: output.mimeType || 'video/mp4',
        sizeBytes: stat.size,
        width: output.width || null,
        height: output.height || null,
        sourceJobId: task.id,
        metadata: {
          immutable: true,
          contentHash,
          durationSeconds: output.durationSeconds || null,
          fps: output.fps || null,
          hasAudio: Boolean(output.hasAudio),
          providerTaskId: task.providerTaskId,
          providerOperationId: task.providerOperationId,
          projectId: task.projectId,
          sceneId: task.sceneId,
          shotId: task.shotId,
          attemptId: task.attemptId,
          characterAttributions: Array.isArray(task.submittedRequest?.characterAttributions)
            ? task.submittedRequest.characterAttributions
            : []
        }
      }, { userId: task.ownerUserId, username: task.ownerUsername, role: 'user' });
      return toOutputAsset(asset);
    } catch (error) {
      await fs.rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}

async function copyBoundedFile(sourcePath, destination, maxBytes) {
  const source = path.resolve(String(sourcePath || ''));
  const stat = await fs.stat(source);
  if (!stat.isFile() || stat.size <= 0 || stat.size > maxBytes) throw mediaError('video_media_size_invalid', 'Video file size is invalid.');
  await pipeline(createReadStream(source), createWriteStream(destination, { flags: 'wx' }));
}

async function downloadBounded(rawUrl, destination, fetchImpl, maxBytes) {
  let url;
  try { url = new URL(String(rawUrl || '')); } catch { throw mediaError('video_provider_url_invalid', 'Provider video URL is invalid.'); }
  if (url.protocol !== 'https:') throw mediaError('video_provider_url_invalid', 'Provider video URL must use HTTPS.');
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(120000), redirect: 'error' });
  if (!response.ok || !response.body) throw mediaError('video_provider_download_failed', 'Provider video could not be downloaded.');
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxBytes) throw mediaError('video_media_size_invalid', 'Provider video exceeds the storage limit.');
  let bytes = 0;
  const limiter = new Transform({ transform(chunk, _encoding, callback) {
    bytes += chunk.length;
    callback(bytes > maxBytes ? mediaError('video_media_size_invalid', 'Provider video exceeds the storage limit.') : null, chunk);
  } });
  await pipeline(Readable.fromWeb(response.body), limiter, createWriteStream(destination, { flags: 'wx' }));
  if (bytes <= 0) throw mediaError('video_provider_download_empty', 'Provider video is empty.');
}

async function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  await pipeline(createReadStream(filePath), new Transform({ transform(chunk, _encoding, callback) { hash.update(chunk); callback(); } }));
  return hash.digest('hex');
}

function toOutputAsset(asset) {
  return {
    assetId: asset.id,
    assetVersionId: asset.id,
    publicUrl: asset.publicUrl,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    contentHash: asset.metadata?.contentHash || null
  };
}

function extensionForMime(mimeType) {
  if (mimeType === 'video/webm') return '.webm';
  return '.mp4';
}

function safeSegment(value) {
  const safe = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!safe) throw mediaError('video_storage_key_invalid', 'Video storage identity is invalid.');
  return safe;
}

function assertWithin(target, root) {
  const relative = path.relative(path.resolve(root), target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw mediaError('video_storage_path_invalid', 'Video storage path is invalid.');
}

function mediaError(code, message) {
  return Object.assign(new Error(message), { code });
}

export const cinematicVideoAssetService = new CinematicVideoAssetService();
