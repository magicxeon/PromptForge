import crypto from 'node:crypto';
import { creditPricingPolicyService } from './CreditPricingPolicyService.js';
import { creditAccountRepo } from '../../repositories/credits/CreditAccountRepository.js';
import { createCreditError, CREDIT_ERROR_CODES } from './creditErrors.js';
import { calculateVideoPricingPreview } from './VideoPricingCalculator.js';

export class CreditReservationService {
  constructor({
    pricingPolicyService = creditPricingPolicyService,
    accountRepo = creditAccountRepo
  } = {}) {
    this.pricingPolicyService = pricingPolicyService;
    this.accountRepo = accountRepo;
    this.estimateCache = new Map(); // Short-lived read cache; persistence is the source of truth.
  }

  async estimate(options = {}) {
    const estimate = await this.pricingPolicyService.calculateEstimate(options);
    this.estimateCache.set(estimate.estimateId, estimate);
    return this.accountRepo.saveEstimate(estimate);
  }

  async estimateVideo({ userId, model, request, generationMode = 'playground_video' }) {
    if (!userId || !model || !request) {
      throw createCreditError(CREDIT_ERROR_CODES.PRICING_UNAVAILABLE, 'Video pricing inputs are incomplete.', 400);
    }
    const policy = await this.pricingPolicyService.loadPolicy();
    const now = new Date();
    const preview = calculateVideoPricingPreview(model, request, policy, { now });
    const developmentPocCredits = getDevelopmentPocCredits({ model, generationMode });
    const qualificationNoCharge = developmentPocCredits === null
      && isNoChargeVideoQualification({ model, generationMode });
    const customerCredits = developmentPocCredits ?? (qualificationNoCharge ? 0 : preview.estimatedCredits);
    const estimate = {
      estimateId: `vest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId,
      pricingPolicyVersion: policy.policyVersion,
      routing: {
        routingMode: 'advanced',
        qualityTier: 'video',
        requestedProviderId: model.providerId,
        requestedModelId: model.modelId,
        resolvedProviderId: model.providerId,
        resolvedModelId: model.modelId
      },
      pricingInputs: {
        mediaType: 'video',
        operation: request.operation,
        commercialOperation: request.commercialOperation,
        inputMode: request.inputMode,
        resolution: request.resolution,
        aspectRatio: request.aspectRatio,
        durationSeconds: Number(request.durationSeconds),
        audioMode: request.audioMode,
        referenceCount: Number(request.referenceImageCount || 0),
        referencePlanFingerprint: request.referencePlanFingerprint || null,
        developmentPocUnverified: model.developmentPocUnverified === true,
        developmentPocCredits,
        outputCount: 1,
        generationMode: String(generationMode || 'playground_video')
      },
      breakdown: {
        providerCostUsd: preview.providerCostUsd,
        billingMetric: preview.billingMetric,
        providerRateVersion: preview.providerRateVersion,
        tokenRateUsdPerMillion: preview.tokenRateUsdPerMillion,
        estimatedCompletionTokens: preview.estimatedCompletionTokens,
        discountId: preview.discountId,
        discountEndsAt: preview.discountEndsAt,
        costBasis: preview.costBasis,
        providerPriceSource: model.providerPriceSource || null,
        providerPriceSourceDate: model.providerPriceSourceDate || null,
        providerEstimatedCredits: preview.estimatedCredits,
        generationCredits: customerCredits,
        totalCredits: customerCredits,
        ...(developmentPocCredits === null ? {} : { developmentPocCredits })
      },
      estimatedCredits: customerCredits,
      billingStatus: qualificationNoCharge ? 'qualification_no_charge' : 'estimated',
      chargeMode: developmentPocCredits !== null
        ? 'development_poc_credit'
        : qualificationNoCharge ? 'qualification_no_charge' : 'user_credits',
      estimateConfidence: 'locked',
      createdAt: now.toISOString(),
      expiresAt: new Date(Math.min(
        now.getTime() + Number(policy.estimateTtlSeconds) * 1000,
        preview.discountEndsAt ? Date.parse(preview.discountEndsAt) : Infinity
      )).toISOString()
    };
    this.estimateCache.set(estimate.estimateId, estimate);
    return this.accountRepo.saveEstimate(estimate);
  }

  async validateAndReserveForRequest({ userId, estimateId, generationRequest = {}, metadata = {} }) {
    if (!userId || !estimateId || !generationRequest.requestId || !metadata.jobId) {
      throw createCreditError(
        CREDIT_ERROR_CODES.ESTIMATE_STALE,
        'A user, locked estimate, request ID, and job ID are required before generation can start.',
        400
      );
    }

    const estimate = this.estimateCache.get(estimateId) || await this.accountRepo.getEstimateById(estimateId);

    if (!estimate) {
      throw createCreditError(CREDIT_ERROR_CODES.ESTIMATE_NOT_FOUND, 'Estimate not found or invalid.', 404);
    }

    if (estimate.userId !== userId) {
      throw createCreditError(CREDIT_ERROR_CODES.ESTIMATE_NOT_FOUND, 'Estimate does not belong to the active user.', 404);
    }

    if (new Date(estimate.expiresAt) <= new Date()) {
      throw createCreditError(CREDIT_ERROR_CODES.ESTIMATE_EXPIRED, 'Credit estimate has expired.', 400);
    }

    // Parity Validation against generation request inputs
    const inputs = estimate.pricingInputs || {};
    const route = estimate.routing || {};

    const normalized = value => value === undefined || value === null || value === '' ? null : String(value).trim();
    const normalizedResolution = value => normalized(value)?.toUpperCase() || null;
    const integer = (value, fallback) => Math.max(0, Math.floor(Number(value ?? fallback) || 0));
    const comparisons = [
      ['routingMode', normalized(route.routingMode), normalized(generationRequest.routingMode ?? route.routingMode)],
      ['qualityTier', normalized(route.qualityTier), normalized(generationRequest.qualityTier ?? route.qualityTier)],
      ['providerId', normalized(route.requestedProviderId), normalized(generationRequest.requestedProviderId)],
      ['modelId', normalized(route.requestedModelId), normalized(generationRequest.requestedModelId)],
      ['resolution', normalizedResolution(inputs.resolution), normalizedResolution(generationRequest.resolution)],
      ['aspectRatio', normalized(inputs.aspectRatio), normalized(generationRequest.aspectRatio)],
      ['quality', normalized(inputs.quality), normalized(generationRequest.quality)],
      ['referenceCount', integer(inputs.referenceCount, 0), integer(generationRequest.referenceCount, 0)],
      ['outputCount', Math.max(1, integer(inputs.outputCount, 1)), Math.max(1, integer(generationRequest.outputCount, 1))],
      ['generationMode', normalized(inputs.generationMode), normalized(generationRequest.generationMode)],
      ...(inputs.mediaType === 'video' ? [
        ['operation', normalized(inputs.operation), normalized(generationRequest.operation)],
        ...(normalized(inputs.commercialOperation)
          ? [['commercialOperation', normalized(inputs.commercialOperation), normalized(generationRequest.commercialOperation)]]
          : []),
        ...(normalized(inputs.inputMode)
          ? [['inputMode', normalized(inputs.inputMode), normalized(generationRequest.inputMode)]]
          : []),
        ['durationSeconds', integer(inputs.durationSeconds, 0), integer(generationRequest.durationSeconds, 0)],
        ['audioMode', normalized(inputs.audioMode), normalized(generationRequest.audioMode)],
        ...(normalized(inputs.referencePlanFingerprint)
          ? [['referencePlanFingerprint', normalized(inputs.referencePlanFingerprint), normalized(generationRequest.referencePlanFingerprint)]]
          : []),
        ...(inputs.developmentPocUnverified === true
          ? [
            ['developmentPocUnverified', true, generationRequest.developmentPocUnverified === true],
            ['developmentPocCredits', integer(inputs.developmentPocCredits, 0), integer(generationRequest.developmentPocCredits, 0)]
          ]
          : [])
      ] : []),
      ['templateUseSessionId', normalized(inputs.templateUseSessionId), normalized(generationRequest.templateUseSessionId)],
      ...(normalized(inputs.referenceProcessingPlanFingerprint)
        ? [[
          'referenceProcessingPlanFingerprint',
          normalized(inputs.referenceProcessingPlanFingerprint),
          normalized(generationRequest.referenceProcessingPlanFingerprint)
        ]]
        : [])
    ];
    const mismatches = comparisons
      .filter(([, expected, actual]) => expected !== actual)
      .map(([field, expected, actual]) => ({ field, expected, actual }));

    if (mismatches.length) {
      throw createCreditError(
        CREDIT_ERROR_CODES.ESTIMATE_STALE,
        'Generation request parameters do not match locked estimate.',
        400,
        { mismatches }
      );
    }

    if (estimate.billingStatus === 'qualification_no_charge') {
      const authorizationId = qualificationAuthorizationId({
        userId,
        estimateId: estimate.estimateId,
        requestId: generationRequest.requestId,
        jobId: metadata.jobId
      });
      const account = typeof this.accountRepo.getAccountByUserId === 'function'
        ? await this.accountRepo.getAccountByUserId(userId)
        : null;
      return {
        estimate,
        authorization: {
          authorizationId,
          status: 'authorized',
          billingStatus: 'qualification_no_charge',
          estimateId: estimate.estimateId,
          requestId: generationRequest.requestId,
          jobId: metadata.jobId
        },
        billingStatus: 'qualification_no_charge',
        account
      };
    }

    const reservationResult = await this.accountRepo.reserveCredits({
      userId,
      amountCredits: estimate.estimatedCredits,
      estimateId: estimate.estimateId,
      requestId: generationRequest.requestId || metadata.requestId,
      jobId: metadata.jobId || null,
      pricingSnapshot: {
        providerId: route.requestedProviderId,
        modelId: route.requestedModelId,
        pricingPolicyVersion: estimate.pricingPolicyVersion,
        estimatedCredits: estimate.estimatedCredits,
        breakdown: estimate.breakdown
      },
      relatedTemplateId: metadata.relatedTemplateId || null,
      metadata: {
        ...metadata,
        expiresAt: estimate.expiresAt,
        idempotencyKey: `reserve:${userId}:${generationRequest.requestId}`
      }
    });

    return {
      estimate,
      reservation: reservationResult.reservation,
      account: reservationResult.account
    };
  }

  async captureForJob({ userId, reservationId, jobId, metadata = {} }) {
    return this.accountRepo.captureReservation({
      userId,
      reservationId,
      jobId,
      idempotencyKey: `capture:${reservationId || jobId}`,
      metadata
    });
  }

  async reservePlan({ userId, quoteId, planId, operations, idempotencyKey }) {
    if (!userId || !quoteId || !planId || !idempotencyKey || !Array.isArray(operations) || !operations.length) {
      throw createCreditError(
        CREDIT_ERROR_CODES.ESTIMATE_STALE,
        'A complete Fashion credit plan is required.',
        400
      );
    }
    const allocations = [];
    for (const operation of operations) {
      const estimate = this.estimateCache.get(operation.estimateId)
        || await this.accountRepo.getEstimateById(operation.estimateId);
      if (!estimate || estimate.userId !== userId) {
        throw createCreditError(CREDIT_ERROR_CODES.ESTIMATE_NOT_FOUND, 'A plan estimate is missing or belongs to another actor.', 404);
      }
      if (new Date(estimate.expiresAt) < new Date()) {
        throw createCreditError(CREDIT_ERROR_CODES.ESTIMATE_EXPIRED, 'A plan estimate has expired.', 400);
      }
      const expected = operation.generationRequest || {};
      const actual = {
        providerId: estimate.routing?.requestedProviderId,
        modelId: estimate.routing?.requestedModelId,
        resolution: estimate.pricingInputs?.resolution,
        aspectRatio: estimate.pricingInputs?.aspectRatio,
        referenceCount: Number(estimate.pricingInputs?.referenceCount || 0),
        outputCount: Number(estimate.pricingInputs?.outputCount || 1),
        generationMode: estimate.pricingInputs?.generationMode,
        templateUseSessionId: estimate.pricingInputs?.templateUseSessionId || null,
        ...(estimate.pricingInputs?.referenceProcessingPlanFingerprint
          ? {
            referenceProcessingPlanFingerprint:
              estimate.pricingInputs.referenceProcessingPlanFingerprint
          }
          : {})
      };
      const normalizeComparable = (field, value) => {
        if (value === undefined || value === null) return '';
        const normalized = String(value).trim();
        return field === 'resolution' ? normalized.toUpperCase() : normalized;
      };
      const mismatches = Object.entries(actual)
        .filter(([field, value]) =>
          normalizeComparable(field, value)
            !== normalizeComparable(field, expected[field])
        )
        .map(([field, value]) => ({ field, expected: value, actual: expected[field] }));
      if (mismatches.length) {
        throw createCreditError(
          CREDIT_ERROR_CODES.ESTIMATE_STALE,
          'A Fashion operation does not match its locked estimate.',
          400,
          { operationId: operation.operationId, mismatches }
        );
      }
      allocations.push({
        operationId: operation.operationId,
        estimateId: estimate.estimateId,
        requestId: operation.requestId,
        jobId: operation.jobId,
        amountCredits: estimate.estimatedCredits,
        expiresAt: estimate.expiresAt,
        pricingSnapshot: {
          providerId: estimate.routing.requestedProviderId,
          modelId: estimate.routing.requestedModelId,
          pricingPolicyVersion: estimate.pricingPolicyVersion,
          estimatedCredits: estimate.estimatedCredits,
          breakdown: estimate.breakdown
        },
        relatedTemplateId: estimate.breakdown?.templateId || null
      });
    }
    return this.accountRepo.reserveCreditPlan({
      userId,
      quoteId,
      planId,
      idempotencyKey,
      allocations,
      relatedTemplateId: allocations.find(item => item.relatedTemplateId)?.relatedTemplateId || null
    });
  }

  async reserveGenerationGroup({
    userId,
    estimateId,
    generationRequest,
    groupId,
    children,
    metadata = {}
  }) {
    if (!userId || !estimateId || !generationRequest?.requestId || !groupId
      || !Array.isArray(children) || !children.length) {
      throw createCreditError(
        CREDIT_ERROR_CODES.ESTIMATE_STALE,
        'A complete generation group reservation is required.',
        400
      );
    }
    const estimate = this.estimateCache.get(estimateId)
      || await this.accountRepo.getEstimateById(estimateId);
    assertEstimateCanReserve({ estimate, userId, generationRequest });
    const outputCount = Math.max(1, Math.floor(Number(estimate.pricingInputs?.outputCount) || 1));
    if (children.length !== outputCount) {
      throw createCreditError(
        CREDIT_ERROR_CODES.ESTIMATE_STALE,
        'The generation group size does not match the locked estimate.',
        400,
        { expected: outputCount, actual: children.length }
      );
    }
    const allocations = splitCredits(estimate.estimatedCredits, outputCount).map((amountCredits, index) => ({
      operationId: `output_${index}`,
      estimateId,
      requestId: `${generationRequest.requestId}:output:${index}`,
      jobId: children[index].jobId,
      amountCredits,
      expiresAt: estimate.expiresAt,
      pricingSnapshot: {
        providerId: estimate.routing?.requestedProviderId,
        modelId: estimate.routing?.requestedModelId,
        pricingPolicyVersion: estimate.pricingPolicyVersion,
        estimatedCredits: amountCredits,
        groupEstimatedCredits: estimate.estimatedCredits,
        outputIndex: index,
        breakdown: estimate.breakdown
      }
    }));
    return this.accountRepo.reserveCreditPlan({
      userId,
      quoteId: estimateId,
      planId: groupId,
      idempotencyKey: `generation-group:${userId}:${generationRequest.requestId}`,
      allocations,
      relatedTemplateId: metadata.relatedTemplateId || null,
      planKind: 'generation_group'
    });
  }

  async refundForJob({ userId, reservationId, jobId, reasonCode = 'technical_failure', metadata = {} }) {
    return this.accountRepo.refundReservation({
      userId,
      reservationId,
      jobId,
      reasonCode,
      idempotencyKey: `refund:${reservationId || jobId}:${reasonCode}`,
      metadata
    });
  }

  async reconcileStartupOrphanReservations({ shouldPreserveReservation = null } = {}) {
    try {
      const startupAt = new Date();
      const data = await this.accountRepo.readRaw();
      const now = startupAt;
      const orphanReservations = (data.reservations || []).filter(r =>
        r.status === 'reserved' && new Date(r.createdAt || 0) <= startupAt
      );

      for (const rsv of orphanReservations) {
        try {
          if (typeof shouldPreserveReservation === 'function') {
            let shouldPreserve = true;
            try {
              shouldPreserve = await shouldPreserveReservation({
                userId: rsv.userId,
                reservationId: rsv.reservationId,
                jobId: rsv.jobId || null,
                metadata: structuredClone(rsv.metadata || {})
              });
            } catch (error) {
              console.warn(
                `[CreditReconciliation] Reservation ownership check failed for ${rsv.reservationId}; preserving reservation:`,
                error.message
              );
              continue;
            }
            if (shouldPreserve) continue;
          }
          await this.accountRepo.refundReservation({
            userId: rsv.userId,
            reservationId: rsv.reservationId,
            jobId: rsv.jobId,
            reasonCode: rsv.jobId ? 'job_missing_after_restart' : 'reservation_expired',
            idempotencyKey: `refund:${rsv.reservationId}:${rsv.jobId ? 'job_missing_after_restart' : 'reservation_expired'}`,
            metadata: { reconciledAtStartup: true, reservationExpired: new Date(rsv.expiresAt) < now }
          });
        } catch (err) {
          console.warn(`[CreditReconciliation] Failed to reconcile reservation ${rsv.reservationId}:`, err.message);
        }
      }
    } catch (err) {
      console.warn('[CreditReconciliation] Startup reconciliation check failed:', err.message);
    }
  }
}

export const creditReservationService = new CreditReservationService();

function isNoChargeVideoQualification({ model, generationMode }) {
  return String(generationMode || '') === 'cinematic_video'
    && model?.pricingStatus === 'research_only'
    && model?.testingRoutingEnabled === true
    && model?.paidRoutingEnabled !== true;
}

function getDevelopmentPocCredits({ model, generationMode }) {
  if (!['cinematic_video', 'playground_video'].includes(String(generationMode || ''))
    || model?.developmentPocUnverified !== true) return null;
  const value = Number(model.developmentPocCredits);
  return Number.isInteger(value) ? Math.min(10, Math.max(1, value)) : 1;
}

function qualificationAuthorizationId({ userId, estimateId, requestId, jobId }) {
  const fingerprint = crypto.createHash('sha256')
    .update(`${userId}:${estimateId}:${requestId}:${jobId}`)
    .digest('hex')
    .slice(0, 24);
  return `vqual_${fingerprint}`;
}

function splitCredits(total, count) {
  const normalizedTotal = Math.max(0, Math.floor(Number(total) || 0));
  const base = Math.floor(normalizedTotal / count);
  const remainder = normalizedTotal % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function assertEstimateCanReserve({ estimate, userId, generationRequest }) {
  if (!estimate) {
    throw createCreditError(CREDIT_ERROR_CODES.ESTIMATE_NOT_FOUND, 'Estimate not found or invalid.', 404);
  }
  if (estimate.userId !== userId) {
    throw createCreditError(CREDIT_ERROR_CODES.ESTIMATE_NOT_FOUND, 'Estimate does not belong to the active user.', 404);
  }
  if (new Date(estimate.expiresAt) < new Date()) {
    throw createCreditError(CREDIT_ERROR_CODES.ESTIMATE_EXPIRED, 'Credit estimate has expired.', 400);
  }
  const inputs = estimate.pricingInputs || {};
  const route = estimate.routing || {};
  const normalized = value => value === undefined || value === null || value === ''
    ? null
    : String(value).trim();
  const resolution = value => normalized(value)?.toUpperCase() || null;
  const integer = (value, fallback) => Math.max(0, Math.floor(Number(value ?? fallback) || 0));
  const comparisons = [
    ['routingMode', normalized(route.routingMode), normalized(generationRequest.routingMode ?? route.routingMode)],
    ['qualityTier', normalized(route.qualityTier), normalized(generationRequest.qualityTier ?? route.qualityTier)],
    ['providerId', normalized(route.requestedProviderId), normalized(generationRequest.requestedProviderId)],
    ['modelId', normalized(route.requestedModelId), normalized(generationRequest.requestedModelId)],
    ['resolution', resolution(inputs.resolution), resolution(generationRequest.resolution)],
    ['aspectRatio', normalized(inputs.aspectRatio), normalized(generationRequest.aspectRatio)],
    ['quality', normalized(inputs.quality), normalized(generationRequest.quality)],
    ['referenceCount', integer(inputs.referenceCount, 0), integer(generationRequest.referenceCount, 0)],
    ['outputCount', Math.max(1, integer(inputs.outputCount, 1)), Math.max(1, integer(generationRequest.outputCount, 1))],
    ['generationMode', normalized(inputs.generationMode), normalized(generationRequest.generationMode)],
    ['templateUseSessionId', normalized(inputs.templateUseSessionId), normalized(generationRequest.templateUseSessionId)],
    ...(normalized(inputs.referenceProcessingPlanFingerprint) ? [[
      'referenceProcessingPlanFingerprint',
      normalized(inputs.referenceProcessingPlanFingerprint),
      normalized(generationRequest.referenceProcessingPlanFingerprint)
    ]] : [])
  ];
  const mismatches = comparisons
    .filter(([, expected, actual]) => expected !== actual)
    .map(([field, expected, actual]) => ({ field, expected, actual }));
  if (mismatches.length) {
    throw createCreditError(
      CREDIT_ERROR_CODES.ESTIMATE_STALE,
      'Generation request parameters do not match locked estimate.',
      400,
      { mismatches }
    );
  }
}
