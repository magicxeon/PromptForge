import {
  parseEnvironmentBoolean,
  resolveVideoProviderDebugEnabled,
  summarizeVideoPrompt,
  summarizeVideoProviderError,
  writeVideoProviderDebug
} from './videoProviderDebug.js';

const DEFAULT_BASE_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3';
const DEFAULT_TIMEOUT_MS = 180000;
const TERMINAL_FAILURES = new Set(['failed', 'error']);
const TERMINAL_CANCELLED = new Set(['cancelled', 'canceled']);
const TERMINAL_EXPIRED = new Set(['expired']);
const PROCESSING = new Set(['running', 'processing', 'in_progress']);
const QUEUED = new Set(['queued', 'pending', 'submitted', 'created']);
const SUCCEEDED = new Set(['succeeded', 'success', 'completed', 'done']);

export class ModelArkSeedanceProvider {
  constructor({
    apiKey = resolveModelArkApiKey(process.env),
    baseUrl = process.env.MODEL_ARK_BASE_URL || DEFAULT_BASE_URL,
    timeoutMs = process.env.MODEL_ARK_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
    debugEnabled = resolveVideoProviderDebugEnabled(process.env, 'MODEL_ARK_VIDEO_DEBUG'),
    logger = console
  } = {}) {
    this.apiKey = normalizeCredential(apiKey);
    this.baseUrl = String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = positiveNumber(timeoutMs, DEFAULT_TIMEOUT_MS);
    this.fetchImpl = fetchImpl;
    this.debugEnabled = Boolean(debugEnabled);
    this.logger = logger;
  }

  async submit(request) {
    this.#assertReady();
    const response = await this.#request('/contents/generations/tasks', {
      method: 'POST',
      body: JSON.stringify(buildModelArkSeedancePayload(request))
    }, { operation: 'submit', taskId: request.id, correlationId: request.correlationId });
    const providerTaskId = firstString(response?.id, response?.task_id, response?.data?.id, response?.data?.task_id);
    if (!providerTaskId) {
      throw providerError('video_provider_operation_missing', 'ModelArk did not return a video task ID.', true, 'unknown');
    }
    return {
      providerTaskId,
      providerOperationId: providerTaskId,
      providerStatus: normalizeModelArkStatus(response?.status || response?.data?.status, { defaultStatus: 'provider_queued' })
    };
  }

  async poll(providerTaskId, { task } = {}) {
    this.#assertReady();
    const safeTaskId = encodeURIComponent(String(providerTaskId || '').trim());
    if (!safeTaskId) throw providerError('video_provider_task_id_missing', 'ModelArk video task ID is missing.', false, 'not_billable');
    const response = await this.#request(`/contents/generations/tasks/${safeTaskId}`, { method: 'GET' }, {
      operation: 'poll',
      taskId: task?.id,
      correlationId: task?.submittedRequest?.correlationId
    });
    return normalizeModelArkSeedanceTask(response, { task });
  }

  #assertReady() {
    if (!this.apiKey) {
      throw providerError('video_provider_credentials_missing', 'ModelArk video credentials are unavailable.', false, 'not_billable');
    }
    if (typeof this.fetchImpl !== 'function') {
      throw providerError('video_provider_transport_unavailable', 'ModelArk video transport is unavailable.', false, 'not_billable');
    }
  }

  async #request(pathname, init, { operation, taskId = null, correlationId = null }) {
    let response;
    const endpoint = `${this.baseUrl}${pathname}`;
    const startedAt = Date.now();
    this.#debug('request', {
      operation,
      taskId,
      correlationId,
      endpoint,
      method: init.method || 'GET',
      timeoutMs: this.timeoutMs,
      ...summarizeRequestBody(init.body)
    });
    try {
      response = await this.fetchImpl(endpoint, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...init.headers
        },
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (error) {
      this.#debug('transport_error', {
        operation,
        taskId,
        correlationId,
        endpoint,
        durationMs: Date.now() - startedAt,
        ...summarizeVideoProviderError(error)
      });
      throw providerError(
        'video_provider_unreachable',
        `ModelArk video ${operation} request could not be completed.`,
        true,
        operation === 'submit' ? 'not_billable' : 'unknown',
        error
      );
    }

    const payload = await parseJsonResponse(response);
    this.#debug('response', {
      operation,
      taskId,
      correlationId,
      endpoint,
      durationMs: Date.now() - startedAt,
      statusCode: response.status,
      ok: response.ok,
      providerCode: firstString(payload?.error?.code, payload?.code),
      providerMessage: summarizeVideoProviderError({
        message: firstString(payload?.error?.message, payload?.message)
      }).message,
      providerRequestId: extractProviderRequestId(response, payload),
      providerTaskId: firstString(payload?.id, payload?.task_id, payload?.data?.id, payload?.data?.task_id),
      providerStatus: firstString(payload?.status, payload?.data?.status)
    });
    if (!response.ok) throw normalizeModelArkHttpError(response.status, payload, operation);
    return payload;
  }

  #debug(event, details) {
    writeVideoProviderDebug({
      enabled: this.debugEnabled,
      logger: this.logger,
      providerId: 'modelark',
      event,
      details: compactObject(details)
    });
  }
}

export function buildModelArkSeedancePayload(request = {}) {
  const prompt = String(request.prompt || '').trim();
  if (!prompt) throw providerError('video_prompt_required', 'ModelArk video prompt is required.', false, 'not_billable');
  const content = [{ type: 'text', text: prompt }];
  const references = normalizeReferences(request);
  references.forEach(reference => content.push({
    type: 'image_url',
    image_url: { url: reference.url },
    role: reference.role
  }));

  return compactObject({
    model: String(request.modelId || '').trim(),
    content,
    ratio: String(request.aspectRatio || '9:16'),
    resolution: String(request.resolution || '720p'),
    duration: Number(request.durationSeconds),
    generate_audio: request.audioMode === 'generated',
    camera_fixed: request.cameraFixed === true,
    watermark: request.watermark === true,
    seed: Number.isInteger(request.seed) ? request.seed : undefined,
    return_last_frame: request.returnLastFrame === true
  });
}

export function normalizeModelArkSeedanceTask(rawResponse, { task } = {}) {
  const response = rawResponse?.data && typeof rawResponse.data === 'object' ? rawResponse.data : rawResponse;
  const providerStatus = normalizeModelArkStatus(response?.status);
  if (providerStatus === 'failed' || providerStatus === 'cancelled' || providerStatus === 'expired') {
    return {
      providerStatus,
      providerError: normalizeTerminalProviderError(response, providerStatus)
    };
  }
  if (providerStatus !== 'provider_succeeded') return { providerStatus };

  const temporaryProviderUrl = firstString(
    response?.content?.video_url,
    response?.content?.video?.url,
    response?.output?.video_url,
    response?.output?.url,
    response?.video_url,
    response?.url
  );
  if (!temporaryProviderUrl) {
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

  const completionTokens = firstFiniteNumber(
    response?.usage?.completion_tokens,
    rawResponse?.usage?.completion_tokens,
    response?.usage?.output_tokens,
    rawResponse?.usage?.output_tokens
  );
  return {
    providerStatus: 'provider_succeeded',
    output: {
      temporaryProviderUrl,
      mimeType: firstString(response?.content?.mime_type, response?.output?.mime_type, response?.mime_type) || inferVideoMimeType(temporaryProviderUrl),
      durationSeconds: Number(task?.submittedRequest?.durationSeconds || response?.duration || 0),
      width: firstFiniteNumber(response?.content?.width, response?.output?.width),
      height: firstFiniteNumber(response?.content?.height, response?.output?.height),
      fps: firstFiniteNumber(response?.content?.fps, response?.output?.fps),
      hasAudio: task?.submittedRequest?.audioMode === 'generated'
    },
    usage: completionTokens === null ? null : {
      billingMetric: 'completion_token',
      completionTokens,
      outputCount: 1,
      source: 'provider_response'
    }
  };
}

export function resolveModelArkApiKey(env = process.env) {
  return normalizeCredential(env?.['MODEL_ARK_API-KEY'])
    || normalizeCredential(env?.MODEL_ARK_API)
    || normalizeCredential(env?.ARK_API_KEY)
    || null;
}

export { parseEnvironmentBoolean };

function normalizeReferences(request) {
  const references = [];
  if (request.referenceImage) references.push({ url: normalizeImageReference(request.referenceImage), role: 'first_frame' });
  if (request.lastFrameImage) references.push({ url: normalizeImageReference(request.lastFrameImage), role: 'last_frame' });
  if (Array.isArray(request.referenceImages)) {
    request.referenceImages.forEach((value, index) => references.push({
      url: normalizeImageReference(value?.url || value),
      role: String(value?.role || `reference_image_${index + 1}`)
    }));
  }
  return references;
}

function normalizeImageReference(value) {
  const reference = String(value || '').trim();
  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\s]+$/.test(reference)) return reference.replace(/\s/g, '');
  if (/^https:\/\//i.test(reference)) return reference;
  throw providerError('video_reference_invalid', 'ModelArk video reference image is invalid.', false, 'not_billable');
}

function summarizeRequestBody(body) {
  if (typeof body !== 'string' || !body) return {};
  try {
    const payload = JSON.parse(body);
    const content = Array.isArray(payload?.content) ? payload.content : [];
    return compactObject({
      model: firstString(payload?.model),
      ratio: firstString(payload?.ratio),
      resolution: firstString(payload?.resolution),
      durationSeconds: Number.isFinite(Number(payload?.duration)) ? Number(payload.duration) : null,
      generateAudio: payload?.generate_audio === true,
      cameraFixed: payload?.camera_fixed === true,
      watermark: payload?.watermark === true,
      returnLastFrame: payload?.return_last_frame === true,
      contentTypes: content.map(item => firstString(item?.type)).filter(Boolean),
      referenceRoles: content
        .filter(item => item?.type === 'image_url')
        .map(item => firstString(item?.role) || 'first_frame'),
      referenceCount: content.filter(item => item?.type === 'image_url').length,
      ...summarizeVideoPrompt(content.find(item => item?.type === 'text')?.text)
    });
  } catch {
    return { requestBodyStatus: 'unreadable' };
  }
}

function extractProviderRequestId(response, payload) {
  return firstString(
    response?.headers?.get?.('x-request-id'),
    response?.headers?.get?.('x-tt-logid'),
    response?.headers?.get?.('x-bce-request-id'),
    payload?.request_id,
    payload?.requestId,
    payload?.error?.request_id,
    payload?.error?.requestId
  );
}

function normalizeModelArkStatus(value, { defaultStatus = null } = {}) {
  const status = String(value || '').trim().toLowerCase();
  if (!status && defaultStatus) return defaultStatus;
  if (QUEUED.has(status)) return 'provider_queued';
  if (PROCESSING.has(status)) return 'provider_processing';
  if (SUCCEEDED.has(status)) return 'provider_succeeded';
  if (TERMINAL_FAILURES.has(status)) return 'failed';
  if (TERMINAL_CANCELLED.has(status)) return 'cancelled';
  if (TERMINAL_EXPIRED.has(status)) return 'expired';
  return status ? null : defaultStatus;
}

function normalizeTerminalProviderError(response, providerStatus) {
  const message = firstString(response?.error?.message, response?.message, response?.error_message) || `ModelArk video task ${providerStatus}.`;
  return {
    code: firstString(response?.error?.code, response?.code) || `video_provider_${providerStatus}`,
    category: 'provider',
    retryable: /internal|unavailable|timeout|rate|overload/i.test(message),
    providerBillableState: 'unknown'
  };
}

function normalizeModelArkHttpError(status, payload, operation) {
  const message = firstString(payload?.error?.message, payload?.message) || `ModelArk video ${operation} request failed.`;
  const code = firstString(payload?.error?.code, payload?.code) || 'video_provider_request_failed';
  return providerError(code, message, status === 408 || status === 429 || status >= 500, operation === 'submit' ? 'not_billable' : 'unknown');
}

async function parseJsonResponse(response) {
  try { return await response.json(); } catch {
    throw providerError('video_provider_response_invalid', 'ModelArk returned an invalid JSON response.', response.status >= 500, 'unknown');
  }
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''));
}

function inferVideoMimeType(url) {
  return /\.mov(?:$|\?)/i.test(url) ? 'video/quicktime' : 'video/mp4';
}

function firstString(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return null;
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return null;
}

function normalizeCredential(value) {
  const credential = String(value || '').trim();
  return !credential || /your_.*key/i.test(credential) ? null : credential;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function providerError(code, message, retryable, providerBillableState, cause) {
  return Object.assign(new Error(message, cause ? { cause } : undefined), {
    code,
    category: 'provider',
    retryable,
    providerBillableState
  });
}
