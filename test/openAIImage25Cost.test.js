import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CreditPricingPolicyService } from '../server/domain/credits/CreditPricingPolicyService.js';
import { CreditReservationService } from '../server/domain/credits/CreditReservationService.js';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';
import { calculateImageTokenCost } from '../server/domain/credits/OpenAIImage25Pricing.js';
import { buildFinanceInventory } from '../server/domain/finance/FinanceInventoryService.js';

const pricing = new CreditPricingPolicyService();
const policy = await pricing.loadPolicy();
const models = policy.models.filter(model => model.measuredUsagePricing);
const request = { userId: 'owner', requestedProviderId: 'openai', requestedModelId: 'gpt-image-2.5-sunburst',
  resolution: '1K', aspectRatio: '6:8', quality: null, referenceCount: 2, outputCount: 1, generationMode: 'scene' };

test('all four reported jobs reproduce modality-specific USD and existing retail floors', () => {
  const expected = [[0.039420, 0.051357], [0.039210, 0.055068]];
  models.forEach((model, index) => {
    const profile = model.measuredUsagePricing;
    [profile.textOnly, profile.withReferences].forEach((sample, mode) => {
      const cost = calculateImageTokenCost(sample.usage, model.tokenRateEvidence);
      assert.equal(cost.providerCostUsd, expected[index][mode]);
      assert.equal(pricing.calculateMinimumRetailFloorFromPolicy(cost.providerCostUsd, policy), mode ? index ? 75 : 70 : 55);
    });
  });
});

test('invalid or ambiguous usage is unknown; explicitly split cached tokens use their own rates', () => {
  const model = models[0], usage = structuredClone(model.measuredUsagePricing.withReferences.usage);
  for (const input of [null, {}, { ...usage, total_tokens: 0 }, { ...usage, output_tokens: -1 },
    { ...usage, input_tokens_details: { ...usage.input_tokens_details, cached_tokens: 100 } }]) {
    assert.equal(calculateImageTokenCost(input, model.tokenRateEvidence), null);
  }
  usage.input_tokens_details.cached_tokens = 150;
  usage.input_tokens_details.cached_tokens_details = { text_tokens: 100, image_tokens: 50 };
  assert.equal(calculateImageTokenCost(usage, model.tokenRateEvidence).providerCostUsd, 0.050682);
});

test('unmeasured requests fail closed while count multiplication, reference buckets and template fees stay consistent', async () => {
  for (const overrides of [{ aspectRatio: '1:1' }, { aspectRatio: '16:9' }, { resolution: '2K' },
    { quality: 'high' }, { referenceCount: 3 }, { referenceCount: 0.5 }, { outputCount: 0 }, { outputCount: 5 }]) {
    await assert.rejects(pricing.calculateEstimate({ ...request, ...overrides }), { code: 'credit_pricing_unavailable' });
  }
  const quote = await pricing.calculateEstimate({ ...request, outputCount: 2, templatePricing: { totalCredits: 14 } });
  assert.equal(quote.estimatedCredits, 154);
  assert.equal(quote.breakdown.providerCostUsd, 0.102714);
  assert.equal(quote.breakdown.retailAssumptions.pricingFxThbPerUsd, 35);
  assert.equal((await pricing.calculateEstimate({ ...request, referenceCount: 1 })).estimatedCredits, 70);
});

test('Finance inventory exposes token units/rates rather than a fabricated universal per-image cost', () => {
  const inventory = buildFinanceInventory({ providers: [] }, policy, { models: [] });
  for (const model of models) {
    const row = inventory.rows.find(item => item.modelId === model.modelId);
    assert.equal(row.billingMetric, 'image_tokens');
    assert.equal(row.coverage, 'configured');
    assert.ok(row.rates.some(rate => rate.dimension === 'tokenRateEvidence.imageInput' && rate.value === '8'));
  }
});

test('old test quotes are rejected for both group and plan reservations before any debit', async () => {
  const estimate = await pricing.calculateEstimate({ ...request, referenceCount: 0 });
  estimate.breakdown = { testingOnly: true, totalCredits: 1 };
  estimate.estimatedCredits = 1;
  const service = new CreditReservationService({ pricingPolicyService: pricing, accountRepo: {
    getEstimateById: async () => estimate, reserveCreditPlan: async () => assert.fail('No debit before new consent')
  } });
  const generationRequest = { ...request, referenceCount: 0, requestId: 'old' };
  await assert.rejects(service.reserveGenerationGroup({ userId: 'owner', estimateId: estimate.estimateId,
    generationRequest, groupId: 'group', children: [{ jobId: 'child' }] }), { code: 'credit_estimate_stale' });
  await assert.rejects(service.reservePlan({ userId: 'owner', quoteId: 'quote', planId: 'plan', idempotencyKey: 'old-plan',
    operations: [{ estimateId: estimate.estimateId, generationRequest, jobId: 'child' }] }), { code: 'credit_estimate_stale' });
});

test('real reservation capture pins usage cost, charges only consented amount, rejects foreign replay and refunds once', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mpf-image25-cost-'));
  try {
    const databaseFile = path.join(directory, 'credits.json');
    await writeFile(databaseFile, JSON.stringify({ schemaVersion: 2, accounts: [
      { userId: 'owner', availableCredits: 500, reservedCredits: 0, status: 'active' }
    ], estimates: [], reservations: [], ledgerEntries: [] }));
    const accountRepo = new CreditAccountRepository({ databaseFile });
    const service = new CreditReservationService({ accountRepo, pricingPolicyService: pricing });
    const quote = await service.estimate(request);
    const generationRequest = { ...request, requestId: 'request-cost' };
    const reserved = await service.validateAndReserveForRequest({ userId: 'owner', estimateId: quote.estimateId,
      generationRequest, metadata: { jobId: 'job-cost' } });
    const usage = models[0].measuredUsagePricing.withReferences.usage;
    const input = { userId: 'owner', reservationId: reserved.reservation.reservationId, jobId: 'job-cost', usage };
    const originalRate = models[0].tokenRateEvidence.imageOutput;
    let result;
    try {
      models[0].tokenRateEvidence.imageOutput = 999;
      result = await service.captureForJob(input);
    } finally { models[0].tokenRateEvidence.imageOutput = originalRate; }
    assert.equal(result.ledgerEntry.amountCredits, 70);
    assert.equal(result.ledgerEntry.metadata.providerCostEvidence.providerCostUsd, 0.051357);
    const duplicate = await service.captureForJob({ ...input, usage: null });
    assert.equal(duplicate.ledgerEntry.ledgerEntryId, result.ledgerEntry.ledgerEntryId);
    assert.equal(duplicate.ledgerEntry.metadata.providerCostEvidence.providerCostUsd, 0.051357);
    await assert.rejects(service.captureForJob({ ...input, userId: 'other' }), { code: 'credit_reservation_not_found' });
    assert.equal((await accountRepo.getAccountByUserId('owner')).availableCredits, 430);
    const second = await service.validateAndReserveForRequest({ userId: 'owner', estimateId: quote.estimateId,
      generationRequest: { ...generationRequest, requestId: 'failed-request' }, metadata: { jobId: 'failed-job' } });
    const refund = { userId: 'owner', reservationId: second.reservation.reservationId, jobId: 'failed-job' };
    await service.refundForJob(refund); await service.refundForJob(refund);
    assert.equal((await accountRepo.getAccountByUserId('owner')).availableCredits, 430);
    const third = await service.validateAndReserveForRequest({ userId: 'owner', estimateId: quote.estimateId,
      generationRequest: { ...generationRequest, requestId: 'missing-usage' }, metadata: { jobId: 'missing-usage' } });
    const missing = await service.captureForJob({ userId: 'owner', reservationId: third.reservation.reservationId, jobId: 'missing-usage' });
    assert.equal(missing.ledgerEntry.amountCredits, 70);
    assert.equal(missing.ledgerEntry.metadata.providerCostEvidence.providerCostUsd, null);
    assert.equal(missing.ledgerEntry.metadata.providerCostEvidence.costBasis, 'unavailable');
    const lowFunds = await service.estimate({ ...request, outputCount: 4 });
    await assert.rejects(service.validateAndReserveForRequest({ userId: 'owner', estimateId: lowFunds.estimateId,
      generationRequest: { ...generationRequest, outputCount: 4, requestId: 'low-funds' }, metadata: { jobId: 'low-funds' } })
      .then(() => service.validateAndReserveForRequest({ userId: 'owner', estimateId: lowFunds.estimateId,
        generationRequest: { ...generationRequest, outputCount: 4, requestId: 'no-funds' }, metadata: { jobId: 'no-funds' } })),
      { code: 'credit_insufficient' });
    const historical = await accountRepo.reserveCredits({ userId: 'owner', amountCredits: 1, estimateId: 'old-test',
      requestId: 'old-test', jobId: 'old-test', pricingSnapshot: { providerId: 'openai', modelId: request.requestedModelId,
        breakdown: { testingOnly: true }, pricingPolicyVersion: 'historical-test-tariff' } });
    const capturedOld = await service.captureForJob({ userId: 'owner', reservationId: historical.reservation.reservationId,
      jobId: 'old-test', usage });
    assert.equal(capturedOld.ledgerEntry.amountCredits, 1);
    assert.equal(capturedOld.ledgerEntry.metadata.providerCostEvidence, undefined);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
