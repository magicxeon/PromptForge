import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenAIProvider } from '../server/providers/OpenAIProvider.js';
import { loadProviderConfig } from '../server/providers/ProviderConfigLoader.js';
import { ProviderRegistry } from '../server/providers/ProviderRegistry.js';
import { CreditPricingPolicyService } from '../server/domain/credits/CreditPricingPolicyService.js';
import { CreditReservationService } from '../server/domain/credits/CreditReservationService.js';

const ids = ['gpt-image-2.5-sunburst', 'gpt-image-2.5-flare'];
const config = loadProviderConfig();
const provider = new OpenAIProvider('isolated-test-key');

test('adapter: both models and snapshots use correct sizes and retain complete usage', async t => {
  const usage = { input_tokens: 120, output_tokens: 4000, total_tokens: 4120,
    input_tokens_details: { text_tokens: 20, image_tokens: 100 } };
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, request) => {
    requests.push({ url, body: JSON.parse(request.body) });
    return new Response(JSON.stringify({ data: [{ b64_json: 'aW1hZ2U=' }], usage,
      size: '768x1024', quality: 'high', output_format: 'png' }));
  });
  for (const id of ids) for (const model of [id, `${id}-2026-09-08`]) {
    assert.equal(provider.supportsOpenAIImageStreaming(model), false);
    const result = await provider.generateImage('An editorial sheet', { submodel: model, aspectRatio: '6:8', quality: 'high' });
    assert.deepEqual(result.usage, usage);
    assert.equal(result.size, '768x1024');
    assert.equal(result.quality, 'high');
    assert.equal(result.mimeType, 'image/png');
    const request = requests.at(-1);
    assert.equal(request.url, 'https://api.openai.com/v1/images/generations');
    assert.deepEqual(request.body, { model, prompt: 'An editorial sheet', n: 1, size: '768x1024', quality: 'high', output_format: 'png' });
  }
});

test('adapter: edits preserve ordered references and omit unverified optional fidelity', async t => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, request) => {
    requests.push({ url, request });
    return new Response(JSON.stringify({ data: [{ b64_json: 'aW1hZ2U=' }], output_format: 'webp' }));
  });
  for (const id of ids) for (const model of [id, `${id}-2026-09-08`]) {
    const result = await provider.generateImage('Keep identity', { submodel: model, aspectRatio: '4:5',
      resolvedReferenceImagesOrdered: ['b25l', 'dHdv'], quality: 'xhigh', inputFidelity: 'high', outputFormat: 'webp' });
    const { url, request } = requests.at(-1);
    assert.equal(url, 'https://api.openai.com/v1/images/edits');
    assert.equal(request.body.get('model'), model);
    assert.equal(request.body.get('size'), '1024x1280');
    assert.equal(request.body.get('quality'), 'xhigh');
    assert.equal(request.body.has('input_fidelity'), false);
    assert.equal(request.body.has('stream'), false);
    assert.equal(request.body.has('response_format'), false);
    assert.equal(request.headers['Content-Type'], undefined);
    const files = request.body.getAll('image[]');
    assert.deepEqual(await Promise.all(files.map(file => file.text())), ['one', 'two']);
    assert.equal(result.mimeType, 'image/webp');
  }
});

test('adapter: invalid parameters fail before dispatch and provider errors stay errors', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return new Response(JSON.stringify({ error: { message: 'Model unavailable' } }), { status: 403 });
  });
  for (const model of ids) {
    await assert.rejects(provider.generateImage('prompt', { submodel: model, aspectRatio: '5:9' }), /aspect ratio/);
    await assert.rejects(provider.generateImage('prompt', { submodel: model, quality: 'standard' }), /quality/);
  }
  assert.equal(calls, 0);
  await assert.rejects(provider.generateImage('prompt', { submodel: ids[0] }), /Model unavailable/);
  assert.equal(calls, 1);
});

test('catalog: exposed ratios match adapter dimensions and legacy defaults do not change', () => {
  const registry = new ProviderRegistry(config, { OPENAI_API_KEY: 'isolated-test-key' });
  const openai = registry.getPublicCatalog().providers.find(item => item.id === 'openai');
  assert.equal(openai.defaultModel, 'gpt-image-1-mini');
  for (const id of ids) {
    const model = openai.models.find(item => item.id === id);
    assert.equal(model.paidRoutingEnabled, true);
    assert.equal(model.estimatedCredits, 55);
    assert.equal(model.testingRoutingEnabled, false);
    assert.equal(model.unavailableReason, null);
    assert.equal(model.capabilities.streaming, false);
    assert.equal(model.capabilities.maxReferenceImages, 6);
    assert.doesNotThrow(() => registry.resolveSelection('openai', id));
    for (const ratio of model.capabilities.aspectRatios) {
      const [w, h] = provider.resolveOpenAIImageSize(id, ratio).split('x').map(Number);
      const [rw, rh] = ratio.split(':').map(Number);
      assert.equal(w * rh, h * rw);
      assert.equal(w % 16 + h % 16, 0);
      assert.ok(w * h >= 655360 && w * h <= 8294400);
      assert.ok(Math.max(w, h) <= 3840 && Math.max(w / h, h / w) <= 3);
    }
  }
  assert.equal(provider.resolveOpenAIImageSize('gpt-image-1.5', '6:8'), '1024x1536');
  assert.equal(provider.resolveOpenAIImageSize('gpt-image-2', '6:8'), '768x1024');
});

test('pricing: measured tariff pins real rate evidence and does not masquerade as next-job actual cost', async () => {
  const pricing = new CreditPricingPolicyService({ environment: { NODE_ENV: 'test' } });
  const policy = await pricing.loadPolicy();
  for (const id of ids) {
    const record = policy.models.find(item => item.modelId === id);
    assert.equal(record.pricingStatus, 'priced');
    assert.equal(record.publishedCredits, 55);
    assert.equal(record.testingOnly, undefined);
    assert.equal(record.providerCostUsd, undefined);
    assert.equal(record.tokenRateEvidence.imageOutput, 30);
    assert.equal(record.tokenRateEvidence.textInput, 5);
    assert.equal(record.tokenRateEvidence.imageInput, 8);
    assert.equal(record.tokenRateEvidence.cachedImageInput, 2);
    assert.equal(record.tokenRateEvidence.cachedTextInput, 1.25);
    for (const referenceCount of [0, 1, 2]) for (const outputCount of [1, 2]) {
      const quote = await pricing.calculateEstimate({
        userId: 'owner', requestedProviderId: 'openai', requestedModelId: id, referenceCount, outputCount, aspectRatio: '6:8'
      });
      assert.equal(quote.estimatedCredits, (referenceCount ? id.endsWith('sunburst') ? 70 : 75 : 55) * outputCount);
      assert.equal(quote.breakdown.testingOnly, undefined);
      assert.equal(quote.breakdown.costBasis, 'measured_usage_baseline');
      assert.equal(quote.estimateConfidence, 'provisional');
      assert.equal(quote.breakdown.tokenRates.imageOutput, 30);
    }
  }
});

test('catalog: production can select both measured-price models', () => {
  const registry = new ProviderRegistry(config, { NODE_ENV: 'production', OPENAI_API_KEY: 'isolated-test-key' });
  for (const id of ids) {
    const model = registry.getPublicCatalog().providers.find(item => item.id === 'openai').models.find(item => item.id === id);
    assert.equal(model.testingRoutingEnabled, false);
    assert.equal(model.unavailableReason, null);
    assert.doesNotThrow(() => registry.resolveSelection('openai', id));
  }
});

test('pricing: production rejects unmeasured parameters instead of falling back to one credit', async () => {
  for (const NODE_ENV of ['production', 'staging']) for (const id of ids) {
    const pricing = new CreditPricingPolicyService({ environment: { NODE_ENV } });
    await assert.rejects(pricing.calculateEstimate({ userId: 'owner', requestedProviderId: 'openai', requestedModelId: id }),
      { code: 'credit_pricing_unavailable' });
    const measured = await pricing.calculateEstimate({ userId: 'owner', requestedProviderId: 'openai', requestedModelId: id, aspectRatio: '3:4' });
    assert.equal(measured.estimatedCredits, 55);
  }
});

test('pricing: persisted test-tariff quotes require new consent after measured pricing activation', async () => {
  const development = new CreditPricingPolicyService({ environment: { NODE_ENV: 'development' } });
  const estimate = await development.calculateEstimate({ userId: 'owner', requestedProviderId: 'openai', requestedModelId: ids[0], aspectRatio: '6:8' });
  estimate.breakdown = { testingOnly: true, totalCredits: 1 };
  estimate.estimatedCredits = 1;
  const service = new CreditReservationService({
    pricingPolicyService: new CreditPricingPolicyService({ environment: { NODE_ENV: 'production' } }),
    accountRepo: { getEstimateById: async () => estimate, reserveCredits: async () => assert.fail('must not reserve') }
  });
  await assert.rejects(service.validateAndReserveForRequest({ userId: 'owner', estimateId: estimate.estimateId,
    generationRequest: { requestId: 'req-test' }, metadata: { jobId: 'job-test' } }), { code: 'credit_estimate_stale' });
});
