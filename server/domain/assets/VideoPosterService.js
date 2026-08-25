import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_WIDTH = 720;

export class VideoPosterService {
  constructor({
    ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg',
    timeoutMs = Number(process.env.VIDEO_POSTER_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
    width = DEFAULT_WIDTH,
    runProcess = execFileAsync,
    sharpFactory = sharp
  } = {}) {
    this.ffmpegPath = ffmpegPath;
    this.timeoutMs = timeoutMs;
    this.width = width;
    this.runProcess = runProcess;
    this.sharpFactory = sharpFactory;
  }

  async generatePoster({ videoPath, posterPath, durationSeconds = null }) {
    const source = path.resolve(String(videoPath || ''));
    const destination = path.resolve(String(posterPath || ''));
    const sourceStat = await fs.stat(source).catch(() => null);
    if (!sourceStat?.isFile() || sourceStat.size <= 0) {
      throw posterError('video_poster_source_missing', 'Video source is missing or empty.');
    }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const framePath = `${destination}.${process.pid}.${Date.now()}.frame.png`;
    const temporaryPoster = `${destination}.${process.pid}.${Date.now()}.partial.webp`;
    try {
      await this.runProcess(this.ffmpegPath, [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-ss', representativeTimestamp(durationSeconds),
        '-i', source,
        '-frames:v', '1',
        framePath
      ], {
        timeout: this.timeoutMs,
        windowsHide: true,
        maxBuffer: 1024 * 1024
      });
      const frameStat = await fs.stat(framePath).catch(() => null);
      if (!frameStat?.isFile() || frameStat.size <= 0) {
        throw posterError('video_poster_invalid', 'FFmpeg did not produce a valid poster frame.');
      }
      await this.sharpFactory(framePath)
        .rotate()
        .resize({ width: this.width, withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toFile(temporaryPoster);
      const posterStat = await fs.stat(temporaryPoster).catch(() => null);
      if (!posterStat?.isFile() || posterStat.size <= 0) {
        throw posterError('video_poster_invalid', 'Poster derivative is empty.');
      }
      await fs.rename(temporaryPoster, destination);
      return {
        path: destination,
        sizeBytes: posterStat.size,
        mimeType: 'image/webp',
        frameTimestamp: representativeTimestamp(durationSeconds)
      };
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw posterError('video_poster_ffmpeg_unavailable', 'FFmpeg is not available for Video poster extraction.');
      }
      if (error?.killed || error?.signal === 'SIGTERM' || error?.code === 'ETIMEDOUT') {
        throw posterError('video_poster_timeout', 'Video poster extraction timed out.');
      }
      if (error?.code?.startsWith?.('video_poster_')) throw error;
      throw posterError('video_poster_extraction_failed', 'Video poster extraction failed.');
    } finally {
      await fs.rm(framePath, { force: true }).catch(() => undefined);
      await fs.rm(temporaryPoster, { force: true }).catch(() => undefined);
    }
  }
}

function representativeTimestamp(durationSeconds) {
  const duration = Number(durationSeconds);
  if (!Number.isFinite(duration) || duration <= 0) return '0.500';
  return Math.max(0.25, Math.min(duration * 0.15, Math.max(0.25, duration - 0.1))).toFixed(3);
}

function posterError(code, message) {
  return Object.assign(new Error(message), { code, category: 'media', retryable: true });
}

export const videoPosterService = new VideoPosterService();
