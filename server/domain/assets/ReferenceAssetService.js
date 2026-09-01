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

    return this.#persistReferenceBuffer({
      buffer,
      mimeType,
      width: metadata.width,
      height: metadata.height,
      role: normalizedRole,
      sourceMode,
      namespace,
      assetType,
      metadata: {}
    }, actorContext);
  }

  async composeReference({
    sourceAssetIds,
    role = 'outfit_front',
    sourceMode = 'character-look-separate-pieces'
  }, actorContext) {
    const actorUserId = String(actorContext?.userId || '').trim();
    if (!actorUserId) throw referenceError('actor_required', 'An active actor is required.', 401);
    const normalizedRole = String(role || '').trim();
    if (!REFERENCE_ROLES.has(normalizedRole)) {
      throw referenceError('invalid_reference_role', 'Reference role is not supported.');
    }
    const ids = [...new Set((Array.isArray(sourceAssetIds) ? sourceAssetIds : [])
      .map(value => String(value || '').trim())
      .filter(Boolean))];
    if (ids.length < 2 || ids.length > 6) {
      throw referenceError('invalid_reference_composite', 'A composite reference requires between 2 and 6 source Assets.');
    }
    const assets = await Promise.all(ids.map(id => this.repository.findByIdForOwner(id, actorUserId)));
    if (assets.some(asset => !asset || asset.status === 'deleted' || !String(asset.mimeType || '').startsWith('image/'))) {
      throw referenceError('reference_asset_not_authorized', 'Every composite source must be an active owned image Asset.', 403);
    }
    const cellWidth = 300;
    const cellHeight = 440;
    const prepared = await Promise.all(assets.map(async asset => {
      const sourcePath = resolveStoragePath(this.outputsDirectory, asset.storageKey);
      return sharp(sourcePath, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize(cellWidth, cellHeight, { fit: 'contain', background: '#ffffff' })
        .png()
        .toBuffer();
    }));
    const positions = prepared.map((input, index) => ({
      input,
      left: 47 + (index % 3) * 323,
      top: 47 + Math.floor(index / 3) * 487
    }));
    const buffer = await sharp({
      create: { width: 1024, height: 1024, channels: 4, background: '#ffffff' }
    }).composite(positions).png().toBuffer();

    return this.#persistReferenceBuffer({
      buffer,
      mimeType: 'image/png',
      width: 1024,
      height: 1024,
      role: normalizedRole,
      sourceMode,
      namespace: 'references',
      assetType: 'generation_reference_derivative',
      metadata: {
        compositeKind: 'wardrobe_piece_contact_sheet',
        sourceAssetIds: ids
      }
    }, actorContext);
  }

  async #persistReferenceBuffer({
    buffer,
    mimeType,
    width,
    height,
    role,
    sourceMode,
    namespace,
    assetType,
    metadata
  }, actorContext) {
    const safeNamespace = /^[a-z0-9-]+$/.test(namespace) ? namespace : 'references';
    const actorDirectory = encodeURIComponent(actorContext.userId);
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
        width,
        height,
        metadata: {
          ...metadata,
          role,
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
      width,
      height,
      source: 'upload',
      sourceMode: String(sourceMode || 'upload')
    };
  }
}

function resolveStoragePath(outputsDirectory, storageKey) {
  const root = path.resolve(outputsDirectory);
  const normalized = String(storageKey || '').replace(/\\/g, '/');
  if (!normalized || normalized.startsWith('/') || normalized.split('/').includes('..')) {
    throw referenceError('invalid_reference_asset_path', 'Reference Asset storage path is invalid.', 409);
  }
  const resolved = path.resolve(root, ...normalized.split('/'));
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw referenceError('invalid_reference_asset_path', 'Reference Asset storage path is invalid.', 409);
  }
  return resolved;
}

function referenceError(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

export const referenceAssetService = new ReferenceAssetService();
