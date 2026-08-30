import assert from 'node:assert/strict';
import test from 'node:test';
import { MetaMuseProvider } from '../server/providers/MetaMuseProvider.js';
import { loadProviderConfig, validateProviderConfig } from '../server/providers/ProviderConfigLoader.js';
import { ProviderRegistry, getConfiguredSecret } from '../server/providers/ProviderRegistry.js';

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
      return response({ data: [{ b64_json: 'aW1hZ2U=', mime_type: 'image/png' }], model: 'muse-image-1.0' });
    },
    environment: {}
  });

  const result = await provider.generateImage('a studio portrait');

  assert.equal(captured.url, 'https://api.meta.ai/v1/images/generations');
  assert.deepEqual(captured.body, { model: 'muse-image-1.0', prompt: 'a studio portrait', n: 1 });
  assert.equal(captured.options.headers.Authorization, 'Bearer secret');
  assert.equal(result.base64, 'aW1hZ2U=');
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
    fetchImpl: async () => response({ data: [{ b64_json: 'UFJJVkFURV9JTUFHRQ==' }] }),
    environment: { META_MUSE_DEBUG: 'true' },
    logger: { info: value => entries.push(value) }
  });

  await provider.generateImage('PRIVATE PROMPT');
  const log = entries.join('\n');
  assert.doesNotMatch(log, /PRIVATE PROMPT|SECRET_TOKEN|UFJJVkFURV9JTUFHRQ/);
  assert.match(log, /promptFingerprint/);
});

test('Meta Muse remains dispatch-disabled but is catalog-visible with a stable reason', () => {
  const config = validateProviderConfig(loadProviderConfig());
  const meta = config.providers.find(provider => provider.id === 'meta-muse');
  assert.ok(meta);
  assert.equal(meta.enabled, false);
  assert.equal(meta.models[0].paidRoutingEnabled, false);
  assert.equal(getConfiguredSecret({ 'META_MUSE_API-KEY': 'alias-secret' }, meta), 'alias-secret');

  const catalog = new ProviderRegistry(config, { 'META_MUSE_API-KEY': 'alias-secret' }).getPublicCatalog();
  const publicMeta = catalog.providers.find(provider => provider.id === 'meta-muse');
  assert.ok(publicMeta);
  assert.equal(publicMeta.models[0].paidRoutingEnabled, false);
  assert.equal(publicMeta.models[0].unavailableReason, 'provider_not_released');
  assert.throws(
    () => new ProviderRegistry(config, { 'META_MUSE_API-KEY': 'alias-secret' })
      .resolveSelection('meta-muse', 'muse-image-1.0'),
    /disabled or unknown/
  );
});
