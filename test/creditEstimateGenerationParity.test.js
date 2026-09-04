import assert from 'node:assert/strict';
import test from 'node:test';
import { createEstimateOptions } from '../server/app/routes/creditRoutes.js';
import { CreditReservationService } from '../server/domain/credits/CreditReservationService.js';

test('credit estimate uses canonical Reusable Model ratio instead of stale client ratio', () => {
  const options = createEstimateOptions({
    body: {
      requestedProviderId: 'openai',
      requestedModelId: 'gpt-image-1.5',
      aspectRatio: '6:8',
      outputCount: 4,
      generationMode: 'character-sheet',
      referenceCount: 0
    },
    processing: {
      aspectRatio: '1:1',
      outputCount: 4,
      generationMode: 'character-sheet',
      referenceCount: 1,
      planFingerprint: 'rpp-casting'
    },
    userId: 'usr_casting'
  });

  assert.equal(options.aspectRatio, '1:1');
  assert.equal(options.outputCount, 4);
  assert.equal(options.generationMode, 'character-sheet');
  assert.equal(options.referenceCount, 1);
  assert.equal(options.referenceProcessingPlanFingerprint, 'rpp-casting');
});

test('credit estimate preserves raw inputs when no generation context is supplied', () => {
  const options = createEstimateOptions({
    body: {
      aspectRatio: '6:8',
      outputCount: 2,
      generationMode: 'scene',
      referenceCount: 1
    },
    templatePricing: { executionReferenceCount: 2 },
    userId: 'usr_scene'
  });

  assert.equal(options.aspectRatio, '6:8');
  assert.equal(options.outputCount, 2);
  assert.equal(options.generationMode, 'scene');
  assert.equal(options.referenceCount, 3);
});

test('video reservation binds commercial operation, input mode and reference plan', async () => {
  const estimate = {
    estimateId: 'vest_video_contract', userId: 'usr_video', estimatedCredits: 42,
    pricingPolicyVersion: 'test', expiresAt: '2099-01-01T00:00:00.000Z',
    routing: {
      routingMode: 'advanced', qualityTier: 'video',
      requestedProviderId: 'modelark', requestedModelId: 'seedance-fast'
    },
    pricingInputs: {
      mediaType: 'video', operation: 'image_to_video',
      commercialOperation: 'cinematic_draft_clip', inputMode: 'image_to_video',
      resolution: '720p', aspectRatio: '9:16', durationSeconds: 6,
      audioMode: 'none', referenceCount: 1, outputCount: 1,
      generationMode: 'cinematic_video', referencePlanFingerprint: 'reference-plan-1'
    },
    breakdown: {}
  };
  let reservations = 0;
  const service = new CreditReservationService({
    pricingPolicyService: {},
    accountRepo: {
      async getEstimateById() { return estimate; },
      async reserveCredits() {
        reservations += 1;
        return { reservation: { reservationId: 'rsv_video' }, account: {} };
      }
    }
  });
  const request = {
    requestId: 'video:test:parity', routingMode: 'advanced', qualityTier: 'video',
    requestedProviderId: 'modelark', requestedModelId: 'seedance-fast',
    operation: 'image_to_video', commercialOperation: 'cinematic_draft_clip',
    inputMode: 'image_to_video', resolution: '720p', aspectRatio: '9:16',
    durationSeconds: 6, audioMode: 'none', referenceCount: 1, outputCount: 1,
    generationMode: 'cinematic_video', referencePlanFingerprint: 'reference-plan-1'
  };
  await assert.rejects(
    service.validateAndReserveForRequest({
      userId: 'usr_video', estimateId: estimate.estimateId,
      generationRequest: { ...request, inputMode: 'text_to_video' },
      metadata: { jobId: 'video_job_1' }
    }),
    error => error.code === 'credit_estimate_stale'
      && error.details.mismatches.some(item => item.field === 'inputMode')
  );
  await service.validateAndReserveForRequest({
    userId: 'usr_video', estimateId: estimate.estimateId,
    generationRequest: request,
    metadata: { jobId: 'video_job_1' }
  });
  assert.equal(reservations, 1);
});

test('internal Cinematic qualification retains provider cost without reserving user Credits', async () => {
  let savedEstimate = null;
  let reservations = 0;
  const account = { userId: 'usr_qualification', availableCredits: 15, reservedCredits: 0 };
  const service = new CreditReservationService({
    pricingPolicyService: {
      async loadPolicy() {
        return {
          pricingFxThbPerUsd: 35,
          operatingSafetyBufferRate: 0.15,
          targetGrossMarginRate: 0.7,
          creditsPerThbAssumption: 10,
          creditRoundingIncrement: 5,
          estimateTtlSeconds: 900,
          policyVersion: 'qualification-test-v1'
        };
      }
    },
    accountRepo: {
      async saveEstimate(value) { savedEstimate = structuredClone(value); return structuredClone(value); },
      async getEstimateById() { return structuredClone(savedEstimate); },
      async getAccountByUserId() { return structuredClone(account); },
      async reserveCredits() { reservations += 1; throw new Error('qualification must not reserve Credits'); }
    }
  });
  const model = {
    providerId: 'modelark', modelId: 'seedance-fast', billingMetric: 'completion_token',
    ratesByResolutionUsdPerMillionTokens: { '720p': 1 },
    providerRateVersion: 'qualification-provider-rate-v1', pricingStatus: 'research_only',
    testingRoutingEnabled: true, paidRoutingEnabled: false
  };
  const request = {
    operation: 'image_to_video', commercialOperation: 'cinematic_draft_clip', inputMode: 'image_to_video',
    resolution: '720p', aspectRatio: '9:16', durationSeconds: 6, audioMode: 'none',
    referenceImageCount: 1, referencePlanFingerprint: 'qualification-reference-v1'
  };
  const estimate = await service.estimateVideo({
    userId: account.userId, model, request, generationMode: 'cinematic_video'
  });
  assert.equal(estimate.estimatedCredits, 0);
  assert.equal(estimate.billingStatus, 'qualification_no_charge');
  assert.equal(estimate.chargeMode, 'qualification_no_charge');
  assert.ok(estimate.breakdown.providerCostUsd > 0);
  assert.ok(estimate.breakdown.providerEstimatedCredits > 0);

  const generationRequest = {
    requestId: 'video:qualification:1', routingMode: 'advanced', qualityTier: 'video',
    requestedProviderId: model.providerId, requestedModelId: model.modelId,
    ...request, referenceCount: 1, outputCount: 1, generationMode: 'cinematic_video'
  };
  const first = await service.validateAndReserveForRequest({
    userId: account.userId, estimateId: estimate.estimateId, generationRequest,
    metadata: { jobId: 'videotask_qualification_1' }
  });
  const replay = await service.validateAndReserveForRequest({
    userId: account.userId, estimateId: estimate.estimateId, generationRequest,
    metadata: { jobId: 'videotask_qualification_1' }
  });
  assert.equal(first.billingStatus, 'qualification_no_charge');
  assert.equal(first.authorization.authorizationId, replay.authorization.authorizationId);
  assert.deepEqual(first.account, account);
  assert.equal(reservations, 0);
});

test('development Seedance POC reserves exactly one server-owned test Credit', async () => {
  let savedEstimate = null;
  let reservedAmount = null;
  const service = new CreditReservationService({
    pricingPolicyService: {
      async loadPolicy() {
        return {
          pricingFxThbPerUsd: 35, operatingSafetyBufferRate: 0.15,
          targetGrossMarginRate: 0.7, creditsPerThbAssumption: 10,
          creditRoundingIncrement: 5, estimateTtlSeconds: 900,
          policyVersion: 'development-poc-test-v1'
        };
      }
    },
    accountRepo: {
      async saveEstimate(value) { savedEstimate = structuredClone(value); return structuredClone(value); },
      async getEstimateById() { return structuredClone(savedEstimate); },
      async reserveCredits(input) {
        reservedAmount = input.amountCredits;
        return { reservation: { reservationId: 'rsv_development_poc' }, account: { availableCredits: 9 } };
      }
    }
  });
  const model = {
    providerId: 'modelark', modelId: 'seedance-poc', billingMetric: 'completion_token',
    ratesByResolutionUsdPerMillionTokens: { '720p': 10.7 }, providerRateVersion: 'unverified-rate',
    pricingStatus: 'research_only', testingRoutingEnabled: true, paidRoutingEnabled: false,
    developmentPocUnverified: true, developmentPocCredits: 1
  };
  const request = {
    operation: 'image_to_video', commercialOperation: 'cinematic_draft_clip', inputMode: 'image_to_video',
    resolution: '720p', aspectRatio: '9:16', durationSeconds: 5, audioMode: 'generated',
    referenceImageCount: 1, referencePlanFingerprint: 'poc-reference-v1'
  };
  const estimate = await service.estimateVideo({
    userId: 'usr_poc', model, request, generationMode: 'cinematic_video'
  });
  assert.equal(estimate.estimatedCredits, 1);
  assert.equal(estimate.chargeMode, 'development_poc_credit');
  assert.equal(estimate.breakdown.developmentPocCredits, 1);
  assert.ok(estimate.breakdown.providerEstimatedCredits > 1);

  await service.validateAndReserveForRequest({
    userId: 'usr_poc', estimateId: estimate.estimateId,
    generationRequest: {
      requestId: 'video:poc:1', routingMode: 'advanced', qualityTier: 'video',
      requestedProviderId: model.providerId, requestedModelId: model.modelId,
      ...request, referenceCount: 1, outputCount: 1, generationMode: 'cinematic_video',
      developmentPocUnverified: true, developmentPocCredits: 1
    },
    metadata: { jobId: 'videotask_poc_1' }
  });
  assert.equal(reservedAmount, 1);
});
