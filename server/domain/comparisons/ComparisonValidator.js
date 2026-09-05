import crypto from 'crypto';
import { ComparisonError } from '../../repositories/comparisons/ComparisonRepository.js';

const ESTIMATE_TTL_MS = 5 * 60 * 1000;

export function aggregateRunStatus(slots) {
  if (slots.length === 0) return 'draft';
  const statuses = slots.map(slot => slot.status);
  const terminal = statuses.every(status => ['completed', 'failed', 'cancelled'].includes(status));
  const completed = statuses.filter(status => status === 'completed').length;
  if (terminal && completed === slots.length) return 'completed';
  if (terminal && completed > 0) return 'partially_completed';
  if (terminal) return 'failed';
  if (statuses.some(status => status === 'processing' || status === 'streaming')) return 'processing';
  return 'queued';
}

export class ComparisonValidator {
  constructor({ providerRegistry, secret = process.env.COMPARISON_ESTIMATE_SECRET || 'local-comparison-estimate' }) {
    this.providerRegistry = providerRegistry;
    this.secret = secret;
  }

  validateSlots(slots, context) {
    const mediaType = context.mediaType === 'video' ? 'video' : 'image';
    const validSlotCount = mediaType === 'video'
      ? Array.isArray(slots) && slots.length === 2
      : Array.isArray(slots) && slots.length >= 2 && slots.length <= 4;
    if (!validSlotCount) {
      throw new ComparisonError(
        'invalid_slot_count',
        mediaType === 'video'
          ? 'Video Comparison requires exactly 2 slots.'
          : 'AI Comparison requires between 2 and 4 slots.'
      );
    }
    if (mediaType === 'video') {
      throw new ComparisonError(
        'video_comparison_not_qualified',
        'Video Comparison is unavailable until two comparable models pass qualification.',
        409
      );
    }
    const slotIds = new Set();
    return slots.map((slot, index) => {
      const id = typeof slot.id === 'string' && slot.id.trim() ? slot.id.trim() : `slot_${index + 1}`;
      if (slotIds.has(id)) throw new ComparisonError('duplicate_slot_id', `Duplicate slot ID: ${id}`);
      slotIds.add(id);
      const { provider, model } = this.providerRegistry.resolveSelection(
        slot.provider,
        slot.model,
        { generationSurface: context.generationSurface || null }
      );
      if (model.capabilities?.imageGeneration !== true) {
        throw new ComparisonError('unsupported_model', `${model.displayName.en} does not support image generation.`);
      }
      const requestedImageResolution = context.imageResolution || null;
      const imageResolution = resolveSlotImageResolution(model, requestedImageResolution);
      this.providerRegistry.validateRequest(model, {
        aspectRatio: context.aspectRatio,
        referenceCount: context.referenceCount,
        imageResolution
      });
      return {
        id,
        position: index + 1,
        provider: provider.id,
        model: model.id,
        providerDisplayName: provider.displayName,
        modelDisplayName: model.displayName,
        estimatedCredit: null,
        imageResolution,
        resolutionFallback: requestedImageResolution && imageResolution && requestedImageResolution !== imageResolution
          ? { requested: requestedImageResolution, resolved: imageResolution }
          : null,
        providerConfig: provider,
        modelConfig: model
      };
    });
  }

  createEstimate(validatedSlots, context, actorIdentity) {
    const expiresAt = Date.now() + ESTIMATE_TTL_MS;
    const publicSlots = validatedSlots.map(stripPrivateConfig);
    const estimate = {
      slots: publicSlots,
      estimatedTotalCredit: publicSlots.reduce((total, slot) => total + slot.estimatedCredit, 0),
      providerConfigVersion: this.providerRegistry.getConfigVersion(),
      expiresAt
    };
    return { ...estimate, estimateToken: this.signEstimate(estimate, context, actorIdentity) };
  }

  verifyEstimate(token, estimate, context, actorIdentity) {
    if (!token || estimate.expiresAt < Date.now()) {
      throw new ComparisonError('estimate_expired', 'The comparison estimate has expired. Please review the cost again.', 409);
    }
    const expected = this.signEstimate(estimate, context, actorIdentity);
    const actualBuffer = Buffer.from(String(token));
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
      throw new ComparisonError('estimate_changed', 'Provider configuration or cost changed. Please confirm a new estimate.', 409);
    }
  }

  signEstimate(estimate, context, actorIdentity) {
    const fingerprint = JSON.stringify({
      actorIdentity,
      slots: estimate.slots.map(slot => ({
        provider: slot.provider,
        model: slot.model,
        estimatedCredit: slot.estimatedCredit,
        estimateId: slot.estimateId || null,
        imageResolution: slot.imageResolution || null,
        resolutionFallback: slot.resolutionFallback || null
      })),
      estimatedTotalCredit: estimate.estimatedTotalCredit,
      providerConfigVersion: estimate.providerConfigVersion,
      expiresAt: estimate.expiresAt,
      aspectRatio: context.aspectRatio,
      imageResolution: context.imageResolution || null,
      referenceCount: context.referenceCount,
      referenceProcessingPlanFingerprint:
        context.referenceProcessing?.planFingerprint || null,
      mode: context.mode,
      generationSurface: context.generationSurface || null,
      selections: context.selections || {},
      customColors: context.customColors || {},
      adminPromptOverride: context.userRole === 'admin' ? context.adminPromptOverride || null : null
    });
    return crypto.createHmac('sha256', this.secret).update(fingerprint).digest('hex');
  }
}

export function stripPrivateConfig(slot) {
  const { providerConfig, modelConfig, ...publicSlot } = slot;
  return publicSlot;
}

function resolveSlotImageResolution(model, requestedResolution) {
  const supported = model.capabilities?.resolutions;
  if (!Array.isArray(supported) || supported.length === 0) return null;
  if (requestedResolution && supported.includes(requestedResolution)) return requestedResolution;
  if (model.defaults?.resolution && supported.includes(model.defaults.resolution)) return model.defaults.resolution;
  return supported[0] || null;
}
