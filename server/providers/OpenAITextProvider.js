import { loadPromptRecipe } from '../config/prompt-recipes/loadPromptRecipe.js';
import { storyAuthoringConfiguration } from '../config/cinematicStoryConfiguration.js';
import {
  CINEMATIC_SCENE_ENVIRONMENT_SCHEMA,
  CINEMATIC_SCENE_DIRECTION_SCHEMA,
  CINEMATIC_SCENE_SHOTS_SCHEMA,
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

const CINEMATIC_FULL_STORY_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['fullStory', 'characters', 'warnings'],
  properties: {
    fullStory: { type: 'string' },
    characters: {
      type: 'array',
      maxItems: 24,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['existingCharacterId', 'displayName', 'storyRole', 'storyImportance', 'objective', 'motivation', 'pressure', 'personalityTraits', 'emotionalBaseline', 'dialogueStyle', 'performanceDirection'],
        properties: {
          existingCharacterId: { type: ['string', 'null'] },
          displayName: { type: 'string' },
          storyRole: { type: 'string' },
          storyImportance: { type: 'string', enum: ['protagonist', 'supporting'] },
          objective: { type: 'string' },
          motivation: { type: 'string' },
          pressure: { type: 'string' },
          personalityTraits: { type: 'array', maxItems: 6, items: { type: 'string' } },
          emotionalBaseline: { type: 'string' },
          dialogueStyle: { type: 'string' },
          performanceDirection: { type: 'string' }
        }
      }
    },
    warnings: { type: 'array', maxItems: 8, items: { type: 'string' } }
  }
});

const CINEMATIC_CHAPTERS_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['chapters', 'warnings'],
  properties: {
    chapters: {
      type: 'array',
      minItems: 1,
      maxItems: 24,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'story'],
        properties: { title: { type: 'string' }, story: { type: 'string' } }
      }
    },
    warnings: { type: 'array', maxItems: 8, items: { type: 'string' } }
  }
});

const CINEMATIC_CHAPTER_SCENES_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['scenes', 'warnings'],
  properties: {
    scenes: {
      type: 'array',
      minItems: 1,
      maxItems: 24,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title', 'synopsis', 'purpose', 'objective', 'location', 'time', 'weather',
          'environment', 'entryState', 'exitState', 'emotionalStart', 'emotionalEnd',
          'transitionIntent', 'targetDurationSeconds', 'dialogueTargetPercent', 'characterIds'
        ],
        properties: {
          title: { type: 'string' },
          synopsis: { type: 'string' },
          purpose: { type: 'string', enum: ['dialogue', 'action', 'montage', 'establishing', 'atmosphere', 'transition', 'dramatic'] },
          objective: { type: 'string' },
          location: { type: 'string' },
          time: { type: 'string' },
          weather: { type: 'string' },
          environment: { type: 'string' },
          entryState: { type: 'string' },
          exitState: { type: 'string' },
          emotionalStart: { type: 'string' },
          emotionalEnd: { type: 'string' },
          transitionIntent: { type: 'string' },
          targetDurationSeconds: { type: 'integer', minimum: 5, maximum: 120 },
          dialogueTargetPercent: { type: 'integer', minimum: 0, maximum: 100 },
          characterIds: { type: 'array', maxItems: 24, items: { type: 'string' } }
        }
      }
    },
    warnings: { type: 'array', maxItems: 8, items: { type: 'string' } }
  }
});

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

  async enhanceLookSheet({ input, instructions, schema, model, reasoningEffort, maxOutputTokens, timeoutMs }) {
    const payload = await this.requestStructured({ input, instructions, schema, model, reasoningEffort,
      maxOutputTokens, timeoutMs, schemaName: 'momelo_look_sheet_enhancement', errorPrefix: 'look_sheet_enhancement' });
    if (payload?.status !== 'completed') throw createProviderError('enhancement_incomplete', 'Enhancement did not complete.');
    return { ...parseJsonOutput(payload, 'look_sheet_enhancement'), usage: payload.usage || null, responseId: payload.id || null };
  }

  async enhanceCinematicStory({ story, model, reasoningEffort, maxOutputTokens, timeoutMs }) {
    const rolesOnly = story.purpose === 'roles';
    const properties = rolesOnly ? {
      recommendedRoles: CINEMATIC_STORY_SCHEMA.properties.recommendedRoles,
      warnings: CINEMATIC_STORY_SCHEMA.properties.warnings
    } : Object.fromEntries(Object.entries(CINEMATIC_STORY_SCHEMA.properties).filter(([key]) => key !== 'recommendedRoles'));
    const payload = await this.requestStructured({
      model,
      instructions: loadPromptRecipe(rolesOnly ? 'cinematic/story-role-analysis.v1.json' : 'cinematic/story-enhancement.v1.json').instruction,
      input: { ...story, authoringLimits: storyAuthoringConfiguration.limits },
      reasoningEffort,
      schemaName: rolesOnly ? 'momelo_cinematic_story_roles' : 'momelo_cinematic_story_enhancement',
      schema: { type: 'object', additionalProperties: false, required: Object.keys(properties), properties },
      maxOutputTokens,
      timeoutMs,
      errorPrefix: 'cinematic_story_enhancement'
    });
    const result = parseJsonOutput(payload, 'cinematic_story_enhancement');
    return { ...result, responseId: payload?.id || null, usage: payload?.usage || null };
  }

  async generateCinematicFullStory({ context, model, reasoningEffort, maxOutputTokens, timeoutMs }) {
    const payload = await this.requestStructured({
      model,
      instructions: loadPromptRecipe('cinematic/full-story.v1.json').instruction,
      input: context,
      reasoningEffort,
      schemaName: 'momelo_cinematic_full_story',
      schema: CINEMATIC_FULL_STORY_SCHEMA,
      maxOutputTokens,
      timeoutMs,
      errorPrefix: 'cinematic_full_story'
    });
    return { ...parseJsonOutput(payload, 'cinematic_full_story'), responseId: payload?.id || null, usage: payload?.usage || null };
  }

  async generateCinematicChapters({ context, model, reasoningEffort, maxOutputTokens, timeoutMs }) {
    const payload = await this.requestStructured({
      model,
      instructions: loadPromptRecipe('cinematic/full-story-chapters.v1.json').instruction,
      input: context,
      reasoningEffort,
      schemaName: 'momelo_cinematic_full_story_chapters',
      schema: CINEMATIC_CHAPTERS_SCHEMA,
      maxOutputTokens,
      timeoutMs,
      errorPrefix: 'cinematic_full_story_chapters'
    });
    return { ...parseJsonOutput(payload, 'cinematic_full_story_chapters'), responseId: payload?.id || null, usage: payload?.usage || null };
  }

  async generateCinematicChapterOutline({ context, model, reasoningEffort, maxOutputTokens, timeoutMs }) {
    const payload = await this.requestStructured({
      model, input: context, reasoningEffort, maxOutputTokens, timeoutMs,
      instructions: loadPromptRecipe('cinematic/chapter-outline.v1.json').instruction,
      schemaName: 'momelo_cinematic_chapter_outline',
      schema: { type: 'object', additionalProperties: false, required: ['rationale', 'chapters', 'warnings'], properties: {
        rationale: { type: 'string' }, warnings: { type: 'array', items: { type: 'string' } },
        chapters: { type: 'array', items: { type: 'object', additionalProperties: false,
          required: ['title', 'synopsis', 'seasonNumber'], properties: {
            title: { type: 'string' }, synopsis: { type: 'string' }, seasonNumber: { type: 'integer' }
          } } }
      } }, errorPrefix: 'cinematic_chapter_outline'
    });
    return { ...parseJsonOutput(payload, 'cinematic_chapter_outline'), responseId: payload?.id || null, usage: payload?.usage || null };
  }

  async extractCinematicStoryCharacters({ context, model, reasoningEffort, maxOutputTokens, timeoutMs }) {
    const payload = await this.requestStructured({
      model, input: context, reasoningEffort, maxOutputTokens, timeoutMs,
      instructions: loadPromptRecipe('cinematic/full-story-characters.v1.json').instruction,
      schemaName: 'momelo_cinematic_story_characters',
      schema: {
        type: 'object', additionalProperties: false, required: ['characters', 'warnings'],
        properties: {
          characters: CINEMATIC_FULL_STORY_SCHEMA.properties.characters,
          warnings: CINEMATIC_FULL_STORY_SCHEMA.properties.warnings
        }
      },
      errorPrefix: 'cinematic_full_story_characters'
    });
    return { ...parseJsonOutput(payload, 'cinematic_full_story_characters'), responseId: payload?.id || null, usage: payload?.usage || null };
  }

  async generateCinematicChapterScenes({ context, model, reasoningEffort, maxOutputTokens, timeoutMs }) {
    const payload = await this.requestStructured({
      model,
      instructions: loadPromptRecipe('cinematic/chapter-scenes.v1.json').instruction,
      input: context,
      reasoningEffort,
      schemaName: 'momelo_cinematic_chapter_scenes',
      schema: CINEMATIC_CHAPTER_SCENES_SCHEMA,
      maxOutputTokens,
      timeoutMs,
      errorPrefix: 'cinematic_chapter_scenes'
    });
    return { ...parseJsonOutput(payload, 'cinematic_chapter_scenes'), responseId: payload?.id || null, usage: payload?.usage || null };
  }

  async generateCinematicSceneShots({ context, model, reasoningEffort, maxOutputTokens, timeoutMs }) {
    const payload = await this.requestStructured({
      model,
      instructions: loadPromptRecipe('cinematic/scene-shots.v1.json').instruction,
      input: context,
      reasoningEffort,
      schemaName: 'momelo_cinematic_scene_shots',
      schema: CINEMATIC_SCENE_SHOTS_SCHEMA,
      maxOutputTokens,
      timeoutMs,
      errorPrefix: 'cinematic_scene_shots'
    });
    return { ...parseJsonOutput(payload, 'cinematic_scene_shots'), responseId: payload?.id || null, usage: payload?.usage || null };
  }

  async generateCinematicSceneEnvironment({ context, model, reasoningEffort, maxOutputTokens, timeoutMs }) {
    const payload = await this.requestStructured({
      model,
      instructions: loadPromptRecipe('cinematic/scene-environment.v1.json').instruction,
      input: context,
      reasoningEffort,
      schemaName: 'momelo_cinematic_scene_environment',
      schema: CINEMATIC_SCENE_ENVIRONMENT_SCHEMA,
      maxOutputTokens,
      timeoutMs,
      errorPrefix: 'cinematic_scene_environment'
    });
    return { ...parseJsonOutput(payload, 'cinematic_scene_environment'), responseId: payload?.id || null, usage: payload?.usage || null };
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
        throw createProviderError(
          `${errorPrefix}_timeout`,
          `${humanizeErrorPrefix(errorPrefix)} timed out.`,
          504,
          { timeoutMs }
        );
      }
      if (error?.isProviderError) throw error;
      throw createProviderError(
        `${errorPrefix}_transport_error`,
        `${humanizeErrorPrefix(errorPrefix)} could not connect to the configured provider.`,
        503,
        transportErrorDetails(error)
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
  if (payload?.status === 'incomplete') {
    const reason = String(payload?.incomplete_details?.reason || 'unknown').trim() || 'unknown';
    throw createProviderError(
      `${errorPrefix}_incomplete_response`,
      reason === 'max_output_tokens'
        ? `${humanizeErrorPrefix(errorPrefix)} reached its output limit before completing the structured result.`
        : `${humanizeErrorPrefix(errorPrefix)} did not complete its structured result.`,
      502,
      { reason, responseId: payload?.id || null }
    );
  }
  const raw = typeof payload?.output_text === 'string'
    ? payload.output_text
    : (payload?.output || [])
      .flatMap(item => Array.isArray(item?.content) ? item.content : [])
      .filter(item => item?.type === 'output_text' && typeof item.text === 'string')
      .map(item => item.text)
      .join('');
  if (!raw) {
    throw createProviderError(`${errorPrefix}_empty_response`, `${humanizeErrorPrefix(errorPrefix)} returned no structured output.`, 502);
  }
  try {
    return JSON.parse(normalizeStructuredJsonEnvelope(raw));
  } catch {
    throw createProviderError(`${errorPrefix}_invalid_response`, `${humanizeErrorPrefix(errorPrefix)} returned invalid JSON.`, 502);
  }
}

function normalizeStructuredJsonEnvelope(value) {
  const normalized = String(value || '').trim();
  const fenced = normalized.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : normalized;
}

function humanizeErrorPrefix(value) {
  return String(value || '').replaceAll('_', ' ').replace(/^./, character => character.toUpperCase());
}

function transportErrorDetails(error) {
  const code = String(error?.cause?.code || error?.cause?.name || error?.name || 'transport_failure')
    .trim().slice(0, 80);
  return { reason: code || 'transport_failure' };
}

function createProviderError(code, message, statusCode, details) {
  const error = new Error(message);
  error.code = code;
  error.isProviderError = true;
  if (statusCode) error.statusCode = statusCode;
  if (details) error.details = details;
  return error;
}
