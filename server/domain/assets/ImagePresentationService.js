import { promises as fs } from 'fs';
import { createHash } from 'crypto';

export const IMAGE_PRESENTATION_PROFILES = Object.freeze({
  'template-card-person-focus': Object.freeze({
    id: 'template-card-person-focus',
    width: 640,
    height: 400,
    fit: 'cover',
    positionStrategy: 'attention',
    format: 'webp',
    quality: 86
  })
});

export class ImagePresentationService {
  constructor({
    sharpLoader = () => import('sharp').then(module => module.default),
    statLoader = filePath => fs.stat(filePath),
    maxCacheEntries = 96
  } = {}) {
    this.sharpLoader = sharpLoader;
    this.statLoader = statLoader;
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

export const imagePresentationService = new ImagePresentationService();
