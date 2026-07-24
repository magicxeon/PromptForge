import assert from 'node:assert/strict';
import test from 'node:test';
import { CreditPricingPolicyService } from '../server/domain/credits/CreditPricingPolicyService.js';
import { CreditDomainError } from '../server/domain/credits/creditErrors.js';

test('CreditPricingPolicyService - Floor Derivations (TC-005-RATE-001..003)', async t => {
  const service = new CreditPricingPolicyService();

  // Grok Imagine Standard 1K: provider cost = $0.020
  const grokFloor = await service.calculateMinimumRetailFloor(0.020);
  assert.equal(grokFloor, 30, 'Grok Standard 1K floor should derive 30 credits');

  // Seedream 5.0 Lite: provider cost = $0.035
  const seedreamFloor = await service.calculateMinimumRetailFloor(0.035);
  assert.equal(seedreamFloor, 50, 'Seedream 5.0 Lite floor should derive 50 credits');

  // Gemini 3 Pro Image: provider cost = $0.134
  const geminiProFloor = await service.calculateMinimumRetailFloor(0.134);
  assert.equal(geminiProFloor, 180, 'Gemini 3 Pro floor should derive 180 credits');
});

test('CreditPricingPolicyService - Calculate Estimate for Priced Models (TC-005-001)', async t => {
  const service = new CreditPricingPolicyService();

  const estimate = await service.calculateEstimate({
    requestedProviderId: 'gemini',
    requestedModelId: 'gemini-3.1-flash-lite-image',
    resolution: '1K',
    referenceCount: 1,
    userId: 'usr_demo'
  });

  assert.equal(estimate.pricingPolicyVersion, 'mock-2026-07-24-v2');
  assert.equal(estimate.estimatedCredits, 46); // 45 base + 1 ref
  assert.equal(estimate.breakdown.baseOutputCredits, 45);
  assert.equal(estimate.breakdown.referenceCredits, 1);
  assert.ok(estimate.estimateId.startsWith('est_'));
  assert.ok(new Date(estimate.expiresAt) > new Date());
});

test('CreditPricingPolicyService - Uses OpenAI quality and orientation pricing (TC-005-002)', async t => {
  const service = new CreditPricingPolicyService();

  const estimate = await service.calculateEstimate({
    requestedProviderId: 'openai',
    requestedModelId: 'gpt-image-1-mini',
    qualityTier: 'standard',
    aspectRatio: '6:8',
    userId: 'usr_demo'
  });

  assert.equal(estimate.estimatedCredits, 30);
  assert.equal(estimate.breakdown.baseOutputCredits, 30);
  assert.equal(estimate.pricingInputs.aspectRatio, '6:8');
});

test('CreditPricingPolicyService - Rejects models without a published price (TC-005-003)', async t => {
  const service = new CreditPricingPolicyService();

  await assert.rejects(
    () => service.calculateEstimate({
      requestedProviderId: 'openai',
      requestedModelId: 'dall-e-3',
      userId: 'usr_demo'
    }),
    error => error instanceof CreditDomainError
      && error.code === 'credit_pricing_unavailable'
      && error.statusCode === 400
  );
});
