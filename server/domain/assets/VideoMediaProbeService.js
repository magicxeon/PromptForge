import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 30_000;
const PROBE_VERSION = 'ffprobe-video-v1';

export class VideoMediaProbeService {
  constructor({
    ffprobePath = process.env.FFPROBE_PATH || 'ffprobe',
    timeoutMs = Number(process.env.VIDEO_PROBE_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
    runProcess = execFileAsync
  } = {}) {
    this.ffprobePath = ffprobePath;
    this.timeoutMs = timeoutMs;
    this.runProcess = runProcess;
  }

  async probe({ videoPath }) {
    const source = path.resolve(String(videoPath || ''));
    const sourceStat = await fs.stat(source).catch(() => null);
    if (!sourceStat?.isFile() || sourceStat.size <= 0) {
      throw probeError('video_probe_source_missing', 'Video source is missing or empty.');
    }

    let stdout;
    try {
      ({ stdout } = await this.runProcess(this.ffprobePath, [
        '-v', 'error',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        source
      ], {
        timeout: this.timeoutMs,
        windowsHide: true,
        maxBuffer: 2 * 1024 * 1024
      }));
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw probeError('video_probe_ffprobe_unavailable', 'FFprobe is not available for Video validation.', true);
      }
      if (error?.killed || error?.signal === 'SIGTERM' || error?.code === 'ETIMEDOUT') {
        throw probeError('video_probe_timeout', 'Video validation timed out.', true);
      }
      throw probeError('video_probe_execution_failed', 'Video validation could not be completed.');
    }

    let payload;
    try {
      payload = JSON.parse(String(stdout || ''));
    } catch {
      throw probeError('video_probe_response_invalid', 'Video validation returned invalid metadata.');
    }
    return normalizeProbePayload(payload, sourceStat.size);
  }
}

export function normalizeProbePayload(payload, sizeBytes = null) {
  const streams = Array.isArray(payload?.streams) ? payload.streams : [];
  const video = streams.find(stream => stream?.codec_type === 'video');
  if (!video) throw probeError('video_probe_stream_missing', 'Video file does not contain a readable video stream.');

  const durationSeconds = firstPositiveNumber(video.duration, payload?.format?.duration);
  const width = positiveInteger(video.width);
  const height = positiveInteger(video.height);
  const fps = parseFrameRate(video.avg_frame_rate || video.r_frame_rate);
  if (!durationSeconds || !width || !height || !fps) {
    throw probeError('video_probe_metadata_invalid', 'Video duration, dimensions, or frame rate is invalid.');
  }

  const audio = streams.find(stream => stream?.codec_type === 'audio') || null;
  return {
    schemaVersion: 1,
    probeVersion: PROBE_VERSION,
    status: 'passed',
    container: firstFormatName(payload?.format?.format_name),
    durationSeconds: round(durationSeconds, 3),
    width,
    height,
    displayAspectRatio: String(video.display_aspect_ratio || '').trim() || `${width}:${height}`,
    fps: round(fps, 3),
    timeBase: String(video.time_base || '').trim() || null,
    startTimeSeconds: finiteNumber(video.start_time, payload?.format?.start_time),
    videoCodec: String(video.codec_name || '').trim() || null,
    videoProfile: String(video.profile || '').trim() || null,
    pixelFormat: String(video.pix_fmt || '').trim() || null,
    frameCount: positiveInteger(video.nb_frames) || null,
    hasAudio: Boolean(audio),
    audioCodec: audio ? String(audio.codec_name || '').trim() || null : null,
    audioChannels: audio ? positiveInteger(audio.channels) || null : null,
    sizeBytes: positiveInteger(sizeBytes) || positiveInteger(payload?.format?.size) || null,
    probedAt: new Date().toISOString()
  };
}

function parseFrameRate(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const [numerator, denominator = '1'] = text.split('/');
  const top = Number(numerator);
  const bottom = Number(denominator);
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || top <= 0 || bottom <= 0) return null;
  return top / bottom;
}

function firstFormatName(value) {
  return String(value || '').split(',').map(item => item.trim()).find(Boolean) || null;
}

function firstPositiveNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return null;
}

function finiteNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return round(number, 3);
  }
  return null;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function round(value, precision) {
  const scale = 10 ** precision;
  return Math.round(Number(value) * scale) / scale;
}

function probeError(code, message, retryable = false) {
  return Object.assign(new Error(message), {
    code,
    category: 'media',
    retryable
  });
}

export const videoMediaProbeService = new VideoMediaProbeService();
