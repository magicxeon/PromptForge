import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';
import { postProcessingServiceClient } from '../../providers/PostProcessingServiceClient.js';
import {
  createStoryboardSourceFingerprint,
  loadVerifiedStoryboardAssetContent
} from './CinematicStoryboardAssetService.js';

export class FacelessPrevisAssetService {
  constructor({
    assetRepository = assetRepo,
    processingClient = postProcessingServiceClient,
    outputsDirectory = OUTPUTS_DIR
  } = {}) {
    this.assetRepository = assetRepository;
    this.processingClient = processingClient;
    this.outputsDirectory = outputsDirectory;
  }

  async prepare({ sourceAssetId, projectId, sceneId, shotId, expectedFaces, actorContext }) {
    if (!Number.isInteger(expectedFaces) || expectedFaces < 1 || expectedFaces > 8) {
      throw sourceError('faceless_expected_faces_invalid', 'Choose the number of visible faces from 1 to 8.', 400);
    }
    const source = await this.assetRepository.findByIdForOwner(sourceAssetId, actorContext.userId);
    if (!source || source.status === 'deleted'
      || source.assetType !== 'cinematic_storyboard_source'
      || source.metadata?.immutable !== true) {
      throw sourceError('faceless_source_unavailable', 'Storyboard image is unavailable.', 409);
    }
    const { bytes, contentHash } = await loadVerifiedStoryboardAssetContent(source, {
      outputsDirectory: this.outputsDirectory
    });
    const capability = await this.processingClient.capabilities();
    if (!capability.available) {
      throw sourceError('faceless_service_unavailable', 'Faceless processing is unavailable. Use the existing Generate options.', 503);
    }
    const sourceJobId = [
      'faceless', projectId, sceneId, shotId, source.id, contentHash, expectedFaces,
      capability.policyVersion, capability.modelHash
    ].join(':');
    const existing = await this.assetRepository.findBySourceJobIdForOwner(
      sourceJobId, actorContext.userId, 'cinematic_storyboard_source'
    );
    if (existing) {
      await loadVerifiedStoryboardAssetContent(existing, { outputsDirectory: this.outputsDirectory });
      return toFacelessSource(existing);
    }
    const result = await this.processingClient.createFacelessPrevis(bytes, expectedFaces);
    if (result.faceCount !== expectedFaces
      || result.modelHash !== capability.modelHash
      || result.policyVersion !== capability.policyVersion) {
      throw sourceError('faceless_output_invalid', 'Faceless output metadata did not match.', 502);
    }
    const dimensions = await sharp(result.bytes).metadata();
    const relativeKey = path.posix.join('cinematic-post-processing',
      safeSegment(actorContext.userId), crypto.randomUUID() + '.png');
    const destination = path.resolve(this.outputsDirectory, ...relativeKey.split('/'));
    const temporary = destination + '.' + process.pid + '.partial';
    await fs.mkdir(path.dirname(destination), { recursive: true });
    try {
      await fs.writeFile(temporary, result.bytes, { flag: 'wx' });
      await fs.rename(temporary, destination);
      const asset = await this.assetRepository.create({
        assetType: 'cinematic_storyboard_source',
        storageKey: relativeKey,
        publicUrl: '/outputs/' + relativeKey,
        thumbnailUrl: '/outputs/' + relativeKey,
        mimeType: 'image/png',
        sizeBytes: result.bytes.length,
        width: dimensions.width,
        height: dimensions.height,
        sourceJobId,
        deduplicateSource: true,
        metadata: {
          immutable: true,
          contentHash: result.outputHash,
          sourceKind: 'faceless_previs',
          parentAssetId: source.id,
          parentContentHash: contentHash,
          parentSourceKind: source.metadata?.sourceKind || 'generated_image',
          parentSourceAttemptId: source.metadata?.sourceAttemptId || null,
          parentSourceVideoAssetId: source.metadata?.sourceVideoAssetId || null,
          parentSourceShotId: source.metadata?.sourceShotId || null,
          projectId, sceneId, shotId, expectedFaces,
          faceCount: result.faceCount,
          processorId: 'mediapipe-face-landmarker',
          modelHash: result.modelHash,
          policyVersion: result.policyVersion
        }
      }, actorContext);
      if (asset.storageKey !== relativeKey) await fs.rm(destination, { force: true });
      return toFacelessSource(asset);
    } finally {
      await fs.rm(temporary, { force: true }).catch(() => undefined);
    }
  }

  async resolve({ assetId, projectId, sceneId, shotId, actorContext }) {
    const asset = await this.assetRepository.findByIdForOwner(assetId, actorContext.userId);
    if (!asset || asset.status === 'deleted'
      || asset.assetType !== 'cinematic_storyboard_source'
      || asset.metadata?.sourceKind !== 'faceless_previs'
      || asset.metadata?.projectId !== projectId
      || asset.metadata?.sceneId !== sceneId
      || asset.metadata?.shotId !== shotId) {
      throw sourceError('faceless_source_unavailable', 'Faceless image is unavailable for this Shot.', 409);
    }
    await loadVerifiedStoryboardAssetContent(asset, { outputsDirectory: this.outputsDirectory });
    const parent = await this.assetRepository.findByIdForOwner(asset.metadata.parentAssetId, actorContext.userId);
    if (!parent || parent.status === 'deleted'
      || parent.metadata?.contentHash !== asset.metadata.parentContentHash) {
      throw sourceError('faceless_source_changed', 'Original Storyboard image changed.', 409);
    }
    await loadVerifiedStoryboardAssetContent(parent, { outputsDirectory: this.outputsDirectory });
    return toFacelessSource(asset);
  }
}

function toFacelessSource(asset) {
  return {
    assetId: asset.id,
    assetVersionId: asset.id,
    sourceJobId: null,
    sourceKind: 'faceless_previs',
    imageUrl: asset.publicUrl,
    thumbnailUrl: asset.thumbnailUrl || asset.publicUrl,
    contentHash: asset.metadata.contentHash,
    sourceFingerprint: createStoryboardSourceFingerprint(asset),
    storyboardRenderStyle: null,
    providerOutputProvenance: null,
    videoCompatibility: null,
    parentAssetId: asset.metadata.parentAssetId,
    parentSourceKind: asset.metadata.parentSourceKind,
    parentSourceAttemptId: asset.metadata.parentSourceAttemptId,
    parentSourceVideoAssetId: asset.metadata.parentSourceVideoAssetId,
    parentSourceShotId: asset.metadata.parentSourceShotId,
    expectedFaces: asset.metadata.expectedFaces,
    approvedAt: asset.createdAt
  };
}

function safeSegment(value) {
  const segment = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!segment) throw sourceError('faceless_owner_invalid', 'Owner identity is invalid.', 400);
  return segment;
}

function sourceError(code, message, statusCode) {
  return Object.assign(new Error(message), { code, statusCode });
}

export const facelessPrevisAssetService = new FacelessPrevisAssetService();
