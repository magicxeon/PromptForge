import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GenerateVideosOperation, GoogleGenAI } from '@google/genai';
import {
  resolveVideoProviderDebugEnabled,
  summarizeVideoPrompt,
  summarizeVideoProviderError,
  writeVideoProviderDebug
} from './videoProviderDebug.js';

export class GeminiVeoProvider {
  constructor({
    apiKey = process.env.GEMINI_API_KEY,
    client = null,
    temporaryDirectory = os.tmpdir(),
    debugEnabled = resolveVideoProviderDebugEnabled(process.env, 'GEMINI_VIDEO_DEBUG'),
    logger = console
  } = {}) {
    this.client = client || (apiKey ? new GoogleGenAI({ apiKey }) : null);
    this.temporaryDirectory = temporaryDirectory;
    this.debugEnabled = Boolean(debugEnabled);
    this.logger = logger;
  }

  async submit(request) {
    if (!this.client) throw providerError('video_provider_credentials_missing', 'Gemini video credentials are unavailable.', false, 'not_billable');
    const parameters = buildGeminiVeoRequest(request);
    const startedAt = Date.now();
    this.#debug('request', summarizeGeminiRequest(request));
    let operation;
    try {
      operation = await this.client.models.generateVideos(parameters);
    } catch (error) {
      this.#debug('submit_error', {
        durationMs: Date.now() - startedAt,
        ...summarizeVideoProviderError(error)
      });
      throw normalizeGeminiTransportError(error, 'submit');
    }
    this.#debug('response', {
      durationMs: Date.now() - startedAt,
      providerOperationId: operation?.name,
      done: operation?.done === true,
      hasError: Boolean(operation?.error)
    });
    if (!operation?.name) throw providerError('video_provider_operation_missing', 'Gemini did not return a video operation.', true, 'unknown');
    return { providerTaskId: operation.name, providerOperationId: operation.name, providerStatus: operation.done ? 'provider_processing' : 'provider_queued' };
  }

  async poll(providerTaskId, { task } = {}) {
    if (!this.client) throw providerError('video_provider_credentials_missing', 'Gemini video credentials are unavailable.', false, 'not_billable');
    const startedAt = Date.now();
    this.#debug('poll_request', { providerOperationId: providerTaskId });
    let operation;
    try {
      operation = await this.client.operations.getVideosOperation({
        operation: restoreGenerateVideosOperation(providerTaskId)
      });
    } catch (error) {
      this.#debug('poll_error', {
        providerOperationId: providerTaskId,
        durationMs: Date.now() - startedAt,
        ...summarizeVideoProviderError(error)
      });
      throw normalizeGeminiTransportError(error, 'poll');
    }
    this.#debug('poll_response', {
      providerOperationId: providerTaskId,
      durationMs: Date.now() - startedAt,
      done: operation?.done === true,
      hasError: Boolean(operation?.error),
      generatedVideoCount: operation?.response?.generatedVideos?.length || 0,
      filteredCount: operation?.response?.raiMediaFilteredCount || 0,
      filteredReasons: operation?.response?.raiMediaFilteredReasons || []
    });
    if (!operation.done) return { providerStatus: 'provider_processing' };
    if (operation.error) {
      return { providerStatus: 'failed', providerError: normalizeProviderOperationError(operation.error) };
    }
    const video = operation.response?.generatedVideos?.[0]?.video;
    if (!video) return { providerStatus: 'failed', providerError: { code: 'video_provider_output_missing', category: 'provider', retryable: false, providerBillableState: 'unknown' } };
    const filePath = path.join(this.temporaryDirectory, `${safeName(task?.id || providerTaskId)}.mp4`);
    const downloadStartedAt = Date.now();
    this.#debug('download_request', {
      providerOperationId: providerTaskId,
      mimeType: video.mimeType || 'video/mp4',
      hasUri: Boolean(video.uri)
    });
    try {
      await this.client.files.download({ file: video, downloadPath: filePath });
    } catch (error) {
      this.#debug('download_error', {
        providerOperationId: providerTaskId,
        durationMs: Date.now() - downloadStartedAt,
        ...summarizeVideoProviderError(error)
      });
      throw normalizeGeminiTransportError(error, 'download');
    }
    const stat = await fs.stat(filePath);
    this.#debug('download_response', {
      providerOperationId: providerTaskId,
      durationMs: Date.now() - downloadStartedAt,
      bytes: stat.size
    });
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

  #debug(event, details) {
    writeVideoProviderDebug({
      enabled: this.debugEnabled,
      logger: this.logger,
      providerId: 'gemini',
      event,
      details
    });
  }

  async cleanupOutput(output) {
    if (!output?.filePath) return;
    await fs.rm(output.filePath, { force: true });
  }
}

export function buildGeminiVeoRequest(request = {}) {
  const source = {
    prompt: String(request.prompt || '').trim(),
    ...(request.referenceImage ? { image: dataUrlToImage(request.referenceImage) } : {})
  };
  return {
    model: request.modelId,
    source,
    config: {
      numberOfVideos: 1,
      durationSeconds: Number(request.durationSeconds),
      aspectRatio: request.aspectRatio,
      resolution: request.resolution
    }
  };
}

export function restoreGenerateVideosOperation(providerTaskId) {
  const operation = new GenerateVideosOperation();
  operation.name = String(providerTaskId || '').trim();
  return operation;
}

function summarizeGeminiRequest(request) {
  return {
    taskId: String(request.id || ''),
    correlationId: String(request.correlationId || ''),
    estimateId: String(request.estimateId || ''),
    model: String(request.modelId || ''),
    operation: String(request.operation || ''),
    aspectRatio: String(request.aspectRatio || ''),
    resolution: String(request.resolution || ''),
    durationSeconds: Number(request.durationSeconds),
    audioMode: String(request.audioMode || ''),
    nativeAudioExpected: request.audioMode === 'generated',
    providerAudioControl: 'native_audio_no_request_field',
    referenceCount: request.referenceImage ? 1 : 0,
    sourceFields: request.referenceImage ? ['prompt', 'image'] : ['prompt'],
    ...summarizeVideoPrompt(request.prompt)
  };
}

function normalizeGeminiTransportError(error, operation) {
  const code = String(error?.code || error?.status || `video_provider_${operation}_failed`);
  const message = String(error?.message || `Gemini video ${operation} failed.`);
  return providerError(
    code,
    message,
    /internal|unavailable|timeout|rate|overload/i.test(message),
    operation === 'submit' ? 'not_billable' : 'unknown',
    error
  );
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

function providerError(code, message, retryable, providerBillableState, cause) {
  return Object.assign(new Error(message, cause ? { cause } : undefined), { code, category: 'provider', retryable, providerBillableState });
}
