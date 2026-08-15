import assert from 'node:assert/strict';
import test from 'node:test';
import { GeminiProvider } from '../server/providers/GeminiProvider.js';

test('Gemini Pro prioritizes identity, declares references before execution, and returns the final image block', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody = null;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      json: async () => ({
        steps: [
          { type: 'model_output', content: [{ type: 'image', data: 'thought-image' }] },
          { type: 'model_output', content: [{ type: 'text', text: 'done' }, { type: 'image', data: 'final-image' }] }
        ]
      })
    };
  };

  try {
    const provider = new GeminiProvider('test-key');
    const result = await provider.generateImage(
      'Template IMAGE_0, character IMAGE_1, and outfit IMAGE_2.', {
      submodel: 'gemini-3-pro-image',
      imageResolution: '2K',
      resolvedReferenceImagesOrdered: ['proxy-bytes', 'character-bytes', 'outfit-bytes'],
      referenceRoleManifest: [
        { index: 1, roles: ['template_baseline'] },
        { index: 2, roles: ['character_reference'] },
        { index: 3, roles: ['outfit_front'] }
      ]
    });

    assert.equal(result.base64, 'final-image');
    assert.deepEqual(requestBody.input.map(item => item.type), [
      'text', 'text', 'image', 'text', 'image', 'text', 'image', 'text'
    ]);
    assert.match(requestBody.input[0].text, /^REFERENCE AUTHORITY CONTRACT/);
    assert.equal(requestBody.input[1].text, 'IMAGE_0 - CHARACTER IDENTITY');
    assert.equal(requestBody.input[2].data, 'character-bytes');
    assert.equal(requestBody.input[3].text, 'IMAGE_1 - OUTFIT PRODUCT');
    assert.equal(requestBody.input[4].data, 'outfit-bytes');
    assert.equal(requestBody.input[5].text, 'IMAGE_2 - POSE PROXY');
    assert.equal(requestBody.input[6].data, 'proxy-bytes');
    assert.match(requestBody.input[7].text, /^FINAL EXECUTION INSTRUCTION/);
    assert.match(
      requestBody.input[7].text,
      /Template IMAGE_2, character IMAGE_0, and outfit IMAGE_1\./
    );
    assert.equal(requestBody.response_format.image_size, '2K');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Gemini Flash retains the existing text followed by image payload', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody = null;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      json: async () => ({
        steps: [{ type: 'model_output', content: [{ type: 'image', data: 'flash-image' }] }]
      })
    };
  };

  try {
    const provider = new GeminiProvider('test-key');
    await provider.generateImage('Global instruction', {
      submodel: 'gemini-3.1-flash-image',
      resolvedReferenceImagesOrdered: ['proxy-bytes']
    });
    assert.deepEqual(requestBody.input.map(item => item.type), ['text', 'image']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
