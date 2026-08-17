import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';
import { historyRepository } from '../../repositories/generation/HistoryRepository.js';

export class CinematicStoryboardAssetService {
  constructor({
    assetRepository = assetRepo,
    generationHistory = historyRepository,
    outputsDirectory = OUTPUTS_DIR
  } = {}) {
    this.assetRepository = assetRepository;
    this.generationHistory = generationHistory;
    this.outputsDirectory = outputsDirectory;
  }

  async approveGenerationResult({ jobId }, actorContext) {
    const actorUserId = String(actorContext?.userId || '').trim();
    const actorUsername = String(actorContext?.username || '').trim();
    if (!actorUserId || !actorUsername) throw sourceError('actor_required', 'An active actor is required.', 401);
    const normalizedJobId = String(jobId || '').trim();
    if (!normalizedJobId) throw sourceError('cinematic_storyboard_source_required', 'A Storyboard Generation Job is required.');

    const existing = await this.assetRepository.findBySourceJobIdForOwner(
      normalizedJobId,
      actorUserId,
      'cinematic_storyboard_source'
    );
    if (existing) return toApprovedSource(existing);

    const history = await this.generationHistory.getById(normalizedJobId);
    if (!history || history.username !== actorUsername || !history.imageUrl) {
      throw sourceError('cinematic_storyboard_source_unavailable', 'Storyboard source is unavailable.', 404);
    }
    const relativeStorageKey = normalizeOutputStorageKey(history.imageUrl);
    const absolutePath = path.resolve(this.outputsDirectory, relativeStorageKey);
    if (!isWithin(absolutePath, this.outputsDirectory)) {
      throw sourceError('cinematic_storyboard_source_unavailable', 'Storyboard source path is invalid.', 400);
    }
    let buffer;
    try {
      buffer = await fs.readFile(absolutePath);
    } catch {
      throw sourceError('cinematic_storyboard_source_unavailable', 'Storyboard source file is unavailable.', 404);
    }
    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const asset = await this.assetRepository.create({
      assetType: 'cinematic_storyboard_source',
      storageKey: relativeStorageKey,
      publicUrl: history.imageUrl,
      thumbnailUrl: history.thumbnailUrl || history.imageUrl,
      mimeType: history.mimeType || inferMimeType(history.imageUrl),
      sizeBytes: buffer.length,
      width: history.width || null,
      height: history.height || null,
      sourceJobId: normalizedJobId,
      metadata: {
        immutable: true,
        contentHash,
        generationMode: history.generationMode || null,
        operationPurpose: 'cinematic_storyboard_still'
      }
    }, actorContext);
    return toApprovedSource(asset);
  }
}

function toApprovedSource(asset) {
  const contentHash = String(asset.metadata?.contentHash || '');
  return {
    assetId: asset.id,
    assetVersionId: asset.id,
    sourceJobId: asset.sourceJobId,
    imageUrl: asset.publicUrl,
    thumbnailUrl: asset.thumbnailUrl || asset.publicUrl,
    contentHash,
    sourceFingerprint: crypto.createHash('sha256')
      .update(`${asset.id}:${asset.sourceJobId}:${contentHash}`)
      .digest('hex'),
    approvedAt: asset.createdAt
  };
}

function normalizeOutputStorageKey(imageUrl) {
  const value = String(imageUrl || '').replace(/\\/g, '/');
  if (!value.startsWith('/outputs/')) {
    throw sourceError('cinematic_storyboard_source_unavailable', 'Storyboard source is not a durable output.', 400);
  }
  const storageKey = decodeURIComponent(value.slice('/outputs/'.length));
  if (!storageKey || storageKey.split('/').includes('..')) {
    throw sourceError('cinematic_storyboard_source_unavailable', 'Storyboard source path is invalid.', 400);
  }
  return storageKey;
}

function isWithin(target, root) {
  const relative = path.relative(path.resolve(root), target);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function inferMimeType(imageUrl) {
  if (/\.png$/i.test(imageUrl)) return 'image/png';
  if (/\.webp$/i.test(imageUrl)) return 'image/webp';
  return 'image/jpeg';
}

function sourceError(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

export const cinematicStoryboardAssetService = new CinematicStoryboardAssetService();
