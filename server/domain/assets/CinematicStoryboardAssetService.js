import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';
import { historyRepository } from '../../repositories/generation/HistoryRepository.js';
import { normalizeProviderOutputProvenance } from '../generation/ProviderOutputProvenance.js';
import { deriveStoryboardVideoCompatibility } from '../cinematic/CinematicStoryboardSourceCompatibility.js';

export class CinematicStoryboardAssetService {
  constructor({
    assetRepository = assetRepo,
    generationHistory = historyRepository,
    outputsDirectory = OUTPUTS_DIR,
    providerRegistry,
    clock = () => new Date()
  } = {}) {
    this.assetRepository = assetRepository;
    this.generationHistory = generationHistory;
    this.outputsDirectory = outputsDirectory;
    this.providerRegistry = providerRegistry;
    this.clock = clock;
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
    const providerOutputProvenance = normalizeProviderOutputProvenance(history.providerOutputProvenance);
    const videoCompatibility = deriveStoryboardVideoCompatibility({
      providerOutputProvenance,
      ...(this.providerRegistry ? { providerRegistry: this.providerRegistry } : {}),
      now: this.clock()
    });
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
        operationPurpose: 'cinematic_storyboard_still',
        providerOutputProvenance,
        videoCompatibility
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
    sourceFingerprint: createStoryboardSourceFingerprint(asset),
    providerOutputProvenance: normalizeProviderOutputProvenance(asset.metadata?.providerOutputProvenance),
    videoCompatibility: normalizeVideoCompatibility(asset.metadata?.videoCompatibility),
    approvedAt: asset.createdAt
  };
}

export function createStoryboardSourceFingerprint(asset) {
  const contentHash = String(asset?.metadata?.contentHash || '');
  return crypto.createHash('sha256')
    .update(`${asset?.id || ''}:${asset?.sourceJobId || ''}:${contentHash}`)
    .digest('hex');
}

export async function verifyStoryboardAssetContent(asset, {
  outputsDirectory = OUTPUTS_DIR
} = {}) {
  const verified = await loadVerifiedStoryboardAssetContent(asset, { outputsDirectory });
  return { contentHash: verified.contentHash, sizeBytes: verified.sizeBytes };
}

export async function loadVerifiedStoryboardAssetContent(asset, {
  outputsDirectory = OUTPUTS_DIR
} = {}) {
  const storageKey = String(asset?.storageKey || '').replace(/\\/g, '/');
  const expectedHash = String(asset?.metadata?.contentHash || '').trim();
  if (!storageKey || storageKey.split('/').includes('..') || !expectedHash) {
    throw sourceError(
      'cinematic_storyboard_source_content_unverifiable',
      'Storyboard source content authority is incomplete.',
      409
    );
  }
  const absolutePath = path.resolve(outputsDirectory, storageKey);
  if (!isWithin(absolutePath, outputsDirectory)) {
    throw sourceError(
      'cinematic_storyboard_source_content_unverifiable',
      'Storyboard source content path is invalid.',
      409
    );
  }
  let buffer;
  try {
    buffer = await fs.readFile(absolutePath);
  } catch {
    throw sourceError(
      'cinematic_storyboard_source_content_unavailable',
      'Storyboard source content is unavailable.',
      409
    );
  }
  const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
  if (contentHash !== expectedHash || (Number(asset?.sizeBytes) > 0 && buffer.length !== Number(asset.sizeBytes))) {
    throw sourceError(
      'cinematic_storyboard_source_content_changed',
      'Storyboard source content no longer matches the approved Asset.',
      409
    );
  }
  return { bytes: buffer, contentHash, sizeBytes: buffer.length };
}

function normalizeVideoCompatibility(value) {
  if (!value || value.targetId !== 'modelark-seedance-2') return null;
  return {
    targetId: 'modelark-seedance-2',
    status: value.status === 'eligible_internal_testing' ? value.status : 'not_qualified',
    reasonCode: value.reasonCode ? String(value.reasonCode).slice(0, 120) : null,
    sourceProviderId: value.sourceProviderId ? String(value.sourceProviderId).slice(0, 120) : null,
    sourceModelId: value.sourceModelId ? String(value.sourceModelId).slice(0, 200) : null,
    generatedAt: value.generatedAt || null,
    validUntil: value.validUntil || null,
    originalBytesPreserved: value.originalBytesPreserved === true
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
