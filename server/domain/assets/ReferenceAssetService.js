import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';

const MAX_BYTES = 12 * 1024 * 1024;
const MIME_EXTENSIONS = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp']
]);
const REFERENCE_ROLES = new Set([
  'face_reference',
  'character_reference',
  'style_reference',
  'pose_reference',
  'outfit_front',
  'outfit_back'
]);

export class ReferenceAssetService {
  constructor({
    repository = assetRepo,
    outputsDirectory = OUTPUTS_DIR
  } = {}) {
    this.repository = repository;
    this.outputsDirectory = outputsDirectory;
  }

  async storeReference({
    dataUrl,
    role,
    sourceMode = 'upload'
  }, actorContext, {
    namespace = 'references',
    assetType = 'generation_reference'
  } = {}) {
    const actorUserId = String(actorContext?.userId || '').trim();
    if (!actorUserId) throw referenceError('actor_required', 'An active actor is required.', 401);
    const normalizedRole = String(role || '').trim();
    if (!REFERENCE_ROLES.has(normalizedRole)) {
      throw referenceError('invalid_reference_role', 'Reference role is not supported.');
    }
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=\r\n]+)$/i.exec(String(dataUrl || ''));
    if (!match) {
      throw referenceError('invalid_reference', 'Reference must be a PNG, JPEG, or WebP image.');
    }
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.length > MAX_BYTES) {
      throw referenceError('reference_too_large', 'Reference must be between 1 byte and 12 MB.', 413);
    }
    const mimeType = match[1].toLowerCase();
    const expectedFormat = mimeType === 'image/jpeg' ? 'jpeg' : mimeType.split('/')[1];
    let metadata;
    try {
      metadata = await sharp(buffer, { limitInputPixels: 40_000_000 }).metadata();
    } catch {
      throw referenceError('invalid_reference', 'Reference contains invalid image data.');
    }
    if (!metadata.width || !metadata.height || metadata.format !== expectedFormat) {
      throw referenceError('invalid_reference', 'Reference bytes do not match the declared image type.');
    }

    const safeNamespace = /^[a-z0-9-]+$/.test(namespace) ? namespace : 'references';
    const actorDirectory = encodeURIComponent(actorUserId);
    const directory = path.join(this.outputsDirectory, safeNamespace, actorDirectory);
    await fs.mkdir(directory, { recursive: true });
    const extension = MIME_EXTENSIONS.get(mimeType);
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
    const filePath = path.join(directory, fileName);
    await fs.writeFile(filePath, buffer);
    const imageUrl = `/outputs/${safeNamespace}/${actorDirectory}/${fileName}`;
    let asset;
    try {
      asset = await this.repository.create({
        assetType,
        storageKey: path.relative(this.outputsDirectory, filePath).replace(/\\/g, '/'),
        publicUrl: imageUrl,
        mimeType,
        sizeBytes: buffer.length,
        width: metadata.width,
        height: metadata.height,
        metadata: {
          role: normalizedRole,
          sourceMode: String(sourceMode || 'upload')
        }
      }, actorContext);
    } catch (error) {
      await fs.unlink(filePath).catch(() => {});
      throw error;
    }
    return {
      referenceId: asset.id,
      imageUrl,
      thumbnailUrl: asset.thumbnailUrl || imageUrl,
      mimeType,
      byteSize: buffer.length,
      width: metadata.width,
      height: metadata.height,
      source: 'upload',
      sourceMode: String(sourceMode || 'upload')
    };
  }
}

function referenceError(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

export const referenceAssetService = new ReferenceAssetService();
