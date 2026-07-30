import { creditPricingPolicyService } from './CreditPricingPolicyService.js';
import { creditAccountRepo } from '../../repositories/credits/CreditAccountRepository.js';
import { createCreditError, CREDIT_ERROR_CODES } from './creditErrors.js';

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

    if (new Date(estimate.expiresAt) < new Date()) {
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
      ['templateUseSessionId', normalized(inputs.templateUseSessionId), normalized(generationRequest.templateUseSessionId)]
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
        templateUseSessionId: estimate.pricingInputs?.templateUseSessionId || null
      };
      const mismatches = Object.entries(actual)
        .filter(([field, value]) => String(value ?? '') !== String(expected[field] ?? ''))
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

  async reconcileStartupOrphanReservations() {
    try {
      const startupAt = new Date();
      const data = await this.accountRepo.readRaw();
      const now = startupAt;
      const orphanReservations = (data.reservations || []).filter(r =>
        r.status === 'reserved' && new Date(r.createdAt || 0) <= startupAt
      );

      for (const rsv of orphanReservations) {
        try {
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
