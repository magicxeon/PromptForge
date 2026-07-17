import { BaseProvider } from './BaseProvider.js';

const DEFAULT_BASE_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3';
const DEFAULT_TIMEOUT_MS = 180000;
const MAX_REFERENCE_BYTES = 30 * 1024 * 1024;
const SUPPORTED_REFERENCE_MIME_TYPES = new Set([
  'image/bmp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp'
]);

function normalizeBaseUrl(value) {
  const baseUrl = typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_BASE_URL;
  return baseUrl.replace(/\/+$/, '');
}

function extractImageParts(value) {
  const match = typeof value === 'string'
    ? value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is)
    : null;
  return match ? { mimeType: match[1].toLowerCase(), base64: match[2] } : { mimeType: 'image/png', base64: value };
}

function toModelArkImageReference(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const parts = extractImageParts(value);
  if (!parts.base64) throw new Error('Reference image data is empty.');
  if (!SUPPORTED_REFERENCE_MIME_TYPES.has(parts.mimeType)) {
    throw new Error(`Unsupported ModelArk reference image type: ${parts.mimeType}`);
  }

  const estimatedBytes = Math.floor(parts.base64.length * 3 / 4);
  if (estimatedBytes > MAX_REFERENCE_BYTES) {
    throw new Error('ModelArk reference images must not exceed 30 MB each.');
  }
  return `data:${parts.mimeType};base64,${parts.base64}`;
}

function collectReferences(options) {
  return [
    options.resolvedCharacterReferenceImageA,
    options.resolvedCharacterReferenceImageB,
    options.resolvedOutfitReferenceImageFront,
    options.resolvedOutfitReferenceImageBack,
    options.resolvedFaceReferenceImageA,
    options.resolvedFaceReferenceImageB,
    options.resolvedStyleReferenceImageA,
    options.resolvedStyleReferenceImageB
  ].filter(Boolean);
}

function summarizeReference(value) {
  if (typeof value !== 'string') return value;
  if (/^https?:\/\//i.test(value)) return value;
  const parts = extractImageParts(value);
  const estimatedBytes = Math.floor((parts.base64?.length || 0) * 3 / 4);
  return `[base64 omitted: ${parts.mimeType}, ${estimatedBytes} bytes]`;
}

function sanitizePayloadForLogging(payload) {
  const sanitized = { ...payload };
  if (Array.isArray(sanitized.image)) sanitized.image = sanitized.image.map(summarizeReference);
  else if (sanitized.image) sanitized.image = summarizeReference(sanitized.image);
  return sanitized;
}

function extractApiErrorMessage(apiError, status) {
  if (typeof apiError === 'string' && apiError.trim()) return apiError;
  if (apiError && typeof apiError === 'object') {
    const candidates = [
      apiError.message,
      apiError.msg,
      apiError.detail,
      apiError.error_description,
      apiError.reason,
      apiError.error
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate;
      if (candidate && typeof candidate === 'object') {
        const nested = extractApiErrorMessage(candidate, status);
        if (nested && !nested.startsWith('ModelArk request failed')) return nested;
      }
    }
  }
  return `ModelArk request failed with HTTP ${status}.`;
}

function mimeTypeForOutputFormat(outputFormat, model) {
  const normalized = String(outputFormat || '').toLowerCase();
  if (normalized === 'jpeg' || normalized === 'jpg') return 'image/jpeg';
  if (normalized === 'png') return 'image/png';
  if (/seedream-4-(0|5)/.test(model) && !normalized) return 'image/jpeg';
  return 'image/png';
}

function supportsOutputFormatParameter(modelConfig) {
  if (/^seedream-4-(0|5)-/i.test(modelConfig.id || '')) return false;
  if (/^(dola-)?seedream-5-/i.test(modelConfig.id || '')) return true;
  if (typeof modelConfig.capabilities?.supportsOutputFormatParameter === 'boolean') {
    return modelConfig.capabilities.supportsOutputFormatParameter;
  }
  return Array.isArray(modelConfig.capabilities?.outputFormats) && modelConfig.capabilities.outputFormats.length > 1;
}

export class ModelArkSeedreamProvider extends BaseProvider {
  constructor(apiKey, providerConfig = {}) {
    super(apiKey);
    this.providerConfig = providerConfig;
    this.baseUrl = normalizeBaseUrl(process.env[providerConfig.baseUrlEnv] || process.env.MODEL_ARK_BASE_URL);
    this.timeoutMs = Number(process.env.MODEL_ARK_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  }

  async generateImage(prompt, options = {}) {
    if (!this.apiKey) throw this.createError('authentication_failed', 'ModelArk API key is missing.', false);
    if (typeof prompt !== 'string' || !prompt.trim()) throw this.createError('invalid_request', 'Prompt must be a non-empty string.', false);

    const selectedModel = options.submodel || options.modelConfig?.id || this.providerConfig.defaultModel || 'seedream-4-0-250828';
    const modelConfig = options.modelConfig || this.providerConfig.models?.find(entry => entry.id === selectedModel) || {};
    const model = modelConfig.id || selectedModel;
    const maxReferences = Number(modelConfig.capabilities?.maxReferenceImages || 0);
    const references = collectReferences(options);
    if (references.length > maxReferences) {
      throw this.createError('invalid_request', `${model} supports up to ${maxReferences} reference images.`, false);
    }

    const resolution = options.imageResolution || modelConfig.defaults?.resolution || '2K';
    if (Array.isArray(modelConfig.capabilities?.resolutions) && !modelConfig.capabilities.resolutions.includes(resolution)) {
      throw this.createError('invalid_request', `${model} does not support resolution ${resolution}.`, false);
    }

    const canSetOutputFormat = supportsOutputFormatParameter(modelConfig);
    const outputFormat = canSetOutputFormat ? (modelConfig.defaults?.outputFormat || 'png') : (modelConfig.defaults?.outputFormat || null);
    if (canSetOutputFormat && Array.isArray(modelConfig.capabilities?.outputFormats) && !modelConfig.capabilities.outputFormats.includes(outputFormat)) {
      throw this.createError('invalid_request', `${model} does not support output format ${outputFormat}.`, false);
    }

    const responseFormat = modelConfig.defaults?.responseFormat || 'b64_json';
    const payload = {
      model,
      prompt,
      size: resolution,
      response_format: responseFormat,
      stream: false,
      watermark: modelConfig.defaults?.watermark === true
    };
    if (canSetOutputFormat && outputFormat) payload.output_format = outputFormat;

    try {
      const modelArkReferences = references.map(toModelArkImageReference).filter(Boolean);
      if (modelArkReferences.length === 1) payload.image = modelArkReferences[0];
      else if (modelArkReferences.length > 1) payload.image = modelArkReferences;
    } catch (error) {
      throw this.createError('invalid_request', error.message, false);
    }

    const endpoint = `${this.baseUrl}/images/generations`;
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (error) {
      const code = error.name === 'TimeoutError' || error.name === 'AbortError' ? 'timeout' : 'provider_error';
      throw this.createError(code, `Unable to reach ModelArk: ${error.message}`, true);
    }

    const requestId = response.headers?.get?.('x-request-id') || response.headers?.get?.('request-id') || null;
    let data;
    try {
      data = await response.json();
    } catch {
      const error = this.createError('provider_error', `ModelArk returned an invalid JSON response (HTTP ${response.status}).`, response.status >= 500);
      error.requestId = requestId;
      throw error;
    }

    if (!response.ok || data.error) {
      console.error('[ModelArk] Image request failed:', JSON.stringify({
        endpoint,
        status: response.status,
        requestId,
        payload: sanitizePayloadForLogging(payload),
        response: data
      }, null, 2));
      throw this.normalizeApiError(data.error || data, response.status, requestId);
    }

    const image = data?.data?.[0];
    if (!image) {
      const error = this.createError('provider_error', 'ModelArk returned no image data.', false);
      error.requestId = requestId;
      throw error;
    }

    let base64 = image.b64_json || null;
    let downloadedMimeType = null;
    if (!base64 && image.url) {
      const downloaded = await this.downloadImageUrl(image.url, requestId);
      base64 = downloaded.base64;
      downloadedMimeType = downloaded.mimeType;
    }
    if (!base64) {
      const error = this.createError('provider_error', 'ModelArk returned no base64 image data or downloadable URL.', false);
      error.requestId = requestId;
      throw error;
    }

    return {
      base64,
      mimeType: image.mime_type || downloadedMimeType || mimeTypeForOutputFormat(outputFormat, model),
      outputFormat,
      usage: data.usage || null,
      providerMetadata: {
        resolvedModel: data.model || image.model || model,
        requestId,
        responseSize: image.size || null,
        responseFormat,
        sourceUrlReturned: Boolean(image.url)
      }
    };
  }

  async downloadImageUrl(url, requestId) {
    let response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (error) {
      const downloadError = this.createError('provider_error', `Unable to download ModelArk image URL: ${error.message}`, true);
      downloadError.requestId = requestId;
      throw downloadError;
    }
    if (!response.ok) {
      const downloadError = this.createError('provider_error', `Unable to download ModelArk image URL (HTTP ${response.status}).`, response.status >= 500);
      downloadError.requestId = requestId;
      throw downloadError;
    }
    const arrayBuffer = await response.arrayBuffer();
    return {
      base64: Buffer.from(arrayBuffer).toString('base64'),
      mimeType: response.headers?.get?.('content-type')?.split(';')[0]?.toLowerCase() || null
    };
  }

  normalizeApiError(apiError, status, requestId) {
    const message = extractApiErrorMessage(apiError, status);
    const classifier = [
      message,
      apiError?.code,
      apiError?.type,
      apiError?.param
    ].filter(Boolean).join(' ');
    let code = 'provider_error';
    let retryable = status === 429 || status >= 500;
    if (/moderation|safety|policy|sensitive|content/i.test(classifier)) {
      code = 'moderation_blocked';
      retryable = false;
    } else if (status === 401 || status === 403) code = 'authentication_failed';
    else if (status === 429) code = 'rate_limited';
    else if (status === 400 || status === 404 || status === 422) code = 'invalid_request';
    const error = this.createError(code, message, retryable);
    error.requestId = requestId;
    error.type = apiError?.type || apiError?.code || null;
    return error;
  }

  createError(code, message, retryable) {
    const error = new Error(message);
    error.provider = 'modelark';
    error.code = code;
    error.retryable = retryable === true;
    error.safetyViolations = [];
    return error;
  }
}
