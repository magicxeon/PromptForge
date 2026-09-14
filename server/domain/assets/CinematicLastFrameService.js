import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promises as fs, createReadStream } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';
import { createStoryboardSourceFingerprint } from './CinematicStoryboardAssetService.js';

const execFileAsync = promisify(execFile);

export class CinematicLastFrameService {
  constructor({ assetRepository = assetRepo, outputsDirectory = OUTPUTS_DIR,
    ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg', runProcess = execFileAsync } = {}) {
    this.assetRepository = assetRepository;
    this.outputsDirectory = outputsDirectory;
    this.ffmpegPath = ffmpegPath;
    this.runProcess = runProcess;
  }

  async prepare({ videoAssetId, attempt, projectId, sceneId, shotId, actorContext }) {
    const video = await this.assetRepository.findByIdForOwner(videoAssetId, actorContext.userId);
    if (!video || video.status === 'deleted' || video.assetType !== 'cinematic_video_output'
      || video.metadata?.technicalProbe?.status !== 'passed'
      || video.metadata?.projectId !== projectId || video.metadata?.sceneId !== sceneId
      || video.metadata?.shotId !== shotId || video.metadata?.attemptId !== attempt.id) {
      throw frameError('cinematic_previous_video_unavailable', 'The approved previous video is unavailable.', 409);
    }
    const durationMs = Math.round(Number(video.metadata.technicalProbe.durationSeconds) * 1000);
    const outMs = Number(attempt.usableRange?.trimOutMs) > 0
      ? Math.min(durationMs, Number(attempt.usableRange.trimOutMs)) : durationMs;
    if (!Number.isFinite(outMs) || outMs < 100) {
      throw frameError('cinematic_previous_video_unavailable', 'The approved previous video has no usable final frame.', 409);
    }
    const fps = Number(video.metadata.technicalProbe.fps) || 24;
    const timestampMs = Math.max(0, Math.floor(outMs - Math.max(40, Math.ceil(1000 / fps))));
    const sourceJobId = `last-frame:${attempt.id}:${video.id}:${timestampMs}`;
    const source = this.#filePath(video.storageKey);
    if (!await nonEmptyFile(source)) {
      throw frameError('cinematic_previous_video_unavailable', 'The approved previous video file is unavailable.', 409);
    }
    if (!video.metadata.contentHash || await hashFile(source) !== video.metadata.contentHash) {
      throw frameError('cinematic_previous_video_changed', 'The approved previous video no longer matches its immutable Asset.', 409);
    }
    const existing = await this.assetRepository.findBySourceJobIdForOwner(sourceJobId, actorContext.userId, 'cinematic_storyboard_source');
    if (existing && existing.metadata?.sourceVideoAssetId === video.id
      && existing.metadata?.sourceAttemptId === attempt.id
      && existing.metadata?.contentHash
      && await nonEmptyFile(this.#filePath(existing.storageKey))
      && await hashFile(this.#filePath(existing.storageKey)) === existing.metadata.contentHash) return toSource(existing);

    const storageKey = path.posix.join('cinematic-video', safeSegment(actorContext.userId),
      `${safeSegment(attempt.id)}.${timestampMs}.${crypto.randomUUID()}.last-frame.png`);
    const destination = this.#filePath(storageKey);
    const temporary = `${destination}.${process.pid}.partial.png`;
    await fs.mkdir(path.dirname(destination), { recursive: true });
    try {
      await this.runProcess(this.ffmpegPath, [
        '-hide_banner', '-loglevel', 'error', '-y', '-ss', (timestampMs / 1000).toFixed(3),
        '-i', source, '-frames:v', '1', '-an', temporary
      ], { timeout: 30000, windowsHide: true, maxBuffer: 1024 * 1024 });
      if (!await nonEmptyFile(temporary)) throw new Error('Empty extracted frame');
      const bytes = await fs.readFile(temporary);
      const dimensions = await sharp(bytes).metadata();
      if (!dimensions.width || !dimensions.height) throw new Error('Invalid extracted frame');
      const visualStats = await sharp(bytes).stats();
      if (visualStats.channels.slice(0, 3).every(channel => channel.mean < 8 && channel.stdev < 3)) {
        throw frameError('cinematic_previous_frame_blank', 'The final frame is blank. Choose another Take or generate a Storyboard image.', 409);
      }
      await fs.rename(temporary, destination);
      const asset = await this.assetRepository.create({
        assetType: 'cinematic_storyboard_source', storageKey, publicUrl: `/outputs/${storageKey}`,
        thumbnailUrl: `/outputs/${storageKey}`, mimeType: 'image/png', sizeBytes: bytes.length,
        width: dimensions.width, height: dimensions.height, sourceJobId,
        deduplicateSource: !existing,
        metadata: { immutable: true, contentHash: crypto.createHash('sha256').update(bytes).digest('hex'),
          sourceKind: 'previous_video_last_frame', sourceVideoAssetId: video.id,
          sourceVideoAssetVersionId: video.id, sourceAttemptId: attempt.id,
          sourceProjectId: projectId, sourceSceneId: sceneId, sourceShotId: shotId,
          extractionMethod: 'server_extracted', timestampMs,
          sourceTimeBase: video.metadata.technicalProbe.timeBase || null,
          sourceDurationMs: durationMs, usableOutMs: outMs,
          sourceGenerationJobId: attempt.generationJobId || null,
          sourceProviderId: attempt.providerId || null, sourceModelId: attempt.modelId || null,
          videoSourceFingerprint: attempt.videoSourceFingerprint || null,
          packetFingerprint: attempt.videoPacketFingerprint || null,
          referencePlanFingerprint: attempt.referencePlanFingerprint || null }
      }, actorContext);
      if (asset.storageKey !== storageKey) await fs.rm(destination, { force: true });
      return toSource(asset);
    } catch (error) {
      if (error?.code?.startsWith?.('cinematic_')) throw error;
      throw frameError('cinematic_previous_frame_extraction_failed', 'The final video frame could not be extracted.', 409);
    } finally {
      await fs.rm(temporary, { force: true }).catch(() => undefined);
    }
  }

  async resolve(assetId, actorContext) {
    const asset = await this.assetRepository.findByIdForOwner(assetId, actorContext.userId);
    if (!asset || asset.status === 'deleted' || asset.assetType !== 'cinematic_storyboard_source'
      || asset.metadata?.sourceKind !== 'previous_video_last_frame' || asset.metadata.immutable !== true
      || !await nonEmptyFile(this.#filePath(asset.storageKey))) {
      throw frameError('cinematic_previous_frame_unavailable', 'The prepared final frame is unavailable.', 409);
    }
    const bytes = await fs.readFile(this.#filePath(asset.storageKey));
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== asset.metadata.contentHash) {
      throw frameError('cinematic_previous_frame_changed', 'The prepared final frame no longer matches its Asset.', 409);
    }
    return toSource(asset);
  }

  #filePath(storageKey) {
    const target = path.resolve(this.outputsDirectory, ...String(storageKey || '').split('/'));
    const relative = path.relative(path.resolve(this.outputsDirectory), target);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw frameError('cinematic_video_storage_path_invalid', 'Video storage path is invalid.', 400);
    }
    return target;
  }
}

function toSource(asset) {
  return { assetId: asset.id, assetVersionId: asset.id, sourceJobId: null,
    imageUrl: asset.publicUrl, thumbnailUrl: asset.thumbnailUrl || asset.publicUrl,
    contentHash: asset.metadata.contentHash, sourceFingerprint: createStoryboardSourceFingerprint(asset),
    sourceKind: 'previous_video_last_frame', sourceVideoAssetId: asset.metadata.sourceVideoAssetId,
    sourceAttemptId: asset.metadata.sourceAttemptId, sourceProjectId: asset.metadata.sourceProjectId,
    sourceShotId: asset.metadata.sourceShotId,
    timestampMs: asset.metadata.timestampMs, approvedAt: asset.createdAt,
    storyboardRenderStyle: null, providerOutputProvenance: null, videoCompatibility: null };
}

async function nonEmptyFile(filePath) {
  const stat = await fs.stat(filePath).catch(() => null);
  return Boolean(stat?.isFile() && stat.size > 0);
}

async function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

function safeSegment(value) {
  const segment = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!segment) throw frameError('cinematic_video_storage_path_invalid', 'Video storage identity is invalid.', 400);
  return segment;
}

function frameError(code, message, statusCode) {
  return Object.assign(new Error(message), { code, statusCode });
}

export const cinematicLastFrameService = new CinematicLastFrameService();
