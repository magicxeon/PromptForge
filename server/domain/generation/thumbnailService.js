import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OUTPUTS_DIR } from '../../config/paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ThumbnailService {
  constructor({
    outputsDir = OUTPUTS_DIR,
    thumbnailDir = path.join(OUTPUTS_DIR, 'thumbnails'),
    maxDimension = 640,
    quality = 78
  } = {}) {
    this.outputsDir = outputsDir;
    this.thumbnailDir = thumbnailDir;
    this.maxDimension = maxDimension;
    this.quality = quality;
    this.sharpPromise = null;
  }

  async getSharp() {
    this.sharpPromise ||= import('sharp').then(module => module.default);
    return this.sharpPromise;
  }

  resolveOriginalPath(imageUrl) {
    if (typeof imageUrl !== 'string' || !imageUrl.startsWith('/outputs/')) {
      throw new Error('Thumbnail source must be a local output image.');
    }
    return path.join(this.outputsDir, path.basename(imageUrl));
  }

  async createForHistoryItem(item, { overwrite = false } = {}) {
    const sharp = await this.getSharp();
    const originalPath = this.resolveOriginalPath(item.imageUrl);
    const thumbnailFilename = `${item.id}.webp`;
    const thumbnailPath = path.join(this.thumbnailDir, thumbnailFilename);
    await fs.mkdir(this.thumbnailDir, { recursive: true });

    if (!overwrite) {
      try {
        await fs.access(thumbnailPath);
        return this.readMetadata(sharp, originalPath, thumbnailPath, thumbnailFilename);
      } catch {
        // Missing or unreadable thumbnails are regenerated below.
      }
    }

    const temporaryPath = path.join(
      this.thumbnailDir,
      `.${thumbnailFilename}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
    );
    try {
      const originalBuffer = await fs.readFile(originalPath);
      await sharp(originalBuffer)
        .rotate()
        .resize({
          width: this.maxDimension,
          height: this.maxDimension,
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: this.quality })
        .toFile(temporaryPath);
      await fs.rename(temporaryPath, thumbnailPath);
    } catch (error) {
      await fs.unlink(temporaryPath).catch(() => {});
      throw error;
    }
    return this.readMetadata(sharp, originalPath, thumbnailPath, thumbnailFilename);
  }

  async readMetadata(sharp, originalPath, thumbnailPath, thumbnailFilename) {
    // Buffer-backed metadata avoids libvips retaining Windows file handles.
    const [originalBuffer, thumbnailBuffer] = await Promise.all([
      fs.readFile(originalPath),
      fs.readFile(thumbnailPath)
    ]);
    const [originalMetadata, thumbnailMetadata] = await Promise.all([
      sharp(originalBuffer).metadata(),
      sharp(thumbnailBuffer).metadata()
    ]);
    return {
      thumbnailUrl: `/outputs/thumbnails/${thumbnailFilename}`,
      thumbnailMimeType: 'image/webp',
      thumbnailWidth: thumbnailMetadata.width || null,
      thumbnailHeight: thumbnailMetadata.height || null,
      thumbnailBytes: thumbnailBuffer.length,
      width: originalMetadata.width || null,
      height: originalMetadata.height || null,
      originalBytes: originalBuffer.length
    };
  }

  async removeForHistoryItem(item) {
    const thumbnailUrl = item.thumbnailUrl || `/outputs/thumbnails/${item.id}.webp`;
    const thumbnailPath = path.join(this.thumbnailDir, path.basename(thumbnailUrl));
    await unlinkWithRetry(thumbnailPath);
  }
}

async function unlinkWithRetry(filename, attempts = 5) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await fs.unlink(filename);
      return;
    } catch (error) {
      if (error.code === 'ENOENT') return;
      if (!['EBUSY', 'EPERM'].includes(error.code) || attempt === attempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 40 * (attempt + 1)));
    }
  }
}

export const thumbnailService = new ThumbnailService();
