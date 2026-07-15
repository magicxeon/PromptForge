import assert from 'node:assert/strict';
import test from 'node:test';
import { ModelArkSeedreamProvider } from '../server/providers/ModelArkSeedreamProvider.js';

const modelConfig = {
  id: 'seedream-5-0-lite-260128',
  capabilities: {
    maxReferenceImages: 14,
    outputFormats: ['png', 'jpeg'],
    resolutions: ['2K', '3K', '4K']
  },
  defaults: {
    resolution: '2K',
    responseFormat: 'b64_json',
    outputFormat: 'png',
    watermark: false
  }
};

const seedreamFourConfig = {
  id: 'seedream-4-0-250828',
  capabilities: {
    maxReferenceImages: 14,
    supportsOutputFormatParameter: false,
    outputFormats: ['jpeg'],
    resolutions: ['1K', '2K', '4K']
  },
  defaults: {
    resolution: '2K',
    responseFormat: 'b64_json',
    outputFormat: 'jpeg',
    watermark: false
  }
};

function mockJsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: name => name === 'x-request-id' ? 'req_modelark_test' : null },
    json: async () => payload
  };
}

test('ModelArk sends b64_json image generation request and normalizes output', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return mockJsonResponse({
      data: [{ b64_json: 'OUTPUT', size: '2K' }],
      usage: { total_tokens: 12 }
    });
  };

  try {
    const provider = new ModelArkSeedreamProvider('secret', { defaultModel: modelConfig.id });
    const result = await provider.generateImage('fashion product image', {
      submodel: modelConfig.id,
      modelConfig
    });

    assert.equal(captured.url, 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations');
    assert.equal(captured.body.model, modelConfig.id);
    assert.equal(captured.body.size, '2K');
    assert.equal(captured.body.response_format, 'b64_json');
    assert.equal(captured.body.output_format, 'png');
    assert.equal(captured.body.watermark, false);
    assert.equal(captured.body.stream, false);
    assert.equal(result.base64, 'OUTPUT');
    assert.equal(result.mimeType, 'image/png');
    assert.equal(result.providerMetadata.requestId, 'req_modelark_test');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ModelArk uses modelConfig id when queued options omit submodel', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return mockJsonResponse({
      data: [{ b64_json: 'OUTPUT', size: '2K' }]
    });
  };

  try {
    const provider = new ModelArkSeedreamProvider('secret', { defaultModel: seedreamFourConfig.id });
    await provider.generateImage('fashion product image', { modelConfig });

    assert.equal(captured.body.model, modelConfig.id);
    assert.equal(captured.body.output_format, 'png');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ModelArk omits output_format for Seedream 4 models', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return mockJsonResponse({
      data: [{ b64_json: 'OUTPUT', size: '2K' }]
    });
  };

  try {
    const provider = new ModelArkSeedreamProvider('secret', { defaultModel: seedreamFourConfig.id });
    const result = await provider.generateImage('fashion product image', {
      submodel: seedreamFourConfig.id,
      modelConfig: seedreamFourConfig
    });

    assert.equal(captured.body.model, seedreamFourConfig.id);
    assert.equal(captured.body.size, '2K');
    assert.equal(captured.body.response_format, 'b64_json');
    assert.equal(Object.hasOwn(captured.body, 'output_format'), false);
    assert.equal(result.mimeType, 'image/jpeg');
    assert.equal(result.outputFormat, 'jpeg');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ModelArk maps sensitive output failures into moderation_blocked', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockJsonResponse({
    error: {
      code: 'OutputImageSensitiveContentDetected',
      message: 'The request failed because the output image may contain sensitive information.'
    }
  }, 400);

  try {
    const provider = new ModelArkSeedreamProvider('secret', { defaultModel: seedreamFourConfig.id });
    await assert.rejects(
      () => provider.generateImage('portrait prompt', {
        submodel: seedreamFourConfig.id,
        modelConfig: seedreamFourConfig
      }),
      error => error.code === 'moderation_blocked' && error.retryable === false
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ModelArk maps multiple resolved references to image array', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, body: JSON.parse(options.body) };
    return mockJsonResponse({ data: [{ b64_json: 'OUTPUT' }] });
  };

  try {
    const provider = new ModelArkSeedreamProvider('secret', { defaultModel: modelConfig.id });
    await provider.generateImage('blend references', {
      submodel: modelConfig.id,
      modelConfig,
      resolvedCharacterReferenceImageA: 'data:image/jpeg;base64,AAA',
      resolvedStyleReferenceImageA: 'BBB'
    });

    assert.equal(captured.body.image.length, 2);
    assert.equal(captured.body.image[0], 'data:image/jpeg;base64,AAA');
    assert.equal(captured.body.image[1], 'data:image/png;base64,BBB');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ModelArk downloads temporary URL responses before returning normalized result', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (String(url).includes('/images/generations')) {
      return mockJsonResponse({ data: [{ url: 'https://example.test/generated.png' }] });
    }
    return {
      ok: true,
      status: 200,
      headers: { get: name => name === 'content-type' ? 'image/png' : null },
      arrayBuffer: async () => Buffer.from('DOWNLOADED')
    };
  };

  try {
    const provider = new ModelArkSeedreamProvider('secret', { defaultModel: modelConfig.id });
    const result = await provider.generateImage('url response', {
      submodel: modelConfig.id,
      modelConfig
    });

    assert.equal(calls.length, 2);
    assert.equal(result.base64, Buffer.from('DOWNLOADED').toString('base64'));
    assert.equal(result.mimeType, 'image/png');
    assert.equal(result.providerMetadata.sourceUrlReturned, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
