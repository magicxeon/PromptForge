import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { CreditPricingPolicyService } from '../server/domain/credits/CreditPricingPolicyService.js';
import { CreditReservationService } from '../server/domain/credits/CreditReservationService.js';
import { selectImagePixelTier } from '../server/domain/credits/BytePlusImagePricing.js';
import { calculateVideoPricingPreview } from '../server/domain/credits/VideoPricingCalculator.js';
import { VideoCapabilityRegistry } from '../server/domain/generation/VideoCapabilityRegistry.js';
import { buildFinanceInventory } from '../server/domain/finance/FinanceInventoryService.js';

const read = name => JSON.parse(fs.readFileSync(new URL(`../server/config/${name}`, import.meta.url), 'utf8'));
const policy = read('credit-pricing-policy.json');
const catalog = read('cinematic-video-models.json');
const pro = policy.models.find(item => item.modelId === 'dola-seedream-5-0-pro-260628');
const video = suffix => catalog.models.find(item => item.modelId === suffix);
const sd25 = video('dreamina-seedance-2-5-260628');
const request = { resolution: '720p', aspectRatio: '9:16', durationSeconds: 5, audioMode: 'generated' };
const imageInput = { requestedProviderId: 'modelark', requestedModelId: pro.modelId, userId: 'test', aspectRatio: '6:8' };
const at = now => ({ now });

test('image: exact pixel boundary and one pixel above select different rates', () => {
  assert.equal(selectImagePixelTier(pro.providerCostPricing.outputTiers, 2610000).usdPerImage, 0.045);
  assert.equal(selectImagePixelTier(pro.providerCostPricing.outputTiers, 2610001).usdPerImage, 0.09);
  assert.throws(() => selectImagePixelTier([], 100), /invalid/);
  assert.throws(() => selectImagePixelTier(pro.providerCostPricing.outputTiers.map(tier => ({ ...tier, usdPerImage: 0 })), 100), /invalid/);
});

test('image: provider-mapped pixels select low/high credits across ratios', async () => {
  const service = new CreditPricingPolicyService();
  for (const aspectRatio of ['1:1', '9:16', '16:9', '6:8', '4:5']) {
    for (const resolution of ['1K', '2K']) {
      const estimate = await service.calculateEstimate({ ...imageInput, resolution, aspectRatio });
      assert.equal(estimate.estimatedCredits, resolution === '1K' ? 60 : 120);
      assert.equal(estimate.breakdown.providerCostUsd, resolution === '1K' ? 0.045 : 0.09);
      assert.equal(estimate.breakdown.costBasis, 'requested_pixels');
      assert.equal(estimate.breakdown.requestedPixels > 2610000, resolution === '2K');
    }
  }
});

test('image: first reference free, later references and separate outputs accounted once', async () => {
  const service = new CreditPricingPolicyService();
  for (const referenceCount of [0, 1, 3]) {
    const estimate = await service.calculateEstimate({ ...imageInput, resolution: '2K', referenceCount, outputCount: 2 });
    assert.equal(estimate.estimatedCredits, referenceCount === 3 ? 260 : 240);
    assert.equal(estimate.breakdown.providerCostUsd, referenceCount === 3 ? 0.192 : 0.18);
    assert.equal(estimate.breakdown.billableReferencesPerRequest, Math.max(0, referenceCount - 1));
  }
});

test('image: auto uses an explicit provisional upper bound; unmapped dimensions fail closed', async () => {
  const service = new CreditPricingPolicyService();
  const estimate = await service.calculateEstimate({ ...imageInput, resolution: '1K', aspectRatio: 'auto' });
  assert.equal(estimate.estimatedCredits, 120);
  assert.equal(estimate.estimateConfidence, 'provisional');
  assert.equal(estimate.breakdown.costBasis, 'upper_bound_auto_size');
  assert.equal(estimate.breakdown.requestedPixels, null);
  await assert.rejects(service.calculateEstimate({ ...imageInput, resolution: 'unknown' }), { code: 'credit_pricing_unavailable' });
});

test('video: Seedance 2.5 promotion starts inclusive and ends exclusive, 720p unaffected', () => {
  const before = calculateVideoPricingPreview(sd25, { ...request, resolution: '1080p' }, policy, at('2026-08-14T05:59:59Z'));
  const start = calculateVideoPricingPreview(sd25, { ...request, resolution: '1080p' }, policy, at('2026-08-14T06:00:00Z'));
  const end = calculateVideoPricingPreview(sd25, { ...request, resolution: '1080p' }, policy, at('2026-09-17T06:00:00Z'));
  assert.equal(before.tokenRateUsdPerMillion, 11.7);
  assert.equal(start.tokenRateUsdPerMillion, 8.424);
  assert.equal(end.tokenRateUsdPerMillion, 11.7);
  assert.ok(start.providerRateVersion.includes(start.discountId));
  const firstFrame = calculateVideoPricingPreview(sd25, { ...request, inputMode: 'image_to_video', referenceImageCount: 2 }, policy, at('2026-09-08'));
  assert.equal(firstFrame.tokenRateUsdPerMillion, 10.7);
  assert.equal(firstFrame.discountId, null);
  assert.equal(sd25.paidRoutingEnabled, false);
  assert.ok(!sd25.resolutions.includes('1080p'));
});

test('video: Fast and Mini promotions use precise rates through October 7', () => {
  for (const [id, rate, list] of [['dreamina-seedance-2-0-mini-260615', 1.4, 3.5], ['dreamina-seedance-2-0-fast-260128', 4.2, 5.6]]) {
    const model = video(id);
    const original = JSON.stringify(model);
    assert.equal(calculateVideoPricingPreview(model, request, policy, at('2026-10-07T05:59:59Z')).tokenRateUsdPerMillion, rate);
    assert.equal(calculateVideoPricingPreview(model, request, policy, at('2026-10-07T06:00:00Z')).tokenRateUsdPerMillion, list);
    assert.equal(JSON.stringify(model), original);
  }
});

test('video: missing video-input floor fails closed, configured floor and input rates are honored', () => {
  assert.throws(() => calculateVideoPricingPreview(sd25, { ...request, inputVideoSeconds: 2 }, policy), /minimum token floor/);
  const model = { ...sd25, minimumInputVideoTokens: { '1080p': { '9:16': { 5: 500000 } } } };
  const result = calculateVideoPricingPreview(model, { ...request, resolution: '1080p', inputVideoSeconds: 2 }, policy, at('2026-09-08'));
  assert.equal(result.tokenRateUsdPerMillion, 5.04);
  assert.equal(result.estimatedCompletionTokens, 500000);
});

test('video: invalid quantities, unavailable rates and offline requests cannot produce NaN or free quotes', () => {
  for (const override of [{ durationSeconds: -1 }, { fps: 0 }, { outputCount: Infinity }, { outputCount: 0 }, { inputVideoSeconds: -1 }, { resolution: '8K' }, { serviceTier: 'offline' }]) {
    assert.throws(() => calculateVideoPricingPreview(sd25, { ...request, ...override }, policy));
  }
  const malformed = { ...sd25, providerDiscounts: [{ ...sd25.providerDiscounts[0], endsAt: 'invalid' }] };
  assert.throws(() => calculateVideoPricingPreview(malformed, request, policy), /discount is invalid/);
});

test('integration: discounted quote pins rate evidence and expiry; changing config cannot rewrite it', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-17T05:59:30Z').getTime() });
  const saved = [];
  const service = new CreditReservationService({ pricingPolicyService: new CreditPricingPolicyService({ policyData: policy }),
    accountRepo: { saveEstimate: async value => { saved.push(structuredClone(value)); return value; } } });
  const model = structuredClone(sd25);
  const quote = await service.estimateVideo({ userId: 'test', model, generationMode: 'cinematic_video', request: { ...request, resolution: '1080p' } });
  assert.equal(quote.breakdown.tokenRateUsdPerMillion, 8.424);
  assert.equal(quote.expiresAt, '2026-09-17T06:00:00.000Z');
  model.ratesByResolutionAndInputModeUsdPerMillionTokens['1080p'].without_video = 99;
  assert.equal(saved[0].breakdown.tokenRateUsdPerMillion, 8.424);
  assert.equal(quote.chargeMode, 'qualification_no_charge');
  t.mock.timers.setTime(Date.parse(quote.expiresAt));
  await assert.rejects(service.validateAndReserveForRequest({
    userId: 'test', estimateId: quote.estimateId,
    generationRequest: { requestId: 'test-request' }, metadata: { jobId: 'test-job' }
  }), { code: 'credit_estimate_expired' });
});

test('integration: Finance exposes cost dimensions; public video catalog hides internal rate rules', () => {
  const inventory = buildFinanceInventory({ providers: [], version: 0 }, policy, catalog);
  const image = inventory.rows.find(row => row.modelId === pro.modelId);
  assert.ok(image.rates.some(rate => rate.dimension.endsWith('usdPerImage') && rate.value === '0.09'));
  assert.ok(image.rates.some(rate => rate.dimension === 'inputImages.usdPerImage' && rate.value === '0.003'));
  const registry = new VideoCapabilityRegistry({ availabilityPolicy: { getVersion: () => 0, evaluate: () => ({ enabled: true }) } });
  const publicModel = registry.getPublicCatalog({ includeResearch: true }).models.find(item => item.modelId === sd25.modelId);
  assert.ok(publicModel);
  assert.equal(publicModel.ratesByResolutionAndInputModeUsdPerMillionTokens, undefined);
  assert.equal(publicModel.providerDiscounts, undefined);
});
