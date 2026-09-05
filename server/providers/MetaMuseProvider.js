import crypto from 'node:crypto';
import sharp from 'sharp';
import { BaseProvider } from './BaseProvider.js';
import { getResolvedReferenceImages } from './resolvedReferenceImages.js';

const DEFAULT_BASE_URL = 'https://api.meta.ai/v1';
const DEFAULT_TIMEOUT_MS = 120000;
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
const OUTPUT_MIME_TYPES = { webp: 'image/webp', png: 'image/png', jpeg: 'image/jpeg' };

export class MetaMuseProvider extends BaseProvider {
  constructor(apiKey, providerConfig = {}, {
    fetchImpl = globalThis.fetch,
    environment = process.env,
    logger = console
  } = {}) {
    super(apiKey);
    this.providerConfig = providerConfig;
    this.fetchImpl = fetchImpl;
    this.environment = environment;
    this.logger = logger;
  }

  async generateImage(prompt, options = {}) {
    if (!this.apiKey) throw providerError('authentication_failed', 'Meta Muse API key is missing.', false);
    const normalizedPrompt = String(prompt || '').trim();
    if (!normalizedPrompt) throw providerError('invalid_request', 'Prompt must be a non-empty string.', false);

    const model = options.submodel || this.providerConfig.defaultModel || 'muse-image-1.0';
    const references = getResolvedReferenceImages(options);
    if (references.length > 0) {
      throw providerError('invalid_request', 'Meta Muse reference images are not qualified.', false);
    }
    if (Number(options.outputCount || 1) !== 1) {
      throw providerError('invalid_request', 'Meta Muse provider requests support one image per Generation Job.', false);
    }

    const modelConfig = this.providerConfig.models?.find(item => item.id === model);
    const outputFormat = modelConfig?.defaults?.outputFormat || 'webp';
    if (!OUTPUT_MIME_TYPES[outputFormat]) throw providerError('invalid_request', 'Unsupported Muse output format.', false);
    const size = options.aspectRatio ? modelConfig?.aspectRatioSizes?.[options.aspectRatio] : null;
    if (options.aspectRatio && !size) throw providerError('invalid_request', 'Unsupported Muse aspect ratio.', false);
    const payload = {
      model, prompt: normalizedPrompt, n: 1,
      response_format: 'b64_json', output_format: outputFormat,
      ...(size ? { size } : {})
    };
    const endpoint = `${resolveBaseUrl(this.environment, this.providerConfig)}/images/generations`;
    const startedAt = Date.now();
    this.#debug('request', {
      model,
      promptLength: normalizedPrompt.length,
      promptFingerprint: fingerprint(normalizedPrompt)
    });

    let response;
    try {
      response = await this.fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(resolveTimeout(this.environment))
      });
    } catch (error) {
      const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      this.#debug('transport_error', {
        durationMs: Date.now() - startedAt,
        errorName: String(error?.name || 'Error'),
        message: String(error?.message || 'Meta Muse request failed.')
      });
      throw providerError(timeout ? 'timeout' : 'provider_error', `Unable to reach Meta Muse: ${error.message}`, false);
    }

    const requestId = response.headers?.get?.('x-request-id')
      || response.headers?.get?.('request-id')
      || response.headers?.get?.('x-fb-trace-id')
      || null;
    let data;
    try {
      data = await response.json();
    } catch {
      throw withRequestId(
        providerError('provider_error', `Meta Muse returned invalid JSON (HTTP ${response.status}).`, false),
        requestId
      );
    }

    if (!response.ok || data?.error) {
      const error = normalizeApiError(data?.error || data, response.status);
      this.#debug('response_error', {
        durationMs: Date.now() - startedAt,
        status: response.status,
        requestId,
        code: error.code
      });
      throw withRequestId(error, requestId);
    }

    const image = data?.data?.[0];
    if (!image?.b64_json || typeof image.b64_json !== 'string' || data.data.length !== 1) {
      throw withRequestId(
        providerError('provider_response_invalid', 'Meta Muse returned an unsupported image response.', false),
        requestId
      );
    }
    let mimeType;
    let bytes;
    try {
      const decoded = decodeImage(image.b64_json);
      const metadata = await sharp(decoded, { limitInputPixels: 40_000_000 }).metadata();
      mimeType = OUTPUT_MIME_TYPES[metadata.format];
      const declaredMime = data.output_format !== undefined
        ? OUTPUT_MIME_TYPES[data.output_format]
        : image.mime_type || image.mimeType || mimeType;
      if (!mimeType || !metadata.width || !metadata.height || (metadata.pages || 1) !== 1 || declaredMime !== mimeType) {
        throw new Error('Image encoding does not match the response metadata.');
      }
      bytes = decoded.length;
    } catch {
      throw withRequestId(providerError('provider_response_invalid', 'Meta Muse returned invalid or unsupported image bytes.', false), requestId);
    }

    this.#debug('response', {
      durationMs: Date.now() - startedAt,
      status: response.status,
      requestId,
      outputMimeType: mimeType,
      outputBytes: bytes
    });
    return {
      base64: image.b64_json,
      mimeType,
      usage: data.usage || null,
      providerMetadata: {
        requestId,
        resolvedModel: data.model || model
      }
    };
  }

  #debug(event, details) {
    if (String(this.environment.META_MUSE_DEBUG || '').toLowerCase() !== 'true') return;
    this.logger.info?.(`[ImageProvider][meta-muse][Debug] ${JSON.stringify({ event, ...details })}`);
  }
}

function resolveBaseUrl(environment, providerConfig) {
  const envName = providerConfig.baseUrlEnv || 'META_MUSE_BASE_URL';
  return String(environment[envName] || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
}

function resolveTimeout(environment) {
  const parsed = Number(environment.META_MUSE_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(parsed) ? Math.min(300000, Math.max(1000, Math.round(parsed))) : DEFAULT_TIMEOUT_MS;
}

function normalizeApiError(value, status) {
  const message = String(value?.message || value?.detail || value?.error_description || `Meta Muse request failed with HTTP ${status}.`);
  if (/moderation|safety|policy/i.test(message)) return providerError('moderation_blocked', message, false);
  if (status === 401 || status === 403) return providerError('authentication_failed', message, false);
  if (status === 429) return providerError('rate_limited', message, false);
  if ([400, 404, 422].includes(status)) return providerError('invalid_request', message, false);
  return providerError('provider_error', message, false);
}

function decodeImage(value) {
  if (value.length > Math.ceil(MAX_OUTPUT_BYTES / 3) * 4 || value.length % 4 !== 0
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error('Invalid Base64 image.');
  const bytes = Buffer.from(value, 'base64');
  if (!bytes.length || bytes.length > MAX_OUTPUT_BYTES) throw new Error('Invalid image size.');
  return bytes;
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function withRequestId(error, requestId) {
  error.requestId = requestId;
  return error;
}

function providerError(code, message, retryable) {
  return Object.assign(new Error(message), {
    provider: 'meta-muse',
    code,
    retryable: retryable === true,
    safetyViolations: []
  });
}
