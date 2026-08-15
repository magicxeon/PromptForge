import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { OUTPUTS_DIR } from '../../../config/paths.js';

const MAX_EDGE = 2048;
const PROCESSOR_VERSIONS = Object.freeze({
  image_probe: '1.0.0',
  orientation_normalize: '1.0.0'
});

export async function processDeterministicImage({
  asset,
  actorContext,
  repository,
  outputsDirectory = OUTPUTS_DIR,
  policyVersion
}) {
  const sourcePath = safeAssetPath(outputsDirectory, asset.storageKey);
  const sourceBuffer = await fs.readFile(sourcePath);
  const fingerprint = crypto.createHash('sha256').update(sourceBuffer).digest('hex');
  const metadata = await sharp(sourceBuffer, { limitInputPixels: 40_000_000 }).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Reference image dimensions are unavailable.');
  }

  const existing = await repository.findDerivativeForOwner?.({
    ownerUserId: actorContext.userId,
    sourceAssetId: asset.id,
    processorId: 'orientation_normalize',
    processorVersion: PROCESSOR_VERSIONS.orientation_normalize,
    policyVersion,
    inputFingerprint: fingerprint
  });
  if (existing) {
    return resultFor(existing, fingerprint, metadata, true);
  }

  const requiresDerivative = Number(metadata.orientation || 1) !== 1
    || metadata.width > MAX_EDGE
    || metadata.height > MAX_EDGE;
  if (!requiresDerivative) {
    return resultFor(asset, fingerprint, metadata, false);
  }

  const extension = outputExtension(asset.mimeType);
  const actorDirectory = encodeURIComponent(actorContext.userId);
  const relativeDirectory = path.posix.join('reference-processed', actorDirectory);
  const outputDirectory = path.join(outputsDirectory, 'reference-processed', actorDirectory);
  await fs.mkdir(outputDirectory, { recursive: true });
  const filename = `${fingerprint.slice(0, 24)}.${extension}`;
  const outputPath = path.join(outputDirectory, filename);
  const pipeline = sharp(sourceBuffer, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true
    });
  await encode(pipeline, extension).toFile(outputPath);
  const normalizedMetadata = await sharp(outputPath).metadata();
  const stat = await fs.stat(outputPath);
  let derivative;
  try {
    derivative = await repository.create({
      assetType: 'generation_reference_derivative',
      storageKey: path.posix.join(relativeDirectory, filename),
      publicUrl: `/outputs/${path.posix.join(relativeDirectory, filename)}`,
      mimeType: mimeForExtension(extension),
      sizeBytes: stat.size,
      width: normalizedMetadata.width,
      height: normalizedMetadata.height,
      metadata: {
        sourceAssetId: asset.id,
        processorId: 'orientation_normalize',
        processorVersion: PROCESSOR_VERSIONS.orientation_normalize,
        policyVersion,
        inputFingerprint: fingerprint
      }
    }, actorContext);
  } catch (error) {
    await fs.unlink(outputPath).catch(() => {});
    throw error;
  }
  return resultFor(derivative, fingerprint, normalizedMetadata, true);
}

export const deterministicProcessorVersions = PROCESSOR_VERSIONS;

function safeAssetPath(outputsDirectory, storageKey) {
  const resolved = path.resolve(outputsDirectory, String(storageKey || ''));
  const relative = path.relative(outputsDirectory, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Reference asset storage path is invalid.');
  }
  return resolved;
}

function resultFor(asset, fingerprint, metadata, derivative) {
  return {
    sourceAssetId: asset.metadata?.sourceAssetId || asset.id,
    derivativeAssetId: derivative ? asset.id : null,
    imageUrl: asset.publicUrl,
    contentFingerprint: fingerprint,
    width: metadata.width || asset.width || null,
    height: metadata.height || asset.height || null,
    processorIds: Object.keys(PROCESSOR_VERSIONS),
    processorVersions: { ...PROCESSOR_VERSIONS }
  };
}

function outputExtension(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function mimeForExtension(extension) {
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function encode(pipeline, extension) {
  if (extension === 'png') return pipeline.png({ compressionLevel: 8 });
  if (extension === 'webp') return pipeline.webp({ quality: 92 });
  return pipeline.jpeg({ quality: 94, mozjpeg: true });
}
