import { createHash } from 'node:crypto';
import { applyStudioNaturalRealism } from './studioNaturalRealism.js';
import { getPromptRefinementPolicy } from '../../config/prompt-refinement-policy.js';
import { OpenAITextProvider } from '../../providers/OpenAITextProvider.js';
import {
  promptRefinementAuditRepository as defaultAuditRepository
} from '../../repositories/generation/PromptRefinementAuditRepository.js';
import { providerAvailabilityPolicyService } from '../admin-configuration/ProviderAvailabilityPolicyService.js';

const MAX_PROMPT_LENGTH = 24_000;

export class PromptRefinementService {
  constructor({
    policyLoader = getPromptRefinementPolicy,
    providerFactory = policy => new OpenAITextProvider(policy.apiKey),
    auditRepository = defaultAuditRepository,
    availabilityPolicy = providerAvailabilityPolicyService,
    logger = console,
    now = () => Date.now()
  } = {}) {
    this.policyLoader = policyLoader;
    this.providerFactory = providerFactory;
    this.auditRepository = auditRepository;
    this.availabilityPolicy = availabilityPolicy;
    this.logger = logger;
    this.now = now;
  }

  async refine({ prompt, requested = false, context = {}, requestId = null }) {
    const canonicalPrompt = String(prompt || '').trim();
    const policy = this.policyLoader();
    const baseMetadata = {
      requested: requested === true,
      applied: false,
      status: requested === true ? 'disabled' : 'not_requested',
      provider: policy.provider,
      model: policy.model,
      beforeFingerprint: fingerprint(canonicalPrompt),
      afterFingerprint: fingerprint(canonicalPrompt),
      responseId: null,
      usage: null,
      latencyMs: 0,
      warnings: []
    };
    if (requested !== true || !policy.enabled) {
      this.logResult(baseMetadata, requestId);
      return { prompt: canonicalPrompt, metadata: baseMetadata, audit: null };
    }
    if (!canonicalPrompt || canonicalPrompt.length > MAX_PROMPT_LENGTH) {
      const metadata = {
        ...baseMetadata,
        status: 'fallback',
        errorCode: canonicalPrompt ? 'prompt_refinement_input_too_large' : 'prompt_refinement_input_empty'
      };
      this.logResult(metadata, requestId);
      return {
        prompt: canonicalPrompt,
        metadata,
        audit: policy.logPrompts
          ? createAuditRecord(requestId, metadata, canonicalPrompt, canonicalPrompt)
          : null
      };
    }

    const startedAt = this.now();
    try {
      this.availabilityPolicy.assertAvailable({
        providerId: policy.provider,
        modelId: policy.model,
        workflow: 'ai.prompt_refinement'
      });
      const result = await this.providerFactory(policy).refinePrompt({
        prompt: canonicalPrompt,
        context: sanitizeContext(context),
        model: policy.model,
        reasoningEffort: policy.reasoningEffort,
        maxOutputTokens: policy.maxOutputTokens,
        timeoutMs: policy.timeoutMs
      });
      const refinedPrompt = applyStudioNaturalRealism(
        validateRefinedPrompt(canonicalPrompt, result.refinedPrompt), context);
      const metadata = {
        ...baseMetadata,
        applied: true,
        status: 'refined',
        afterFingerprint: fingerprint(refinedPrompt),
        responseId: result.responseId,
        usage: sanitizeUsage(result.usage),
        latencyMs: Math.max(0, this.now() - startedAt),
        warnings: result.warnings.slice(0, 10),
        changeSummary: result.changeSummary.slice(0, 10),
        preservedAuthorities: result.preservedAuthorities.slice(0, 20)
      };
      this.logResult(metadata, requestId, policy.logPrompts ? { canonicalPrompt, refinedPrompt } : null);
      return {
        prompt: refinedPrompt,
        metadata,
        audit: policy.logPrompts
          ? createAuditRecord(requestId, metadata, canonicalPrompt, refinedPrompt)
          : null
      };
    } catch (error) {
      const metadata = {
        ...baseMetadata,
        status: 'fallback',
        errorCode: error?.code || 'prompt_refinement_failed',
        latencyMs: Math.max(0, this.now() - startedAt)
      };
      this.logResult(metadata, requestId, policy.logPrompts ? {
        canonicalPrompt,
        refinedPrompt: canonicalPrompt
      } : null);
      return {
        prompt: canonicalPrompt,
        metadata,
        audit: policy.logPrompts
          ? createAuditRecord(requestId, metadata, canonicalPrompt, canonicalPrompt)
          : null
      };
    }
  }

  async persistAudit(jobId, audit) {
    if (!audit) return null;
    const policy = this.policyLoader();
    if (!policy.logPrompts) return null;
    return this.auditRepository.write(jobId, audit, {
      maxFiles: policy.auditMaxFiles
    });
  }

  logResult(metadata, requestId, prompts = null) {
    const event = {
      event: 'prompt_refinement',
      requestId,
      ...metadata,
      ...(prompts ? { beforePrompt: prompts.canonicalPrompt, afterPrompt: prompts.refinedPrompt } : {})
    };
    this.logger.info?.(`[Generation] ${JSON.stringify(event)}`);
  }
}

function createAuditRecord(requestId, metadata, beforePrompt, afterPrompt) {
  return {
    requestId,
    createdAt: new Date().toISOString(),
    status: metadata.status,
    applied: metadata.applied,
    provider: metadata.provider,
    model: metadata.model,
    responseId: metadata.responseId || null,
    latencyMs: metadata.latencyMs,
    usage: metadata.usage || null,
    beforeFingerprint: metadata.beforeFingerprint,
    afterFingerprint: metadata.afterFingerprint,
    changeSummary: metadata.changeSummary || [],
    warnings: metadata.warnings || [],
    preservedAuthorities: metadata.preservedAuthorities || [],
    errorCode: metadata.errorCode || null,
    beforePrompt,
    afterPrompt
  };
}

function validateRefinedPrompt(canonicalPrompt, candidate) {
  const refinedPrompt = String(candidate || '').trim();
  if (!refinedPrompt || refinedPrompt.length > MAX_PROMPT_LENGTH) {
    const error = new Error('Refined prompt is empty or exceeds the supported length.');
    error.code = 'prompt_refinement_invalid_prompt';
    throw error;
  }
  const aspectDirective = canonicalPrompt.match(/\(Image aspect ratio [^)]+\)/i)?.[0];
  if (aspectDirective && !refinedPrompt.toLowerCase().includes(aspectDirective.toLowerCase())) {
    const error = new Error('Refined prompt did not preserve the aspect-ratio directive.');
    error.code = 'prompt_refinement_authority_lost';
    throw error;
  }
  return refinedPrompt;
}

function sanitizeContext(context) {
  return {
    mode: context.mode || null,
    generationMode: context.generationMode || null,
    generationSurface: context.generationSurface || null,
    aspectRatio: context.aspectRatio || null,
    outputCount: context.outputCount || 1,
    authoringMode: context.sceneBuilder?.authoringMode || null,
    characterType: context.characterType || null,
    characterReferenceOutfitBehavior: context.characterReferenceOutfitBehavior || null,
    selectedAttributes: Object.fromEntries(
      Object.entries(context.selections || {}).map(([field, selection]) => [
        field,
        selection && typeof selection === 'object' ? selection.id || null : null
      ])
    ),
    referenceRoles: (context.referenceRoleManifest || []).map(reference => ({
      slotId: reference.slotId || null,
      role: reference.role || null,
      authority: reference.authority || null
    }))
  };
}

function sanitizeUsage(usage) {
  if (!usage || typeof usage !== 'object') return null;
  return {
    inputTokens: Number(usage.input_tokens || 0),
    outputTokens: Number(usage.output_tokens || 0),
    totalTokens: Number(usage.total_tokens || 0)
  };
}

function fingerprint(value) {
  return value ? createHash('sha256').update(value).digest('hex').slice(0, 16) : null;
}

export const promptRefinementService = new PromptRefinementService();
