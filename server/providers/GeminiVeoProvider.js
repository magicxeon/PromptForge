import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

export class GeminiVeoProvider {
  constructor({ apiKey = process.env.GEMINI_API_KEY, client = null, temporaryDirectory = os.tmpdir() } = {}) {
    this.client = client || (apiKey ? new GoogleGenAI({ apiKey }) : null);
    this.temporaryDirectory = temporaryDirectory;
  }

  async submit(request) {
    if (!this.client) throw providerError('video_provider_credentials_missing', 'Gemini video credentials are unavailable.', false, 'not_billable');
    const operation = await this.client.models.generateVideos({
      model: request.modelId,
      prompt: request.prompt,
      ...(request.referenceImage ? { image: dataUrlToImage(request.referenceImage) } : {}),
      config: {
        numberOfVideos: 1,
        durationSeconds: Number(request.durationSeconds),
        aspectRatio: request.aspectRatio,
        resolution: request.resolution,
        generateAudio: request.audioMode === 'generated',
        personGeneration: 'allow_adult'
      }
    });
    if (!operation?.name) throw providerError('video_provider_operation_missing', 'Gemini did not return a video operation.', true, 'unknown');
    return { providerTaskId: operation.name, providerOperationId: operation.name, providerStatus: operation.done ? 'provider_processing' : 'provider_queued' };
  }

  async poll(providerTaskId, { task } = {}) {
    if (!this.client) throw providerError('video_provider_credentials_missing', 'Gemini video credentials are unavailable.', false, 'not_billable');
    const operation = await this.client.operations.getVideosOperation({ operation: { name: providerTaskId } });
    if (!operation.done) return { providerStatus: 'provider_processing' };
    if (operation.error) {
      return { providerStatus: 'failed', providerError: normalizeProviderOperationError(operation.error) };
    }
    const video = operation.response?.generatedVideos?.[0]?.video;
    if (!video) return { providerStatus: 'failed', providerError: { code: 'video_provider_output_missing', category: 'provider', retryable: false, providerBillableState: 'unknown' } };
    const filePath = path.join(this.temporaryDirectory, `${safeName(task?.id || providerTaskId)}.mp4`);
    await this.client.files.download({ file: video, downloadPath: filePath });
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size <= 0) throw providerError('video_provider_download_empty', 'Gemini returned an empty video.', true, 'unknown');
    return {
      providerStatus: 'provider_succeeded',
      output: {
        filePath,
        mimeType: video.mimeType || 'video/mp4',
        durationSeconds: Number(task?.submittedRequest?.durationSeconds || 0),
        hasAudio: task?.submittedRequest?.audioMode === 'generated'
      },
      usage: {
        billingMetric: 'output_second',
        outputSeconds: Number(task?.submittedRequest?.durationSeconds || 0),
        outputCount: 1,
        source: 'locked_provider_request'
      }
    };
  }

  async cleanupOutput(output) {
    if (!output?.filePath) return;
    await fs.rm(output.filePath, { force: true });
  }
}

function dataUrlToImage(value) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\s]+)$/.exec(String(value || ''));
  if (!match) throw providerError('video_reference_invalid', 'The video reference image is invalid.', false, 'not_billable');
  return { mimeType: match[1], imageBytes: match[2].replace(/\s/g, '') };
}

function normalizeProviderOperationError(error) {
  const message = String(error?.message || 'Gemini video generation failed.');
  return {
    code: String(error?.code || 'video_provider_generation_failed'),
    category: 'provider',
    retryable: /internal|unavailable|timeout|rate/i.test(message),
    providerBillableState: 'unknown'
  };
}

function safeName(value) {
  return String(value || 'video').replace(/[^a-zA-Z0-9_-]/g, '_').slice(-100);
}

function providerError(code, message, retryable, providerBillableState) {
  return Object.assign(new Error(message), { code, category: 'provider', retryable, providerBillableState });
}
