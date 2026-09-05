import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { MetaMuseProvider } from '../server/providers/MetaMuseProvider.js';
import { loadProviderConfig, validateProviderConfig } from '../server/providers/ProviderConfigLoader.js';
import { ProviderRegistry, getConfiguredSecret } from '../server/providers/ProviderRegistry.js';
import { GenerationApplicationService } from '../server/domain/generation/GenerationApplicationService.js';
import { CreditPricingPolicyService } from '../server/domain/credits/CreditPricingPolicyService.js';

const pngBytes = await sharp({ create: { width: 16, height: 12, channels: 3, background: '#ab3344' } }).png().toBuffer();
const pngBase64 = pngBytes.toString('base64');

test('Playground Muse request reaches canonical reservation and queue with matching ratio and model', async () => {
  const config = loadProviderConfig();
  const registry = new ProviderRegistry(config, { NODE_ENV: 'test', META_MUSE_API_KEY: 'mock-key' });
  const events = [];
  let queued;
  const service = new GenerationApplicationService({
    providerRegistry: registry, templateCoreService: {},
    queueManager: {
      createJobId: () => 'mock-muse-job',
      enqueue: (...args) => { events.push('enqueue'); queued = args; }
    },
    creditService: {
      validateAndReserveForRequest: async input => {
        events.push('reserve');
        assert.equal(input.generationRequest.requestedModelId, 'muse-image-1.0');
        assert.equal(input.generationRequest.aspectRatio, '9:16');
        assert.equal(input.generationRequest.referenceCount, 0);
        return { reservation: { reservationId: 'mock-reservation', amountCredits: 15, pricingSnapshot: { totalCredits: 15 } } };
      }
    },
    castingExportService: { validateGenerationContext: async () => {} },
    promptRefinementService: { refine: async ({ prompt, requested }) => {
      assert.equal(requested, false);
      return { prompt, metadata: { applied: false } };
    } },
    telemetry: { start: () => () => {} }
  });
  const result = await service.submit({
    body: {
      provider: 'meta-muse', submodel: 'muse-image-1.0', generationSurface: 'playground', generationMode: 'playground',
      mode: 'normal', aspectRatio: '9:16', outputCount: 1, estimateId: 'mock-estimate',
      sceneBuilder: { authoringMode: 'manual', manualPromptText: 'A red ceramic mug' }
    },
    actorContext: { userId: 'usr_test', username: 'test' }, requestId: 'mock-request'
  });
  assert.deepEqual(events, ['reserve', 'enqueue']);
  assert.equal(result.reservation.amountCredits, 15);
  assert.equal(result.providerStreaming, false);
  assert.equal(queued[0], 'meta-muse');
  assert.equal(queued[1], 'muse-image-1.0');
  assert.equal(queued[3].generationSurface, 'playground');
  const provider = new MetaMuseProvider('mock-key', config.providers.find(item => item.id === 'meta-muse'), {
    environment: {}, fetchImpl: async (_url, options) => {
      assert.equal(JSON.parse(options.body).size, '864x1536');
      return response({ data: [{ b64_json: pngBase64 }], output_format: 'png' });
    }
  });
  const image = await provider.generateImage(queued[2], { ...queued[3], submodel: queued[1] });
  assert.equal(image.mimeType, 'image/png');
  assert.equal(image.base64, pngBase64);
});

test('Muse reads top-level output format and preserves original WebP, PNG and JPEG bytes', async () => {
  const config = loadProviderConfig().providers.find(provider => provider.id === 'meta-muse');
  for (const outputFormat of ['webp', 'png', 'jpeg']) {
    const bytes = await sharp(pngBytes).toFormat(outputFormat).toBuffer();
    let body;
    const provider = new MetaMuseProvider('test', config, {
      environment: {}, fetchImpl: async (_url, options) => {
        body = JSON.parse(options.body);
        return response({ data: [{ b64_json: bytes.toString('base64') }], output_format: outputFormat });
      }
    });
    const result = await provider.generateImage('A red mug', { aspectRatio: '9:16' });
    assert.equal(body.size, '864x1536');
    assert.equal(body.n, 1);
    assert.equal(body.response_format, 'b64_json');
    assert.equal(body.output_format, 'webp');
    assert.equal(result.mimeType, `image/${outputFormat}`);
    assert.deepEqual(Buffer.from(result.base64, 'base64'), bytes);
  }
});

test('Muse rejects corrupt images and mismatched format metadata without retrying', async () => {
  for (const payload of [
    { data: [{ b64_json: Buffer.from('not an image').toString('base64') }], output_format: 'webp' },
    { data: [{ b64_json: pngBase64 }], output_format: 'webp' },
    { data: [{ b64_json: pngBase64 }], output_format: 'gif' },
    { data: [{ b64_json: pngBase64 }, { b64_json: pngBase64 }], output_format: 'png' }
  ]) {
    const provider = new MetaMuseProvider('test', {}, { environment: {}, fetchImpl: async () => response(payload) });
    await assert.rejects(provider.generateImage('A mug'), error => error.code === 'provider_response_invalid' && !error.retryable);
  }
});

test('Muse rejects an unmapped ratio before provider dispatch', async () => {
  const config = loadProviderConfig().providers.find(provider => provider.id === 'meta-muse');
  const provider = new MetaMuseProvider('test', config, {
    environment: {}, fetchImpl: () => assert.fail('No provider dispatch expected')
  });
  await assert.rejects(provider.generateImage('A mug', { aspectRatio: '100:1' }), error => error.code === 'invalid_request');
});

test('Muse surface policy rejects other workflows even when provider is enabled', async () => {
  const config = loadProviderConfig();
  const muse = config.providers.find(provider => provider.id === 'meta-muse');
  muse.enabled = true;
  const registry = new ProviderRegistry(config, { 'META_MUSE_API-KEY': 'test-secret' });
  assert.equal(registry.resolveSelection('meta-muse', 'muse-image-1.0', { generationSurface: 'playground' }).model.id, 'muse-image-1.0');
  for (const generationSurface of [undefined, 'cinematic', 'studio', 'fashion', 'template_pose_proxy']) {
    assert.throws(() => registry.resolveSelection('meta-muse', 'muse-image-1.0', { generationSurface }),
      error => error.code === 'provider_surface_unsupported');
  }
  const service = new GenerationApplicationService({
    providerRegistry: registry,
    queueManager: { createJobId() { assert.fail('No queue operation expected'); } },
    templateCoreService: {},
    creditService: { reserve() { assert.fail('No Credit mutation expected'); } },
    telemetry: { start: () => () => {} }
  });
  await assert.rejects(service.submit({
    body: { provider: 'meta-muse', submodel: 'muse-image-1.0', generationSurface: 'cinematic' },
    actorContext: { userId: 'usr_test', username: 'test' }, requestId: 'test-no-dispatch'
  }), error => error.code === 'provider_surface_unsupported');
  assert.deepEqual(registry.getPublicCatalog().providers[0].models[0].allowedGenerationSurfaces, ['playground']);
});

test('Muse surface configuration rejects empty, duplicate and unknown surface lists', () => {
  for (const value of [[], ['playground', 'playground'], ['unknown'], 'playground']) {
    const config = loadProviderConfig();
    config.providers.find(provider => provider.id === 'meta-muse').models[0].allowedGenerationSurfaces = value;
    assert.throws(() => validateProviderConfig(config), /allowedGenerationSurfaces/);
  }
});

test('Muse documented flat cost is published at 15 Credits per returned image', async () => {
  const service = new CreditPricingPolicyService();
  const policy = structuredClone(await service.loadPolicy());
  const record = policy.models.find(model => model.providerId === 'meta-muse');
  assert.equal(record.providerCostUsd, 0.01);
  assert.equal(await service.calculateMinimumRetailFloor(record.providerCostUsd), 15);
  assert.equal(record.publishedCredits, 15);
  assert.equal(record.enabled, true);
  assert.equal(record.pricingStatus, 'priced');
  assert.equal((await service.findModelPricing('meta-muse', 'muse-image-1.0')).publishedCredits, 15);
  record.enabled = true;
  record.pricingStatus = 'priced';
  const preparedPolicy = new CreditPricingPolicyService({ policyData: policy });
  for (const outputCount of [1, 2, 4]) {
    const estimate = await preparedPolicy.calculateEstimate({
      userId: 'usr_test', requestedProviderId: 'meta-muse', requestedModelId: 'muse-image-1.0',
      outputCount, generationMode: 'playground'
    });
    assert.equal(estimate.estimatedCredits, 15 * outputCount);
    assert.equal(estimate.breakdown.textCredits, 0);
  }
});

test('Muse failure fixtures terminate without an automatic second request', async () => {
  for (const [status, payload, code] of [
    [401, { error: { message: 'Invalid API key' } }, 'authentication_failed'],
    [429, { error: { message: 'Rate limit exceeded' } }, 'rate_limited'],
    [400, { error: { message: 'Safety policy rejected request' } }, 'moderation_blocked'],
    [200, { data: [] }, 'provider_response_invalid'],
    [200, { data: [{ b64_json: '' }] }, 'provider_response_invalid']
  ]) {
    let calls = 0;
    const provider = new MetaMuseProvider('test', {}, {
      fetchImpl: async () => { calls += 1; return response(payload, status); }, environment: {}
    });
    await assert.rejects(provider.generateImage('A red mug'), error => error.code === code && error.retryable === false);
    assert.equal(calls, 1);
  }
});

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: name => name === 'x-request-id' ? 'req_meta_test' : null },
    json: async () => payload
  };
}

test('Meta Muse sends only the verified create fields and normalizes base64 output', async () => {
  let captured;
  const provider = new MetaMuseProvider('secret', { defaultModel: 'muse-image-1.0' }, {
    fetchImpl: async (url, options) => {
      captured = { url, options, body: JSON.parse(options.body) };
      return response({ data: [{ b64_json: pngBase64 }], output_format: 'png', model: 'muse-image-1.0' });
    },
    environment: {}
  });

  const result = await provider.generateImage('a studio portrait');

  assert.equal(captured.url, 'https://api.meta.ai/v1/images/generations');
  assert.deepEqual(captured.body, { model: 'muse-image-1.0', prompt: 'a studio portrait', n: 1, response_format: 'b64_json', output_format: 'webp' });
  assert.equal(captured.options.headers.Authorization, 'Bearer secret');
  assert.equal(result.base64, pngBase64);
  assert.equal(result.mimeType, 'image/png');
  assert.equal(result.providerMetadata.requestId, 'req_meta_test');
});

test('Meta Muse rejects references before transport', async () => {
  let called = false;
  const provider = new MetaMuseProvider('secret', {}, {
    fetchImpl: async () => { called = true; return response({}); },
    environment: {}
  });

  await assert.rejects(
    provider.generateImage('keep this face', { resolvedFaceReferenceImageA: 'PRIVATE' }),
    error => error.code === 'invalid_request'
  );
  assert.equal(called, false);
});

test('Meta Muse debug output excludes prompt, secret and image bytes', async () => {
  const entries = [];
  const provider = new MetaMuseProvider('SECRET_TOKEN', {}, {
    fetchImpl: async () => response({ data: [{ b64_json: pngBase64 }], output_format: 'png' }),
    environment: { META_MUSE_DEBUG: 'true' },
    logger: { info: value => entries.push(value) }
  });

  await provider.generateImage('PRIVATE PROMPT');
  const log = entries.join('\n');
  assert.doesNotMatch(log, /PRIVATE PROMPT|SECRET_TOKEN|UFJJVkFURV9JTUFHRQ/);
  assert.equal(log.includes(pngBase64), false);
  assert.match(log, /promptFingerprint/);
});

test('Meta Muse permits development testing but rejects production and staging dispatch', () => {
  const config = validateProviderConfig(loadProviderConfig());
  const meta = config.providers.find(provider => provider.id === 'meta-muse');
  assert.ok(meta);
  assert.equal(meta.enabled, true);
  assert.equal(meta.models[0].paidRoutingEnabled, false);
  assert.equal(getConfiguredSecret({ 'META_MUSE_API-KEY': 'alias-secret' }, meta), 'alias-secret');

  const catalog = new ProviderRegistry(config, { 'META_MUSE_API-KEY': 'alias-secret' }).getPublicCatalog();
  const publicMeta = catalog.providers.find(provider => provider.id === 'meta-muse');
  assert.ok(publicMeta);
  assert.equal(publicMeta.models[0].paidRoutingEnabled, false);
  assert.equal(publicMeta.models[0].testingRoutingEnabled, true);
  assert.equal(publicMeta.models[0].unavailableReason, null);
  for (const NODE_ENV of ['production', 'staging']) {
    const registry = new ProviderRegistry(config, { NODE_ENV, 'META_MUSE_API-KEY': 'alias-secret' });
    assert.equal(registry.getPublicCatalog().providers[0].models[0].testingRoutingEnabled, false);
    assert.throws(() => registry.resolveSelection('meta-muse', 'muse-image-1.0', { generationSurface: 'playground' }),
      error => error.code === 'provider_not_released');
  }
});
