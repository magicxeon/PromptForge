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
    model: 'gpt-6-sol',
    reasoningEffort: 'low',
    maxOutputTokens: 800,
    timeoutMs: 1_000
  });

  assert.equal(request.url, 'https://example.test/responses');
  assert.equal(request.body.store, false);
  assert.equal(request.body.model, 'gpt-6-sol');
  assert.equal(request.body.reasoning.effort, 'low');
  assert.equal(request.body.text.format.type, 'json_schema');
  assert.equal(request.body.text.format.strict, true);
  assert.equal(result.refinedPrompt, 'Refined prompt (Image aspect ratio 6:8)');
  assert.equal(result.responseId, 'resp_123');
});

test('OpenAI text provider localizes Attribute labels with a strict locale schema', async () => {
  let request = null;
  const provider = new OpenAITextProvider('test-key', {
    endpoint: 'https://example.test/responses',
    fetchImpl: async (url, options) => {
      request = { url, body: JSON.parse(options.body) };
      return {
        ok: true,
        headers: { get: () => 'req_locale' },
        json: async () => ({ id: 'resp_locale', output_text: JSON.stringify({ th: 'เสื้อโค้ตเอดิทอเรียล' }) })
      };
    }
  });

  const result = await provider.localizeAttribute({
    englishLabel: 'Editorial Coat',
    locales: ['th'],
    model: 'gpt-6-sol',
    reasoningEffort: 'low',
    maxOutputTokens: 300,
    timeoutMs: 1_000
  });

  assert.deepEqual(request.body.text.format.schema.required, ['th']);
  assert.deepEqual(result.translations, { th: 'เสื้อโค้ตเอดิทอเรียล' });
  assert.equal(result.responseId, 'resp_locale');
});

test('OpenAI text provider joins structured output text blocks before parsing', async () => {
  const provider = new OpenAITextProvider('test-key', {
    endpoint: 'https://example.test/responses',
    fetchImpl: async () => ({
      ok: true,
      headers: { get: () => 'req_split' },
      json: async () => ({
        id: 'resp_split',
        status: 'completed',
        output: [{
          content: [
            { type: 'output_text', text: '{"th":"story' },
            { type: 'output_text', text: ' text"}' }
          ]
        }]
      })
    })
  });

  const result = await provider.localizeAttribute({
    englishLabel: 'Story text', locales: ['th'], model: 'test-model',
    reasoningEffort: 'low', maxOutputTokens: 300, timeoutMs: 1_000
  });

  assert.deepEqual(result.translations, { th: 'story text' });
});

test('OpenAI text provider accepts one complete JSON code-fence envelope', async () => {
  const provider = new OpenAITextProvider('test-key', {
    endpoint: 'https://example.test/responses',
    fetchImpl: async () => ({
      ok: true,
      headers: { get: () => 'req_fenced' },
      json: async () => ({ id: 'resp_fenced', status: 'completed', output_text: '```json\n{"th":"story text"}\n```' })
    })
  });

  const result = await provider.localizeAttribute({
    englishLabel: 'Story text', locales: ['th'], model: 'test-model',
    reasoningEffort: 'low', maxOutputTokens: 300, timeoutMs: 1_000
  });

  assert.deepEqual(result.translations, { th: 'story text' });
});

test('OpenAI text provider reports output truncation without exposing partial content', async () => {
  const provider = new OpenAITextProvider('test-key', {
    endpoint: 'https://example.test/responses',
    fetchImpl: async () => ({
      ok: true,
      headers: { get: () => 'req_incomplete' },
      json: async () => ({
        id: 'resp_incomplete',
        status: 'incomplete',
        incomplete_details: { reason: 'max_output_tokens' },
        output: [{ content: [{ type: 'output_text', text: '{"fullStory":"private partial story' }] }]
      })
    })
  });

  await assert.rejects(
    provider.generateCinematicFullStory({
      context: { storyBrief: 'Brief' }, model: 'test-model', reasoningEffort: 'low',
      maxOutputTokens: 8_000, timeoutMs: 1_000
    }),
    error => {
      assert.equal(error.code, 'cinematic_full_story_incomplete_response');
      assert.equal(error.statusCode, 502);
      assert.deepEqual(error.details, { reason: 'max_output_tokens', responseId: 'resp_incomplete' });
      assert.doesNotMatch(error.message, /private partial story/);
      return true;
    }
  );
});

test('OpenAI text provider maps its local deadline to a sanitized gateway timeout', async () => {
  const provider = new OpenAITextProvider('test-key', {
    endpoint: 'https://example.test/responses',
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    })
  });

  await assert.rejects(
    provider.generateCinematicFullStory({
      context: { storyBrief: 'Brief' }, model: 'test-model', reasoningEffort: 'low',
      maxOutputTokens: 8_000, timeoutMs: 5
    }),
    error => {
      assert.equal(error.code, 'cinematic_full_story_timeout');
      assert.equal(error.statusCode, 504);
      assert.deepEqual(error.details, { timeoutMs: 5 });
      return true;
    }
  );
});

test('OpenAI text provider sanitizes nested transport failures with a stable reason', async () => {
  const provider = new OpenAITextProvider('test-key', {
    endpoint: 'https://example.test/responses',
    fetchImpl: async () => {
      throw new TypeError('fetch failed', { cause: Object.assign(new Error('private socket detail'), { code: 'ECONNRESET' }) });
    }
  });

  await assert.rejects(
    provider.generateCinematicSceneShots({
      context: { scene: { title: 'Rain' } }, model: 'test-model', reasoningEffort: 'low',
      maxOutputTokens: 8000, timeoutMs: 1000
    }),
    error => {
      assert.equal(error.code, 'cinematic_scene_shots_transport_error');
      assert.equal(error.statusCode, 503);
      assert.deepEqual(error.details, { reason: 'ECONNRESET' });
      assert.doesNotMatch(error.message, /fetch failed|private socket detail/);
      return true;
    }
  );
});


test('OpenAI text provider separates story output from bounded role-only analysis', async () => {
  let request = null;
  const provider = new OpenAITextProvider('test-key', {
    endpoint: 'https://example.test/responses',
    fetchImpl: async (_url, options) => {
      request = JSON.parse(options.body);
      return {
        ok: true,
        headers: { get: () => 'req_cinematic' },
        json: async () => ({
          id: 'resp_cinematic',
          output_text: JSON.stringify({
            enhancedStoryBrief: 'Two people make a final choice before the train leaves.',
            creativeDirection: 'Restrained visual drama.',
            premise: 'A last meeting', conflict: 'Time is running out',
            emotionalArc: 'Guarded to hopeful', ending: 'They board together',
            candidateScenes: ['Empty platform', 'Train arrival'],
            recommendedRoles: [{
              label: 'Lead', importance: 'required', storyFunction: 'Makes the decision', relationshipHint: 'Former partner',
              objective: 'Choose whether to leave', emotionalArc: 'Guarded to hopeful',
              personalityTraits: ['observant', 'restrained'], performanceDirection: 'Keep tension in the eyes and breath.'
            }],
            warnings: []
          })
        })
      };
    }
  });

  const result = await provider.enhanceCinematicStory({
    story: { storyBrief: 'Two people meet at a station.', durationSeconds: 30 },
    model: 'gpt-5.6-luna', reasoningEffort: 'low', maxOutputTokens: 1_200, timeoutMs: 1_000
  });

  assert.equal(request.store, false);
  assert.equal(request.text.format.name, 'momelo_cinematic_story_enhancement');
  assert.equal(request.text.format.schema.properties.recommendedRoles, undefined);
  assert.ok(request.text.format.schema.properties.enhancedStoryBrief);
  await provider.enhanceCinematicStory({
    story: { storyBrief: 'Two people meet at a station.', purpose: 'roles', storyCountryStyle: 'japan' },
    model: 'test-model', reasoningEffort: 'low', maxOutputTokens: 1200, timeoutMs: 1000
  });
  assert.equal(request.text.format.name, 'momelo_cinematic_story_roles');
  assert.equal(request.text.format.schema.properties.enhancedStoryBrief, undefined);
  assert.equal(request.text.format.schema.properties.creativeDirection, undefined);
  assert.equal(request.text.format.schema.properties.recommendedRoles.maxItems, 4);
  assert.equal(request.text.format.schema.properties.recommendedRoles.items.properties.personalityTraits.maxItems, 6);
  assert.match(request.instructions, /do not rewrite/);
  assert.equal(result.recommendedRoles[0].label, 'Lead');
});
