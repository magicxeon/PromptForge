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
    const mismatch =
      normalized(route.routingMode) !== normalized(generationRequest.routingMode ?? route.routingMode) ||
      normalized(route.qualityTier) !== normalized(generationRequest.qualityTier ?? route.qualityTier) ||
      normalized(route.requestedProviderId) !== normalized(generationRequest.requestedProviderId) ||
      normalized(route.requestedModelId) !== normalized(generationRequest.requestedModelId) ||
      normalizedResolution(inputs.resolution) !== normalizedResolution(generationRequest.resolution) ||
      normalized(inputs.quality) !== normalized(generationRequest.quality) ||
      integer(inputs.referenceCount, 0) !== integer(generationRequest.referenceCount, 0) ||
      Math.max(1, integer(inputs.outputCount, 1)) !== Math.max(1, integer(generationRequest.outputCount, 1)) ||
      normalized(inputs.generationMode) !== normalized(generationRequest.generationMode);

    if (mismatch) {
      throw createCreditError(
        CREDIT_ERROR_CODES.ESTIMATE_STALE,
        'Generation request parameters do not match locked estimate.',
        400
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
