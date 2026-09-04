import assert from 'node:assert/strict';
import test from 'node:test';
import { GeminiCinematicTextProvider } from '../server/providers/GeminiCinematicTextProvider.js';

test('Gemini Cinematic text provider sends a non-stored structured Interactions request', async () => {
  let request = null;
  const provider = new GeminiCinematicTextProvider('gemini-key', {
    endpoint: 'https://example.test/interactions',
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return {
        ok: true,
        headers: { get: () => 'gemini_req_1' },
        json: async () => ({
          id: 'interaction_1',
          steps: [{
            type: 'model_output',
            content: [{ type: 'text', text: JSON.stringify({ key: 'scene_1', warnings: [] }) }]
          }],
          usage: { total_input_tokens: 100, total_output_tokens: 30 }
        })
      };
    }
  });

  const result = await provider.generateCinematicSceneDirection({
    context: { selectedScene: { id: 'scene_1' } },
    recipe: { instruction: 'Return the Scene contract.' },
    model: 'gemini-3.8-flash',
    reasoningEffort: 'low',
    maxOutputTokens: 8_000,
    timeoutMs: 1_000
  });

  assert.equal(request.url, 'https://example.test/interactions');
  assert.equal(request.body.model, 'gemini-3.8-flash');
  assert.equal(request.body.store, false);
  assert.equal(request.body.system_instruction, 'Return the Scene contract.');
  assert.equal(request.body.response_format.mime_type, 'application/json');
  assert.ok(request.body.response_format.schema.properties.shots);
  assert.ok(request.body.response_format.schema.properties.shots.items.properties.gaze);
  assert.equal(request.body.generation_config.thinking_level, 'low');
  assert.equal(request.body.generation_config.max_output_tokens, 8_000);
  assert.equal(result.key, 'scene_1');
  assert.equal(result.responseId, 'interaction_1');
});

test('Gemini Cinematic text provider exposes stable HTTP failure metadata', async () => {
  const provider = new GeminiCinematicTextProvider('gemini-key', {
    endpoint: 'https://example.test/interactions',
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      headers: { get: name => name === 'x-goog-request-id' ? 'gemini_req_429' : null },
      json: async () => ({ error: { status: 'RESOURCE_EXHAUSTED', message: 'Quota exhausted.' } })
    })
  });

  await assert.rejects(
    provider.generateCinematicStoryPlan({
      context: {}, recipe: { instruction: 'test' }, model: 'gemini-3.8-flash',
      reasoningEffort: 'low', maxOutputTokens: 1_000, timeoutMs: 1_000
    }),
    error => error.code === 'cinematic_story_plan_provider_error'
      && error.status === 429
      && error.providerCode === 'RESOURCE_EXHAUSTED'
      && error.requestId === 'gemini_req_429'
  );
});
