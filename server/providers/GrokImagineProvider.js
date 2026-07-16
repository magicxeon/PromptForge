import { BaseProvider } from './BaseProvider.js';

const XAI_BASE_URL = 'https://api.x.ai/v1';
const MAX_REFERENCE_BYTES = 20 * 1024 * 1024;
const SUPPORTED_REFERENCE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function extractImageParts(value) {
  const match = typeof value === 'string' ? value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is) : null;
  return match ? { mimeType: match[1].toLowerCase(), base64: match[2] } : { mimeType: 'image/png', base64: value };
}

function toDataUrl(value) {
  const parts = extractImageParts(value);
  if (!SUPPORTED_REFERENCE_MIME_TYPES.has(parts.mimeType)) {
    throw new Error(`Unsupported xAI reference image type: ${parts.mimeType}`);
  }
  const estimatedBytes = Math.floor((parts.base64?.length || 0) * 3 / 4);
  if (estimatedBytes > MAX_REFERENCE_BYTES) {
    throw new Error('xAI reference images must not exceed 20 MiB each.');
  }
  return `data:${parts.mimeType};base64,${parts.base64}`;
}

function toImageUrlReference(value) {
  return {
    type: 'image_url',
    url: toDataUrl(value)
  };
}

function summarizeDataUrl(value) {
  const parts = extractImageParts(value);
  if (!parts.base64) return value;
  const estimatedBytes = Math.floor(parts.base64.length * 3 / 4);
  return `[base64 omitted: ${parts.mimeType}, ${estimatedBytes} bytes]`;
}

function sanitizePayloadForLogging(payload) {
  const sanitized = { ...payload };
  if (sanitized.image?.url) {
    sanitized.image = { ...sanitized.image, url: summarizeDataUrl(sanitized.image.url) };
  }
  if (Array.isArray(sanitized.images)) {
    sanitized.images = sanitized.images.map(image => ({
      ...image,
      url: summarizeDataUrl(image.url)
    }));
  }
  return sanitized;
}

function extractApiErrorMessage(apiError, status) {
  if (typeof apiError === 'string' && apiError.trim()) return apiError;
  if (Array.isArray(apiError)) {
    const messages = apiError.map(entry => extractApiErrorMessage(entry, status)).filter(Boolean);
    if (messages.length) return messages.join('; ');
  }
  if (apiError && typeof apiError === 'object') {
    const candidates = [
      apiError.message,
      apiError.detail,
      apiError.error_description,
      apiError.reason,
      apiError.error
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate;
      if (candidate && typeof candidate === 'object') {
        const nested = extractApiErrorMessage(candidate, status);
        if (nested && !nested.startsWith('xAI request failed')) return nested;
      }
    }
  }
  return `xAI request failed with HTTP ${status}.`;
}

export class GrokImagineProvider extends BaseProvider {
  constructor(apiKey, providerConfig = {}) {
    super(apiKey);
    this.providerConfig = providerConfig;
  }

  async generateImage(prompt, options = {}) {
    if (!this.apiKey) throw this.createError('authentication_failed', 'xAI API key is missing.', false);
    if (typeof prompt !== 'string' || !prompt.trim()) throw this.createError('invalid_request', 'Prompt must be a non-empty string.', false);

    const model = options.submodel || this.providerConfig.defaultModel || 'grok-imagine-image-quality';
    const modelConfig = options.modelConfig || this.providerConfig.models?.find(entry => entry.id === model) || {};
    const references = [
      options.resolvedCharacterReferenceImageA,
      options.resolvedCharacterReferenceImageB,
      options.resolvedFaceReferenceImageA,
      options.resolvedFaceReferenceImageB,
      options.resolvedStyleReferenceImageA,
      options.resolvedStyleReferenceImageB
    ].filter(Boolean);
    const maxReferences = Number(modelConfig.capabilities?.maxReferenceImages || 0);
    if (references.length > maxReferences) {
      throw this.createError('invalid_request', `${model} supports up to ${maxReferences} unique reference images.`, false);
    }

    const aspectRatio = modelConfig.aspectRatioMap?.[options.aspectRatio || '1:1'];
    if (!aspectRatio) throw this.createError('invalid_request', `${model} does not support aspect ratio ${options.aspectRatio || '1:1'}.`, false);
    const resolution = options.imageResolution || modelConfig.defaults?.resolution || '1k';
    if (!modelConfig.capabilities?.resolutions?.includes(resolution)) {
      throw this.createError('invalid_request', `${model} does not support resolution ${resolution}.`, false);
    }

    const payload = {
      model,
      prompt,
      n: 1,
      aspect_ratio: aspectRatio,
      resolution,
      response_format: 'b64_json'
    };
    let endpoint = `${XAI_BASE_URL}/images/generations`;
    try {
      if (references.length === 1) {
        endpoint = `${XAI_BASE_URL}/images/edits`;
        payload.image = toImageUrlReference(references[0]);
      } else if (references.length > 1) {
        endpoint = `${XAI_BASE_URL}/images/edits`;
        payload.images = references.map(toImageUrlReference);
      }
    } catch (error) {
      throw this.createError('invalid_request', error.message, false);
    }

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(Number(process.env.XAI_API_TIMEOUT_MS || 120000))
      });
    } catch (error) {
      const code = error.name === 'TimeoutError' || error.name === 'AbortError' ? 'timeout' : 'provider_error';
      throw this.createError(code, `Unable to reach xAI: ${error.message}`, true);
    }

    const requestId = response.headers?.get?.('x-request-id') || response.headers?.get?.('request-id') || null;
    let data;
    try {
      data = await response.json();
    } catch {
      const error = this.createError('provider_error', `xAI returned an invalid JSON response (HTTP ${response.status}).`, response.status >= 500);
      error.requestId = requestId;
      throw error;
    }

    if (!response.ok || data.error) {
      console.error('[xAI] Image request failed:', JSON.stringify({
        endpoint,
        status: response.status,
        requestId,
        payload: sanitizePayloadForLogging(payload),
        response: data
      }, null, 2));
      throw this.normalizeApiError(data.error || data, response.status, requestId);
    }
    const image = data?.data?.[0];
    if (data.respect_moderation === false || image?.respect_moderation === false) {
      const error = this.createError('moderation_blocked', 'The image did not pass the xAI safety check.', false);
      error.requestId = requestId;
      throw error;
    }
    if (!image?.b64_json) {
      const error = this.createError('provider_error', 'xAI returned no base64 image data.', false);
      error.requestId = requestId;
      throw error;
    }

    return {
      base64: image.b64_json,
      mimeType: image.mime_type || 'image/jpeg',
      usage: data.usage || null,
      providerMetadata: {
        revisedPrompt: image.revised_prompt || null,
        resolvedModel: data.model || image.model || model,
        requestId
      }
    };
  }

  normalizeApiError(apiError, status, requestId) {
    const message = extractApiErrorMessage(apiError, status);
    let code = 'provider_error';
    let retryable = status === 429 || status >= 500;
    if (/moderation|safety|policy/i.test(message)) {
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
    error.provider = 'xai';
    error.code = code;
    error.retryable = retryable === true;
    error.safetyViolations = [];
    return error;
  }
}
