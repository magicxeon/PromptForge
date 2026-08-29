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
    model: 'gpt-5.6-luna',
    reasoningEffort: 'low',
    maxOutputTokens: 300,
    timeoutMs: 1_000
  });

  assert.deepEqual(request.body.text.format.schema.required, ['th']);
  assert.deepEqual(result.translations, { th: 'เสื้อโค้ตเอดิทอเรียล' });
  assert.equal(result.responseId, 'resp_locale');
});


test('OpenAI text provider requests a bounded Cinematic story and role plan', async () => {
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
  assert.equal(request.text.format.schema.properties.recommendedRoles.maxItems, 4);
  assert.equal(request.text.format.schema.properties.recommendedRoles.items.properties.personalityTraits.maxItems, 6);
  assert.match(request.instructions, /off-screen notification sender/);
  assert.equal(result.recommendedRoles[0].label, 'Lead');
});
