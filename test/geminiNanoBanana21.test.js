import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { GeminiProvider } from '../server/providers/GeminiProvider.js';
import { loadProviderConfig } from '../server/providers/ProviderConfigLoader.js';
import { ProviderRegistry } from '../server/providers/ProviderRegistry.js';
import { ProviderAvailabilityPolicyService } from '../server/domain/admin-configuration/ProviderAvailabilityPolicyService.js';
import { CreditPricingPolicyService } from '../server/domain/credits/CreditPricingPolicyService.js';
import { CreditReservationService } from '../server/domain/credits/CreditReservationService.js';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';

const modelId = 'gemini-nano-banana-2.1';
const policy = JSON.parse(await fs.readFile(new URL('../server/config/credit-pricing-policy.json', import.meta.url), 'utf8'));
const pricing = new CreditPricingPolicyService({ policyData: structuredClone(policy) });
const request = { userId: 'owner', requestedProviderId: 'gemini', requestedModelId: modelId,
  resolution: '1K', aspectRatio: '6:8', referenceCount: 2, outputCount: 1, generationMode: 'scene' };
const withFetch = async (replacement, work) => {
  const original = globalThis.fetch; globalThis.fetch = replacement;
  try { return await work(); } finally { globalThis.fetch = original; }
};

test('adapter: exact stable native request preserves reference order, dimensions and final MIME', async () => {
  for (const size of ['1K','2K','4K']) await withFetch(async (url, options) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
    assert.equal(options.headers['x-goog-api-key'], 'private-fixture-key');
    assert.equal(options.redirect, 'error'); assert.ok(options.signal);
    const body = JSON.parse(options.body);
    assert.equal(body.model, modelId); assert.equal(body.store, false);
    assert.deepEqual(body.generation_config, { thinking_level: 'medium' });
    assert.equal(body.tools, undefined);
    assert.deepEqual(body.response_format, { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '3:4', image_size: size });
    assert.deepEqual(body.input.map(block => block.type), ['text','image','image']);
    assert.deepEqual(body.input.slice(1), [{ type: 'image', mime_type: 'image/jpeg', data: 'identity' },
      { type: 'image', mime_type: 'image/png', data: 'outfit' }]);
    return Response.json({ steps: [
      { type: 'model_thought', content: [{ type: 'image', data: 'thought' }] },
      { type: 'model_output', content: [{ type: 'image', data: 'interim', mime_type: 'image/jpeg' }] },
      { type: 'model_output', content: [{ type: 'image', data: 'final', mime_type: 'image/png' },
        { type: 'image', data: 'thought-after-final', thought: true }] },
    ] });
  }, async () => {
    const result = await new GeminiProvider('private-fixture-key').generateImage('fixture prompt', {
      submodel: modelId, aspectRatio: '6:8', imageResolution: size,
      resolvedReferenceImagesOrdered: ['data:image/jpeg;base64,identity','data:image/png;base64,outfit'],
    });
    assert.equal(result.base64, 'final'); assert.equal(result.mimeType, 'image/png');
  });
});

test('adapter: invalid output parameters and excess references fail before native dispatch', async () => {
  await withFetch(async () => assert.fail('No unsupported dispatch'), async () => {
    for (const options of [{ imageResolution: '0.5K' }, { imageSize: '512' }, { aspectRatio: '4:1' },
      { resolvedReferenceImagesOrdered: Array(7).fill('fixture') }]) {
      await assert.rejects(new GeminiProvider('fixture').generateImage('fixture', { submodel: modelId, ...options }), /unsupported|six application/);
    }
  });
});

test('adapter: provider failure, missing final image and unsafe MIME fail without private error text', async () => {
  for (const response of [Response.json({ error: { message: 'private provider detail' } }, { status: 429 }),
    Response.json({ steps: [{ type: 'model_thought', content: [{ type: 'image', data: 'preview' }] }] }),
    Response.json({ output_image: { data: 'unsafe', mime_type: 'image/svg+xml' } })]) {
    await withFetch(async () => response, async () => {
      await assert.rejects(new GeminiProvider('fixture').generateImage('fixture', { submodel: modelId }), error =>
        /Nano Banana 2.1/.test(error.message) && !error.message.includes('private provider detail'));
    });
  }
});

test('adapter: explicit final output projection and existing stream completion retain image contract', async () => {
  await withFetch(async () => Response.json({ output_image: { data: 'final', mime_type: 'image/jpeg' } }), async () => {
    const events = [];
    const result = await new GeminiProvider('fixture').generateImageStream('fixture', { submodel: modelId }, event => events.push(event));
    assert.equal(result.base64, 'final'); assert.equal(events.length, 1);
    assert.equal(events[0].event, 'image_generation.completed');
  });
});

test('pricing: exact resolution tariff, reference/output multiplication and Template fees are locked inputs', async () => {
  for (const [resolution, base, cost] of [['1K',50,0.0336],['2K',70,0.0504],['4K',155,0.1134]]) {
    const quote = await pricing.calculateEstimate({ ...request, resolution, outputCount: 3,
      templateUseSessionId: 'fixture-template-session', templatePricing: { totalCredits: 14, templateId: 'fixture-template' } });
    assert.equal(quote.breakdown.baseOutputCredits, base);
    assert.equal(quote.estimatedCredits, (base+2)*3+14);
    assert.equal(quote.pricingInputs.resolution, resolution);
    assert.equal(quote.breakdown.costScope, 'image_output_only');
    assert.equal(quote.breakdown.providerCostUsd, Number((cost*3).toFixed(9)));
    assert.equal(quote.estimateConfidence, 'provisional'); assert.equal(quote.breakdown.tokenRates, undefined);
    assert.deepEqual(quote.breakdown.excludedCostComponents, ['input','text_and_thinking','search_grounding']);
    assert.equal(await pricing.calculateMinimumRetailFloor(cost), base);
  }
});

test('pricing: unsupported counts, ratios and sizes cannot fall back to publishedCredits', async () => {
  for (const change of [{ resolution: '0.5K' }, { resolution: '512' }, { resolution: 'unknown' },
    { aspectRatio: '4:1' }, { referenceCount: 7 }, { referenceCount: -1 }, { referenceCount: 0.5 },
    { outputCount: 0 }, { outputCount: 5 }, { outputCount: 1.5 }]) {
    await assert.rejects(pricing.calculateEstimate({ ...request, ...change }), { code: 'credit_pricing_unavailable' });
  }
});

test('pricing: actual temporary reservation preserves accepted charge, foreign denial and idempotent capture/refund', async () => {
  const root = process.env.MPF_NANO21_FIXTURE_ROOT;
  assert.ok(root, 'Run through owning fixture runner.');
  const file = path.join(root, 'nano21-credits.json');
  await fs.writeFile(file, JSON.stringify({ schemaVersion: 2, accounts: [
    { userId: 'owner', availableCredits: 500, reservedCredits: 0, status: 'active' },
  ], estimates: [], reservations: [], ledgerEntries: [] }));
  const accountRepo = new CreditAccountRepository({ databaseFile: file });
  const current = new CreditPricingPolicyService({ policyData: structuredClone(policy) });
  const credits = new CreditReservationService({ accountRepo, pricingPolicyService: current });
  const quote = await credits.estimate(request), generationRequest = { ...request, requestId: 'nano21-fixture' };
  const reserved = await credits.validateAndReserveForRequest({ userId: 'owner', estimateId: quote.estimateId,
    generationRequest, metadata: { jobId: 'fixture-job' } });
  current.policy.models.find(model => model.modelId === modelId).baseCreditsByResolution['1K'] = 999;
  const input = { userId: 'owner', reservationId: reserved.reservation.reservationId, jobId: 'fixture-job' };
  const captured = await credits.captureForJob(input);
  assert.equal(captured.ledgerEntry.amountCredits, 52);
  assert.equal((await credits.captureForJob(input)).ledgerEntry.ledgerEntryId, captured.ledgerEntry.ledgerEntryId);
  await assert.rejects(credits.captureForJob({ ...input, userId: 'foreign' }), { code: 'credit_reservation_not_found' });
  const second = await credits.validateAndReserveForRequest({ userId: 'owner', estimateId: quote.estimateId,
    generationRequest: { ...generationRequest, requestId: 'nano21-failure' }, metadata: { jobId: 'failed-job' } });
  const refund = { userId: 'owner', reservationId: second.reservation.reservationId, jobId: 'failed-job' };
  await credits.refundForJob(refund); await credits.refundForJob(refund);
  assert.equal((await accountRepo.getAccountByUserId('owner')).availableCredits, 448);
});

test('catalog: configured selection exposes exact capabilities while old default and controls remain available', () => {
  const registry = new ProviderRegistry(loadProviderConfig(), { GEMINI_API_KEY: 'fixture' },
    new ProviderAvailabilityPolicyService({ initialState: { schemaVersion: 1, version: 1, providers: {}, models: {}, workflows: {}, history: [] } }));
  const catalog = registry.getPublicCatalog(), provider = catalog.providers.find(item => item.id === 'gemini');
  assert.equal(provider.defaultModel, 'gemini-3.1-flash-lite-image');
  const selected = registry.resolveSelection('gemini', modelId);
  assert.deepEqual(selected.model.capabilities.resolutions, ['1K','2K','4K']);
  assert.equal(selected.model.capabilities.maxReferenceImages, 6);
  assert.equal(provider.models.find(item => item.id === modelId).estimatedCredits, 50);
  registry.validateRequest(selected.model, { imageResolution: '4K', aspectRatio: '6:8', referenceCount: 6 });
  assert.throws(() => registry.validateRequest(selected.model, { imageResolution: '0.5K' }));
  assert.throws(() => registry.validateRequest(selected.model, { referenceCount: 7 }));
  selected.model.enabled = false; assert.throws(() => registry.resolveSelection('gemini', modelId));
  const absent = new ProviderRegistry(loadProviderConfig(), {}, new ProviderAvailabilityPolicyService({ initialState: { version: 1, providers: {}, models: {}, workflows: {} } }));
  assert.throws(() => absent.resolveSelection('gemini', modelId));
});
