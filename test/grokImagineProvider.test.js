import assert from 'node:assert/strict';
import test from 'node:test';
import { GrokImagineProvider } from '../server/providers/GrokImagineProvider.js';

const modelConfig = {
  id: 'grok-imagine-image-quality',
  capabilities: {
    maxReferenceImages: 3,
    resolutions: ['1k', '2k']
  },
  aspectRatioMap: {
    '1:1': '1:1',
    '6:8': '3:4'
  },
  defaults: {
    resolution: '1k'
  }
};

function mockJsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: name => name === 'x-request-id' ? 'req_xai_test' : null },
    json: async () => payload
  };
}

test('Grok generation sends a non-streaming base64 request and normalizes output', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return mockJsonResponse({
      data: [{ b64_json: 'OUTPUT', mime_type: 'image/jpeg', revised_prompt: 'revised' }],
      usage: { cost_in_usd_ticks: 50 }
    });
  };

  try {
    const provider = new GrokImagineProvider('secret', { defaultModel: modelConfig.id });
    const result = await provider.generateImage('fashion portrait', {
      submodel: modelConfig.id,
      modelConfig,
      aspectRatio: '6:8'
    });

    assert.equal(captured.url, 'https://api.x.ai/v1/images/generations');
    assert.equal(captured.body.aspect_ratio, '3:4');
    assert.equal(captured.body.response_format, 'b64_json');
    assert.equal(captured.body.resolution, '1k');
    assert.equal(result.base64, 'OUTPUT');
    assert.equal(result.mimeType, 'image/jpeg');
    assert.equal(result.providerMetadata.requestId, 'req_xai_test');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Grok edit sends unique resolved references through the images field', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, body: JSON.parse(options.body) };
    return mockJsonResponse({ data: [{ b64_json: 'EDITED', mime_type: 'image/jpeg' }] });
  };

  try {
    const provider = new GrokImagineProvider('secret', { defaultModel: modelConfig.id });
    await provider.generateImage('preserve character', {
      submodel: modelConfig.id,
      modelConfig,
      aspectRatio: '1:1',
      resolvedCharacterReferenceImageA: 'data:image/jpeg;base64,AAA',
      resolvedFaceReferenceImageA: 'BBB'
    });

    assert.equal(captured.url, 'https://api.x.ai/v1/images/edits');
    assert.equal(captured.body.images.length, 2);
    assert.equal(captured.body.images[0].type, 'image_url');
    assert.equal(captured.body.images[0].url, 'data:image/jpeg;base64,AAA');
    assert.equal(captured.body.images[1].type, 'image_url');
    assert.equal(captured.body.images[1].url, 'data:image/png;base64,BBB');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Grok rejects unsupported reference count before calling the API', async () => {
  const provider = new GrokImagineProvider('secret', { defaultModel: modelConfig.id });
  await assert.rejects(
    provider.generateImage('too many references', {
      submodel: modelConfig.id,
      modelConfig,
      aspectRatio: '1:1',
      resolvedCharacterReferenceImageA: 'A',
      resolvedCharacterReferenceImageB: 'B',
      resolvedFaceReferenceImageA: 'C',
      resolvedStyleReferenceImageA: 'D'
    }),
    /supports up to 3/
  );
});

test('Grok maps moderation failures into the shared safety code', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockJsonResponse({ error: { message: 'Blocked by safety policy' } }, 400);
  try {
    const provider = new GrokImagineProvider('secret', { defaultModel: modelConfig.id });
    await assert.rejects(
      provider.generateImage('blocked', { submodel: modelConfig.id, modelConfig, aspectRatio: '1:1' }),
      error => error.code === 'moderation_blocked' && error.provider === 'xai'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Grok preserves nested xAI validation details', async () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  console.error = () => {};
  globalThis.fetch = async () => mockJsonResponse({ detail: 'Invalid aspect_ratio value' }, 400);
  try {
    const provider = new GrokImagineProvider('secret', { defaultModel: modelConfig.id });
    await assert.rejects(
      provider.generateImage('invalid request', {
        submodel: modelConfig.id,
        modelConfig,
        aspectRatio: '1:1'
      }),
      error => error.code === 'invalid_request' && error.message === 'Invalid aspect_ratio value'
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
});
