import { GeminiCinematicTextProvider } from '../../providers/GeminiCinematicTextProvider.js';
import { OpenAITextProvider } from '../../providers/OpenAITextProvider.js';

const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_PROVIDER_CODES = new Set([
  'insufficient_quota',
  'rate_limit_exceeded',
  'server_error'
]);

export class CinematicTextProviderRouter {
  constructor(policy, {
    primaryProviderFactory = apiKey => new OpenAITextProvider(apiKey),
    fallbackProviderFactory = apiKey => new GeminiCinematicTextProvider(apiKey)
  } = {}) {
    this.policy = policy;
    this.primaryProvider = policy?.apiKey ? primaryProviderFactory(policy.apiKey) : null;
    this.fallbackProvider = policy?.fallback?.enabled && policy.fallback.apiKey
      ? fallbackProviderFactory(policy.fallback.apiKey)
      : null;
    this.fallbackActive = !this.primaryProvider && Boolean(this.fallbackProvider);
    this.fallbackReason = this.fallbackActive ? 'primary_provider_unconfigured' : null;
  }

  generateCinematicStoryPlan(args) {
    return this.execute('generateCinematicStoryPlan', args);
  }

  generateCinematicSceneDirection(args) {
    return this.execute('generateCinematicSceneDirection', args);
  }

  async execute(method, args) {
    if (this.fallbackActive) return this.executeFallback(method, args, this.fallbackReason);
    if (!this.primaryProvider) {
      throw createRouterError(
        'cinematic_story_plan_provider_unavailable',
        'Cinematic Story Plan AI has no configured text provider.'
      );
    }

    try {
      const result = await this.primaryProvider[method](args);
      return withExecutionProvenance(result, {
        provider: this.policy.provider,
        model: args.model,
        fallbackUsed: false,
        fallbackReason: null
      });
    } catch (error) {
      if (!this.fallbackProvider || !isEligibleFallbackFailure(error)) throw error;
      this.fallbackActive = true;
      this.fallbackReason = fallbackReason(error);
      return this.executeFallback(method, args, this.fallbackReason, error);
    }
  }

  async executeFallback(method, args, reason, primaryError = null) {
    const fallbackPolicy = this.policy.fallback;
    try {
      const result = await this.fallbackProvider[method]({
        ...args,
        model: fallbackPolicy.model,
        reasoningEffort: fallbackPolicy.reasoningEffort
      });
      return withExecutionProvenance(result, {
        provider: fallbackPolicy.provider,
        model: fallbackPolicy.model,
        fallbackUsed: true,
        fallbackReason: reason
      });
    } catch (error) {
      error.fallbackAttempted = true;
      error.primaryFailureCode = safeCode(primaryError?.code);
      throw error;
    }
  }
}

export function isEligibleFallbackFailure(error) {
  const status = Number(error?.status ?? error?.statusCode);
  if (RETRYABLE_HTTP_STATUSES.has(status)) return true;
  if (RETRYABLE_PROVIDER_CODES.has(safeCode(error?.providerCode).toLowerCase())) return true;
  const code = safeCode(error?.code);
  return /(?:^|_)(?:timeout|transport_error)$/i.test(code);
}

function withExecutionProvenance(result, execution) {
  return {
    ...result,
    executionProvider: execution.provider,
    executionModel: execution.model,
    fallbackUsed: execution.fallbackUsed,
    fallbackReason: execution.fallbackReason
  };
}

function fallbackReason(error) {
  const status = Number(error?.status ?? error?.statusCode);
  const providerCode = safeCode(error?.providerCode).toLowerCase();
  if (status === 429 || ['insufficient_quota', 'rate_limit_exceeded'].includes(providerCode)) {
    return 'primary_rate_or_quota_exhausted';
  }
  if (status === 408 || /(?:^|_)timeout$/i.test(safeCode(error?.code))) {
    return 'primary_timeout';
  }
  if (/transport_error$/i.test(safeCode(error?.code))) return 'primary_transport_failure';
  if (status >= 500) return 'primary_service_unavailable';
  return 'primary_transient_failure';
}

function safeCode(value) {
  return String(value || '').trim().slice(0, 120);
}

function createRouterError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 503;
  return error;
}
