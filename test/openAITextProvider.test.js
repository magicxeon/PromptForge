import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenAITextProvider } from '../server/providers/OpenAITextProvider.js';

test('OpenAI text provider sends a non-stored structured Responses API request', async () => {
  let request = null;
  const provider = new OpenAITextProvider('test-key', {
    endpoint: 'https://example.test/responses',
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return {
        ok: true,
        headers: { get: () => 'req_123' },
        json: async () => ({
          id: 'resp_123',
          usage: { input_tokens: 20, output_tokens: 10, total_tokens: 30 },
          output: [{
            content: [{
              type: 'output_text',
              text: JSON.stringify({
                refinedPrompt: 'Refined prompt (Image aspect ratio 6:8)',
                changeSummary: ['Improved physical coherence'],
                warnings: [],
                preservedAuthorities: ['identity', 'wardrobe']
              })
            }]
          }]
        })
      };
    }
  });

  const result = await provider.refinePrompt({
    prompt: 'Canonical prompt (Image aspect ratio 6:8)',
    context: { generationMode: 'scene' },
    model: 'gpt-5.6-luna',
    reasoningEffort: 'low',
    maxOutputTokens: 800,
    timeoutMs: 1_000
  });

  assert.equal(request.url, 'https://example.test/responses');
  assert.equal(request.body.store, false);
  assert.equal(request.body.model, 'gpt-5.6-luna');
  assert.equal(request.body.text.format.type, 'json_schema');
  assert.equal(request.body.text.format.strict, true);
  assert.equal(result.refinedPrompt, 'Refined prompt (Image aspect ratio 6:8)');
  assert.equal(result.responseId, 'resp_123');
});
