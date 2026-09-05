import { GeminiCinematicTextProvider } from '../../providers/GeminiCinematicTextProvider.js';
import { OpenAITextProvider } from '../../providers/OpenAITextProvider.js';
import { providerAvailabilityPolicyService } from '../admin-configuration/ProviderAvailabilityPolicyService.js';

const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_PROVIDER_CODES = new Set([
  'insufficient_quota',
  'rate_limit_exceeded',
  'server_error'
]);

export class CinematicTextProviderRouter {
  constructor(policy, {
    primaryProviderFactory = apiKey => new OpenAITextProvider(apiKey),
    fallbackProviderFactory = apiKey => new GeminiCinematicTextProvider(apiKey),
    availabilityPolicy = providerAvailabilityPolicyService
  } = {}) {
    this.policy = policy;
    this.primaryProvider = policy?.apiKey ? primaryProviderFactory(policy.apiKey) : null;
    this.fallbackProvider = policy?.fallback?.enabled && policy.fallback.apiKey
      ? fallbackProviderFactory(policy.fallback.apiKey)
      : null;
    this.availabilityPolicy = availabilityPolicy;
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
    const workflow = workflowForMethod(method);
    if (this.fallbackActive) return this.executeFallback(method, args, this.fallbackReason, null, workflow);
    if (!this.primaryProvider) {
      throw createRouterError(
        'cinematic_story_plan_provider_unavailable',
        'Cinematic Story Plan AI has no configured text provider.'
      );
    }

    try {
      this.availabilityPolicy.assertAvailable({
        providerId: this.policy.provider,
        modelId: args.model,
        workflow
      });
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
      return this.executeFallback(method, args, this.fallbackReason, error, workflow);
    }
  }

  async executeFallback(method, args, reason, primaryError = null, workflow = workflowForMethod(method)) {
    const fallbackPolicy = this.policy.fallback;
    try {
      this.availabilityPolicy.assertAvailable({
        providerId: fallbackPolicy.provider,
        modelId: fallbackPolicy.model,
        workflow
      });
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
  if (safeCode(error?.code) === 'provider_runtime_disabled') return true;
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
  if (safeCode(error?.code) === 'provider_runtime_disabled') return 'primary_disabled_by_admin';
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

function workflowForMethod(method) {
  return method === 'generateCinematicSceneDirection'
    ? 'ai.scene_direction'
    : 'ai.story_plan';
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
