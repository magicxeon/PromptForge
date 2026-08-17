import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { OUTPUTS_DIR } from '../../config/paths.js';

export const IMAGE_PRESENTATION_PROFILES = Object.freeze({
  'attribute-option-preview-v1': Object.freeze({
    id: 'attribute-option-preview-v1',
    width: 768,
    height: 768,
    fit: 'contain',
    positionStrategy: 'centre',
    sourceMedia: 'image',
    format: 'webp',
    quality: 90
  }),
  'attribute-option-thumbnail-v1': Object.freeze({
    id: 'attribute-option-thumbnail-v1',
    width: 320,
    height: 320,
    fit: 'contain',
    positionStrategy: 'centre',
    sourceMedia: 'image',
    format: 'webp',
    quality: 86
  }),
  'template-card-person-focus-v2': Object.freeze({
    id: 'template-card-person-focus-v2',
    width: 640,
    height: 400,
    fit: 'cover',
    positionStrategy: 'north',
    sourceMedia: 'thumbnail',
    format: 'webp',
    quality: 86
  }),
  'template-detail-person-focus-v1': Object.freeze({
    id: 'template-detail-person-focus-v1',
    width: 768,
    height: 960,
    fit: 'cover',
    positionStrategy: 'north',
    sourceMedia: 'image',
    format: 'webp',
    quality: 90
  }),
  'profile-template-square-person-focus-v2': Object.freeze({
    id: 'profile-template-square-person-focus-v2',
    width: 640,
    height: 640,
    fit: 'cover',
    positionStrategy: 'north',
    sourceMedia: 'thumbnail',
    format: 'webp',
    quality: 88
  }),
  'template-card-person-focus': Object.freeze({
    id: 'template-card-person-focus',
    width: 640,
    height: 400,
    fit: 'cover',
    positionStrategy: 'attention',
    sourceMedia: 'thumbnail',
    format: 'webp',
    quality: 86
  }),
  'profile-template-square-person-focus': Object.freeze({
    id: 'profile-template-square-person-focus',
    width: 640,
    height: 640,
    fit: 'cover',
    positionStrategy: 'attention',
    sourceMedia: 'thumbnail',
    format: 'webp',
    quality: 88
  }),
  'comparison-card-1-person-focus': comparisonProfile(
    'comparison-card-1-person-focus',
    864,
    648
  ),
  'comparison-card-2-person-focus': comparisonProfile(
    'comparison-card-2-person-focus',
    432,
    648
  ),
  'comparison-card-3-person-focus': comparisonProfile(
    'comparison-card-3-person-focus',
    288,
    648
  ),
  'comparison-card-4-person-focus': comparisonProfile(
    'comparison-card-4-person-focus',
    432,
    324
  )
});

export class ImagePresentationService {
  constructor({
    sharpLoader = () => import('sharp').then(module => module.default),
    statLoader = filePath => fs.stat(filePath),
    outputsDirectory = OUTPUTS_DIR,
    maxCacheEntries = 96
  } = {}) {
    this.sharpLoader = sharpLoader;
    this.statLoader = statLoader;
    this.outputsDirectory = outputsDirectory;
    this.maxCacheEntries = maxCacheEntries;
    this.sharpPromise = null;
    this.cache = new Map();
  }

  async renderFile(filePath, profileId) {
    const profile = resolveImagePresentationProfile(profileId);
    const sourceStat = await this.statLoader(filePath);
    const cacheKey = [
      filePath,
      sourceStat.size,
      Math.trunc(sourceStat.mtimeMs),
      profile.id
    ].join(':');
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, cached);
      return cached;
    }

    const sharp = await this.getSharp();
    const position = profile.positionStrategy === 'attention'
      ? sharp.strategy.attention
      : profile.positionStrategy;
    const { data, info } = await sharp(filePath)
      .rotate()
      .resize({
        width: profile.width,
        height: profile.height,
        fit: profile.fit,
        position,
        withoutEnlargement: true
      })
      .webp({
        quality: profile.quality,
        alphaQuality: profile.quality,
        effort: 4,
        smartSubsample: true
      })
      .toBuffer({ resolveWithObject: true });
    const result = Object.freeze({
      buffer: data,
      contentType: 'image/webp',
      contentLength: data.length,
      etag: `"${createHash('sha1').update(data).digest('base64url')}"`,
      profileId: profile.id,
      width: info.width || profile.width,
      height: info.height || profile.height
    });

    this.cache.set(cacheKey, result);
    this.trimCache();
    return result;
  }

  renderOutputUrl(outputUrl, profileId) {
    return this.renderFile(resolveOutputFile(outputUrl, this.outputsDirectory), profileId);
  }

  async getSharp() {
    this.sharpPromise ||= this.sharpLoader();
    return this.sharpPromise;
  }

  trimCache() {
    while (this.cache.size > this.maxCacheEntries) {
      this.cache.delete(this.cache.keys().next().value);
    }
  }
}

export function resolveImagePresentationProfile(profileId) {
  const profile = IMAGE_PRESENTATION_PROFILES[profileId];
  if (!profile) {
    const error = new Error('Image presentation profile is unavailable.');
    error.code = 'image_presentation_profile_not_found';
    error.statusCode = 404;
    throw error;
  }
  return profile;
}

function comparisonProfile(id, width, height) {
  return Object.freeze({
    id,
    width,
    height,
    fit: 'cover',
    positionStrategy: 'attention',
    sourceMedia: 'thumbnail',
    format: 'webp',
    quality: 86
  });
}

function resolveOutputFile(outputUrl, outputsDirectory) {
  if (typeof outputUrl !== 'string' || !outputUrl.startsWith('/outputs/')) {
    const error = new Error('Image presentation source is unavailable.');
    error.code = 'image_presentation_source_not_found';
    error.statusCode = 404;
    throw error;
  }
  const candidate = outputUrl.slice('/outputs/'.length).replaceAll('/', path.sep);
  const resolved = path.resolve(outputsDirectory, candidate);
  const relative = path.relative(outputsDirectory, resolved);
  if (
    !candidate
    || !relative
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    const error = new Error('Image presentation source is unavailable.');
    error.code = 'image_presentation_source_not_found';
    error.statusCode = 404;
    throw error;
  }
  return resolved;
}

export const imagePresentationService = new ImagePresentationService();
