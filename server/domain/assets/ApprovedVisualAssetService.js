import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';
import { imagePresentationService } from './ImagePresentationService.js';

const DERIVATIVES = Object.freeze([
  Object.freeze({ key: 'preview', profileId: 'attribute-option-preview-v1' }),
  Object.freeze({ key: 'thumbnail', profileId: 'attribute-option-thumbnail-v1' })
]);

export class ApprovedVisualAssetService {
  constructor({
    presentationService = imagePresentationService,
    repository = assetRepo,
    outputsDirectory = OUTPUTS_DIR
  } = {}) {
    this.presentationService = presentationService;
    this.repository = repository;
    this.outputsDirectory = outputsDirectory;
  }

  async createApprovedSet({ sourceJobId = null, sourceAssetId = null, imageUrl, mimeType = null }, actorContext) {
    const actorUserId = String(actorContext?.userId || '').trim();
    if (!actorUserId) throw visualAssetError('actor_required', 'An active actor is required.', 401);
    const sourceId = String(sourceJobId || sourceAssetId || '').trim();
    if (!sourceId) {
      throw visualAssetError('visual_source_required', 'A source Generation job or uploaded Asset is required.');
    }

    const directoryName = encodeURIComponent(actorUserId);
    const directory = path.join(this.outputsDirectory, 'attribute-visuals', directoryName);
    await fs.mkdir(directory, { recursive: true });
    const persistedFiles = [];
    const derivatives = {};

    try {
      for (const derivative of DERIVATIVES) {
        const rendered = await this.presentationService.renderOutputUrl(imageUrl, derivative.profileId);
        const contentHash = crypto.createHash('sha256').update(rendered.buffer).digest('hex');
        const safeSourceId = sourceId.replace(/[^a-z0-9_-]/gi, '_');
        const fileName = `${safeSourceId}-${derivative.key}-${contentHash.slice(0, 12)}.webp`;
        const filePath = path.join(directory, fileName);
        await fs.writeFile(filePath, rendered.buffer);
        persistedFiles.push(filePath);
        const publicUrl = `/outputs/attribute-visuals/${directoryName}/${fileName}`;
        const asset = await this.repository.create({
          assetType: 'approved_attribute_visual_derivative',
          storageKey: path.relative(this.outputsDirectory, filePath).replace(/\\/g, '/'),
          publicUrl,
          mimeType: rendered.contentType,
          sizeBytes: rendered.contentLength,
          width: rendered.width,
          height: rendered.height,
          sourceJobId: sourceJobId || null,
          metadata: {
            derivative: derivative.key,
            profileId: derivative.profileId,
            contentHash,
            sourceImageUrl: imageUrl,
            sourceAssetId: sourceAssetId || null
          }
        }, actorContext);
        derivatives[derivative.key] = {
          assetId: asset.id,
          imageUrl: publicUrl,
          mimeType: rendered.contentType,
          width: rendered.width,
          height: rendered.height,
          byteSize: rendered.contentLength,
          contentHash,
          profileId: derivative.profileId
        };
      }
    } catch (error) {
      await Promise.all(persistedFiles.map(filePath => fs.unlink(filePath).catch(() => {})));
      throw error;
    }

    return {
      original: { imageUrl, mimeType },
      preview: derivatives.preview,
      thumbnail: derivatives.thumbnail
    };
  }
}

function visualAssetError(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

export const approvedVisualAssetService = new ApprovedVisualAssetService();
