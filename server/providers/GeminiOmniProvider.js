import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  resolveVideoProviderDebugEnabled,
  summarizeVideoPrompt,
  summarizeVideoProviderError,
  writeVideoProviderDebug
} from './videoProviderDebug.js';

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_TIMEOUT_MS = 180000;
const TERMINAL_FAILURES = new Set(['failed', 'cancelled', 'expired']);

export class GeminiOmniProvider {
  constructor({
    apiKey = process.env.GEMINI_API_KEY,
    fetchImpl = globalThis.fetch,
    temporaryDirectory = os.tmpdir(),
    environment = process.env,
    debugEnabled = resolveVideoProviderDebugEnabled(process.env, 'GEMINI_OMNI_VIDEO_DEBUG'),
    logger = console
  } = {}) {
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.temporaryDirectory = temporaryDirectory;
    this.environment = environment;
    this.debugEnabled = Boolean(debugEnabled);
    this.logger = logger;
  }

  async submit(request) {
    this.#assertConfigured();
    const payload = buildGeminiOmniRequest(request);
    const startedAt = Date.now();
    this.#debug('request', summarizeOmniRequest(request, payload));

    let response;
    try {
      response = await this.#request('/interactions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (error) {
      this.#debug('submit_error', {
        durationMs: Date.now() - startedAt,
        ...summarizeVideoProviderError(error)
      });
      throw normalizeTransportError(error, 'interaction_failed', 'not_billable');
    }

    const data = await parseJsonResponse(response, 'Gemini Omni submit');
    if (!response.ok || data?.error) throw normalizeApiError(data?.error || data, response.status, 'not_billable');
    if (!data?.id) {
      throw providerError('video_provider_interaction_missing', 'Gemini Omni did not return an Interaction ID.', false, 'unknown');
    }
    this.#debug('response', {
      durationMs: Date.now() - startedAt,
      interactionId: data.id,
      status: normalizeStatus(data.status),
      hasVideo: Boolean(findVideo(data))
    });
    return {
      providerTaskId: data.id,
      providerOperationId: data.id,
      providerStatus: normalizeStatus(data.status) === 'completed' ? 'provider_processing' : 'provider_queued'
    };
  }

  async poll(providerTaskId, { task } = {}) {
    this.#assertConfigured();
    const startedAt = Date.now();
    this.#debug('poll_request', { interactionId: providerTaskId });
    let response;
    try {
      response = await this.#request(`/interactions/${encodeURIComponent(providerTaskId)}`);
    } catch (error) {
      this.#debug('poll_error', {
        interactionId: providerTaskId,
        durationMs: Date.now() - startedAt,
        ...summarizeVideoProviderError(error)
      });
      throw normalizeTransportError(error, 'interaction_poll_failed', 'unknown');
    }
    const data = await parseJsonResponse(response, 'Gemini Omni poll');
    if (!response.ok || data?.error) throw normalizeApiError(data?.error || data, response.status, 'unknown');

    const status = normalizeStatus(data.status);
    this.#debug('poll_response', {
      interactionId: providerTaskId,
      durationMs: Date.now() - startedAt,
      status,
      hasVideo: Boolean(findVideo(data))
    });
    if (TERMINAL_FAILURES.has(status)) {
      return {
        providerStatus: status === 'cancelled' ? 'cancelled' : 'failed',
        providerError: normalizeOperationError(data.error, status)
      };
    }
    const video = findVideo(data);
    if (!video) {
      if (status === 'completed') {
        return {
          providerStatus: 'failed',
          providerError: {
            code: 'video_provider_output_missing',
            category: 'provider',
            retryable: false,
            providerBillableState: 'unknown'
          }
        };
      }
      return { providerStatus: 'provider_processing' };
    }

    const output = await this.#materializeVideo(video, task, providerTaskId);
    if (!output) return { providerStatus: 'provider_processing' };
    return {
      providerStatus: 'provider_succeeded',
      output,
      usage: {
        billingMetric: 'output_second',
        outputSeconds: Number(task?.submittedRequest?.durationSeconds || 0),
        outputCount: 1,
        source: 'gemini_interaction'
      }
    };
  }

  async cleanupOutput(output) {
    if (output?.filePath) await fs.rm(output.filePath, { force: true });
  }

  async #materializeVideo(video, task, interactionId) {
    const filePath = path.join(this.temporaryDirectory, `${safeName(task?.id || interactionId)}.mp4`);
    if (typeof video.data === 'string' && video.data) {
      const bytes = Buffer.from(video.data, 'base64');
      if (!bytes.length) throw providerError('video_provider_output_missing', 'Gemini Omni returned an empty video.', false, 'unknown');
      await fs.writeFile(filePath, bytes);
      return createOutput(filePath, video, task);
    }
    if (!video.uri) throw providerError('video_provider_output_missing', 'Gemini Omni returned no downloadable video.', false, 'unknown');

    const fileId = extractGoogleFileId(video.uri);
    if (!fileId) throw providerError('video_provider_output_uri_invalid', 'Gemini Omni returned an invalid video URI.', false, 'unknown');
    const fileResponse = await this.#request(`/files/${encodeURIComponent(fileId)}`);
    const fileInfo = await parseJsonResponse(fileResponse, 'Gemini Omni file');
    if (!fileResponse.ok || fileInfo?.error) throw normalizeApiError(fileInfo?.error || fileInfo, fileResponse.status, 'unknown');
    const fileState = normalizeStatus(fileInfo.state?.name || fileInfo.state);
    if (fileState === 'failed') throw providerError('video_provider_file_processing_failed', 'Gemini Omni video processing failed.', false, 'unknown');
    if (fileState !== 'active') return null;

    const download = await this.#request(`/files/${encodeURIComponent(fileId)}:download?alt=media`);
    if (!download.ok) throw providerError('video_provider_output_download_failed', `Gemini Omni download failed with HTTP ${download.status}.`, false, 'unknown');
    const bytes = Buffer.from(await download.arrayBuffer());
    if (!bytes.length) throw providerError('video_provider_output_missing', 'Gemini Omni returned an empty video.', false, 'unknown');
    await fs.writeFile(filePath, bytes);
    return createOutput(filePath, video, task);
  }

  async #request(resource, init = {}) {
    return this.fetchImpl(`${resolveBaseUrl(this.environment)}${resource}`, {
      ...init,
      headers: {
        'x-goog-api-key': this.apiKey,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers
      },
      signal: AbortSignal.timeout(resolveTimeout(this.environment))
    });
  }

  #assertConfigured() {
    if (!this.apiKey) {
      throw providerError('video_provider_credentials_missing', 'Gemini Omni credentials are unavailable.', false, 'not_billable');
    }
  }

  #debug(event, details) {
    writeVideoProviderDebug({
      enabled: this.debugEnabled,
      logger: this.logger,
      providerId: 'gemini-omni',
      event,
      details
    });
  }
}

export function buildGeminiOmniRequest(request = {}) {
  const task = resolveOmniTask(request);
  const sourcePrompt = String(request.prompt || '').trim();
  if (!sourcePrompt) throw providerError('video_prompt_required', 'Gemini Omni requires a video prompt.', false, 'not_billable');
  const prompt = compileTimedPrompt(sourcePrompt, request.durationSeconds);
  const input = request.referenceImage
    ? [toImageInput(request.referenceImage), { type: 'text', text: prompt }]
    : prompt;
  return {
    model: request.modelId || 'gemini-omni-flash-preview',
    input,
    response_format: {
      type: 'video',
      aspect_ratio: request.aspectRatio,
      delivery: 'uri'
    },
    generation_config: {
      video_config: { task }
    },
    background: true,
    store: true,
    stream: false
  };
}

function compileTimedPrompt(prompt, durationSeconds) {
  const duration = Number(durationSeconds);
  if (!Number.isFinite(duration) || duration <= 0) return prompt;
  return `[Total output duration: exactly ${duration} seconds.]\n${prompt}`;
}

function resolveOmniTask(request) {
  if (request.operation === 'text_to_video' && !request.referenceImage) return 'text_to_video';
  if (request.operation === 'image_to_video' && request.referenceImage) return 'image_to_video';
  if (request.operation === 'character_to_video' && request.referenceImage) return 'reference_to_video';
  throw providerError('video_model_operation_not_supported', 'Gemini Omni does not support this prepared video operation.', false, 'not_billable');
}

function toImageInput(value) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\s]+)$/.exec(String(value || ''));
  if (!match) throw providerError('video_reference_invalid', 'The Gemini Omni reference image is invalid.', false, 'not_billable');
  return { type: 'image', mime_type: match[1], data: match[2].replace(/\s/g, '') };
}

function findVideo(data) {
  if (data?.output_video?.data || data?.output_video?.uri) return data.output_video;
  for (const step of Array.isArray(data?.steps) ? data.steps : []) {
    if (step?.type !== 'model_output') continue;
    const video = (Array.isArray(step.content) ? step.content : []).find(item => item?.type === 'video' && (item.data || item.uri));
    if (video) return video;
  }
  return null;
}

function createOutput(filePath, video, task) {
  return {
    filePath,
    mimeType: video.mime_type || video.mimeType || 'video/mp4',
    durationSeconds: Number(task?.submittedRequest?.durationSeconds || 0),
    hasAudio: task?.submittedRequest?.audioMode === 'generated'
  };
}

function normalizeStatus(value) {
  return String(value || 'processing').trim().toLowerCase();
}

async function parseJsonResponse(response, operation) {
  try {
    return await response.json();
  } catch {
    throw providerError('video_provider_response_invalid', `${operation} returned invalid JSON.`, false, 'unknown');
  }
}

function normalizeApiError(value, status, billableState) {
  const message = String(value?.message || value?.detail || `Gemini Omni request failed with HTTP ${status}.`);
  let code = String(value?.code || 'video_provider_interaction_failed');
  if (status === 401 || status === 403) code = 'video_provider_credentials_invalid';
  else if (status === 429) code = 'video_provider_rate_limited';
  else if ([400, 404, 422].includes(status)) code = 'video_provider_request_invalid';
  return providerError(code, message, status === 429 || status >= 500, billableState);
}

function normalizeTransportError(error, code, billableState) {
  return providerError(
    `video_provider_${code}`,
    String(error?.message || 'Gemini Omni transport failed.'),
    true,
    billableState,
    error
  );
}

function normalizeOperationError(error, status) {
  return {
    code: String(error?.code || `video_provider_${status}`),
    category: 'provider',
    retryable: false,
    providerBillableState: 'unknown'
  };
}

function extractGoogleFileId(uri) {
  const match = String(uri || '').match(/\/files\/([^/:?]+)/);
  return match?.[1] || null;
}

function summarizeOmniRequest(request, payload) {
  return {
    taskId: String(request.id || ''),
    correlationId: String(request.correlationId || ''),
    estimateId: String(request.estimateId || ''),
    model: String(payload.model || ''),
    operation: String(request.operation || ''),
    omniTask: payload.generation_config.video_config.task,
    aspectRatio: String(request.aspectRatio || ''),
    delivery: payload.response_format.delivery,
    referenceCount: request.referenceImage ? 1 : 0,
    ...summarizeVideoPrompt(request.prompt)
  };
}

function resolveBaseUrl(environment) {
  return String(environment.GEMINI_OMNI_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
}

function resolveTimeout(environment) {
  const parsed = Number(environment.GEMINI_OMNI_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(parsed) ? Math.min(300000, Math.max(1000, Math.round(parsed))) : DEFAULT_TIMEOUT_MS;
}

function safeName(value) {
  return String(value || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, '_').slice(-100);
}

function providerError(code, message, retryable, providerBillableState, cause) {
  return Object.assign(new Error(message, cause ? { cause } : undefined), {
    code,
    category: 'provider',
    retryable: retryable === true,
    providerBillableState
  });
}
