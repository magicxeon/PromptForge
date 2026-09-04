import {
  CINEMATIC_SCENE_DIRECTION_SCHEMA,
  CINEMATIC_STORY_PLAN_SCHEMA
} from './cinematicTextSchemas.js';

export {
  CINEMATIC_SCENE_DIRECTION_SCHEMA,
  CINEMATIC_STORY_PLAN_SCHEMA
} from './cinematicTextSchemas.js';

const RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';

const REFINEMENT_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['refinedPrompt', 'changeSummary', 'warnings', 'preservedAuthorities'],
  properties: {
    refinedPrompt: { type: 'string' },
    changeSummary: { type: 'array', items: { type: 'string' } },
    warnings: { type: 'array', items: { type: 'string' } },
    preservedAuthorities: { type: 'array', items: { type: 'string' } }
  }
});

const SYSTEM_INSTRUCTION = [
  'You are Momelo Prompt Director, a production editor for photorealistic image prompts.',
  'Rewrite the canonical English prompt for clarity, natural physical coherence, and realistic photography.',
  'Preserve every explicit identity, body, wardrobe, pose, camera, framing, environment, lighting, reference-authority, output-count, and aspect-ratio decision.',
  'Resolve prose repetition and soft wording conflicts without changing the selected destination.',
  'Do not add people, garments, accessories, props, locations, light sources, camera decisions, labels, or output layouts.',
  'Return only the requested structured result.'
].join(' ');

const CINEMATIC_STORY_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['enhancedStoryBrief', 'creativeDirection', 'premise', 'conflict', 'emotionalArc', 'ending', 'candidateScenes', 'recommendedRoles', 'warnings'],
  properties: {
    enhancedStoryBrief: { type: 'string' },
    creativeDirection: { type: 'string' },
    premise: { type: 'string' },
    conflict: { type: 'string' },
    emotionalArc: { type: 'string' },
    ending: { type: 'string' },
    candidateScenes: { type: 'array', maxItems: 5, items: { type: 'string' } },
    recommendedRoles: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'label', 'importance', 'storyFunction', 'relationshipHint', 'objective',
          'emotionalArc', 'personalityTraits', 'performanceDirection'
        ],
        properties: {
          label: { type: 'string' },
          importance: { type: 'string', enum: ['required', 'optional'] },
          storyFunction: { type: 'string' },
          relationshipHint: { type: 'string' },
          objective: { type: 'string' },
          emotionalArc: { type: 'string' },
          personalityTraits: { type: 'array', maxItems: 6, items: { type: 'string' } },
          performanceDirection: { type: 'string' }
        }
      }
    },
    warnings: { type: 'array', maxItems: 8, items: { type: 'string' } }
  }
});

const CINEMATIC_STORY_INSTRUCTION = [
  'You are Momelo Cinematic Story Director for short-form professional video.',
  'Convert the supplied brief into one coherent, production-ready story direction that fits the exact duration, platform, genre, pacing, audience feeling and ending intent.',
  'Preserve the user premise and do not invent branded products, copyrighted characters, graphic content or unnecessary cast.',
  'Recommend only the smallest on-screen cast needed, between one and four roles. Roles are story slots, never named real actors.',
  'Create a role only for a visibly present person who needs a stable Character identity. Never create roles for an off-screen notification sender, an unreadable message source, a disembodied voice, a mentioned person, background crowd, or implied memory unless that person visibly appears in the film.',
  'For every role, provide a practical objective, concise emotional arc, up to six playable personality traits, and restrained performance direction that can seed the Cast dossier.',
  'The enhancedStoryBrief must be concise and at most 600 characters. creativeDirection must be at most 800 characters.',
  'Candidate scenes must be filmable and ordered. Return only the requested structured result.'
].join(' ');

const CINEMATIC_WARDROBE_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: [
    'lookName', 'wardrobeDirection', 'garments', 'palette', 'materials',
    'sceneScope', 'recommendedSceneIds', 'rationale', 'movementConstraints',
    'continuityNotes', 'warnings'
  ],
  properties: {
    lookName: { type: 'string' },
    wardrobeDirection: { type: 'string' },
    garments: {
      type: 'object',
      additionalProperties: false,
      required: ['upper', 'lower', 'outerwear', 'footwear', 'accessories'],
      properties: {
        upper: { type: 'string' },
        lower: { type: 'string' },
        outerwear: { type: 'string' },
        footwear: { type: 'string' },
        accessories: { type: 'array', maxItems: 6, items: { type: 'string' } }
      }
    },
    palette: { type: 'array', maxItems: 6, items: { type: 'string' } },
    materials: { type: 'array', maxItems: 8, items: { type: 'string' } },
    sceneScope: { type: 'string', enum: ['film_wide', 'scene_specific'] },
    recommendedSceneIds: { type: 'array', maxItems: 12, items: { type: 'string' } },
    rationale: { type: 'string' },
    movementConstraints: { type: 'array', maxItems: 8, items: { type: 'string' } },
    continuityNotes: { type: 'array', maxItems: 8, items: { type: 'string' } },
    warnings: { type: 'array', maxItems: 8, items: { type: 'string' } }
  }
});

export class OpenAITextProvider {
  constructor(apiKey, {
    fetchImpl = globalThis.fetch,
    endpoint = RESPONSES_ENDPOINT
  } = {}) {
    if (!apiKey) throw createProviderError('prompt_refinement_api_key_missing', 'OpenAI API key is required.');
    if (typeof fetchImpl !== 'function') {
      throw createProviderError('prompt_refinement_transport_missing', 'Fetch transport is unavailable.');
    }
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.endpoint = endpoint;
  }

  async refinePrompt({
    prompt,
    context,
    model,
    reasoningEffort,
    maxOutputTokens,
    timeoutMs
  }) {
    const payload = await this.requestStructured({
      model,
      instructions: SYSTEM_INSTRUCTION,
      input: { canonicalPrompt: prompt, executionContext: context },
      reasoningEffort,
      schemaName: 'momelo_prompt_refinement',
      schema: REFINEMENT_SCHEMA,
      maxOutputTokens,
      timeoutMs,
      errorPrefix: 'prompt_refinement'
    });
    const parsed = parseStructuredOutput(payload);
    return { ...parsed, responseId: payload?.id || null, usage: payload?.usage || null };
  }

  async localizeAttribute({ englishLabel, locales, model, reasoningEffort, maxOutputTokens, timeoutMs }) {
    const localeCodes = [...new Set((locales || []).map(value => String(value || '').trim()).filter(Boolean))];
    const schema = {
      type: 'object',
      additionalProperties: false,
      required: localeCodes,
      properties: Object.fromEntries(localeCodes.map(locale => [locale, { type: 'string' }]))
    };
    const payload = await this.requestStructured({
      model,
      instructions: [
        'You localize concise Momelo visual-attribute labels for professional creative software.',
        'Translate the English label faithfully and naturally for each requested locale.',
        'Keep product names and technical fashion meaning precise. Do not add explanations.',
        'Return only the requested structured result.'
      ].join(' '),
      input: { englishLabel, locales: localeCodes },
      reasoningEffort,
      schemaName: 'momelo_attribute_localization',
      schema,
      maxOutputTokens,
      timeoutMs,
      errorPrefix: 'attribute_localization'
    });
    const translations = parseJsonOutput(payload, 'attribute_localization');
    if (localeCodes.some(locale => typeof translations[locale] !== 'string' || !translations[locale].trim())) {
      throw createProviderError('attribute_localization_invalid_response', 'Attribute localization response is incomplete.');
    }
    return {
      translations: Object.fromEntries(localeCodes.map(locale => [locale, translations[locale].trim()])),
      responseId: payload?.id || null,
      usage: payload?.usage || null
    };
  }

  async enhanceCinematicStory({ story, model, reasoningEffort, maxOutputTokens, timeoutMs }) {
    const payload = await this.requestStructured({
      model,
      instructions: CINEMATIC_STORY_INSTRUCTION,
      input: story,
      reasoningEffort,
      schemaName: 'momelo_cinematic_story_enhancement',
      schema: CINEMATIC_STORY_SCHEMA,
      maxOutputTokens,
      timeoutMs,
      errorPrefix: 'cinematic_story_enhancement'
    });
    const result = parseJsonOutput(payload, 'cinematic_story_enhancement');
    return { ...result, responseId: payload?.id || null, usage: payload?.usage || null };
  }

  async suggestCinematicWardrobe({ context, recipe, model, reasoningEffort, maxOutputTokens, timeoutMs }) {
    const payload = await this.requestStructured({
      model,
      instructions: recipe.instruction,
      input: context,
      reasoningEffort,
      schemaName: 'momelo_cinematic_wardrobe_suggestion',
      schema: CINEMATIC_WARDROBE_SCHEMA,
      maxOutputTokens,
      timeoutMs,
      errorPrefix: 'cinematic_wardrobe_suggestion'
    });
    const result = parseJsonOutput(payload, 'cinematic_wardrobe_suggestion');
    return { ...result, responseId: payload?.id || null, usage: payload?.usage || null };
  }

  async generateCinematicStoryPlan({ context, recipe, model, reasoningEffort, maxOutputTokens, timeoutMs }) {
    const payload = await this.requestStructured({
      model,
      instructions: recipe.instruction,
      input: context,
      reasoningEffort,
      schemaName: 'momelo_cinematic_story_plan',
      schema: CINEMATIC_STORY_PLAN_SCHEMA,
      maxOutputTokens,
      timeoutMs,
      errorPrefix: 'cinematic_story_plan'
    });
    const result = parseJsonOutput(payload, 'cinematic_story_plan');
    return { ...result, responseId: payload?.id || null, usage: payload?.usage || null };
  }

  async generateCinematicSceneDirection({ context, recipe, model, reasoningEffort, maxOutputTokens, timeoutMs }) {
    const payload = await this.requestStructured({
      model,
      instructions: recipe.instruction,
      input: context,
      reasoningEffort,
      schemaName: 'momelo_cinematic_scene_direction',
      schema: CINEMATIC_SCENE_DIRECTION_SCHEMA,
      maxOutputTokens,
      timeoutMs,
      errorPrefix: 'cinematic_scene_direction'
    });
    const result = parseJsonOutput(payload, 'cinematic_scene_direction');
    return { ...result, responseId: payload?.id || null, usage: payload?.usage || null };
  }

  async requestStructured({
    model,
    instructions,
    input,
    reasoningEffort,
    schemaName,
    schema,
    maxOutputTokens,
    timeoutMs,
    errorPrefix
  }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          store: false,
          instructions,
          input: JSON.stringify(input),
          reasoning: { effort: reasoningEffort },
          text: {
            format: { type: 'json_schema', name: schemaName, strict: true, schema },
            verbosity: 'low'
          },
          max_output_tokens: maxOutputTokens
        }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const error = createProviderError(
          `${errorPrefix}_provider_error`,
          payload?.error?.message || `OpenAI Responses API returned HTTP ${response.status}.`
        );
        error.status = response.status;
        error.requestId = response.headers?.get?.('x-request-id') || null;
        error.providerCode = payload?.error?.code || null;
        error.providerType = payload?.error?.type || null;
        throw error;
      }
      return payload;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw createProviderError(`${errorPrefix}_timeout`, `${humanizeErrorPrefix(errorPrefix)} timed out.`);
      }
      if (error?.code) throw error;
      throw createProviderError(
        `${errorPrefix}_transport_error`,
        error?.message || `${humanizeErrorPrefix(errorPrefix)} failed.`
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function parseStructuredOutput(payload) {
  const value = parseJsonOutput(payload, 'prompt_refinement');
  if (
    !value
    || typeof value.refinedPrompt !== 'string'
    || !Array.isArray(value.changeSummary)
    || !Array.isArray(value.warnings)
    || !Array.isArray(value.preservedAuthorities)
    || ![value.changeSummary, value.warnings, value.preservedAuthorities]
      .every(items => items.every(item => typeof item === 'string'))
  ) {
    throw createProviderError('prompt_refinement_invalid_response', 'Prompt refinement response does not match its schema.');
  }
  return value;
}

function parseJsonOutput(payload, errorPrefix) {
  const raw = typeof payload?.output_text === 'string'
    ? payload.output_text
    : payload?.output
      ?.flatMap(item => Array.isArray(item?.content) ? item.content : [])
      .find(item => item?.type === 'output_text')?.text;
  if (!raw) {
    throw createProviderError(`${errorPrefix}_empty_response`, `${humanizeErrorPrefix(errorPrefix)} returned no structured output.`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw createProviderError(`${errorPrefix}_invalid_response`, `${humanizeErrorPrefix(errorPrefix)} returned invalid JSON.`);
  }
}

function humanizeErrorPrefix(value) {
  return String(value || '').replaceAll('_', ' ').replace(/^./, character => character.toUpperCase());
}

function createProviderError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
