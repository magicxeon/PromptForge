import {
  CINEMATIC_SCENE_DIRECTION_SCHEMA,
  CINEMATIC_STORY_PLAN_SCHEMA
} from './cinematicTextSchemas.js';

const INTERACTIONS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';

export class GeminiCinematicTextProvider {
  constructor(apiKey, {
    fetchImpl = globalThis.fetch,
    endpoint = INTERACTIONS_ENDPOINT
  } = {}) {
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.endpoint = endpoint;
  }

  async generateCinematicStoryPlan({
    context, recipe, model, reasoningEffort, maxOutputTokens, timeoutMs
  }) {
    return this.requestStructured({
      model,
      instructions: recipe.instruction,
      input: context,
      reasoningEffort,
      schema: CINEMATIC_STORY_PLAN_SCHEMA,
      maxOutputTokens,
      timeoutMs,
      errorPrefix: 'cinematic_story_plan'
    });
  }

  async generateCinematicSceneDirection({
    context, recipe, model, reasoningEffort, maxOutputTokens, timeoutMs
  }) {
    return this.requestStructured({
      model,
      instructions: recipe.instruction,
      input: context,
      reasoningEffort,
      schema: CINEMATIC_SCENE_DIRECTION_SCHEMA,
      maxOutputTokens,
      timeoutMs,
      errorPrefix: 'cinematic_scene_direction'
    });
  }

  async requestStructured({
    model,
    instructions,
    input,
    reasoningEffort,
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
          'x-goog-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          store: false,
          system_instruction: instructions,
          input: JSON.stringify(input),
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema
          },
          generation_config: {
            thinking_level: normalizeThinkingLevel(reasoningEffort),
            max_output_tokens: maxOutputTokens
          }
        }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const error = createProviderError(
          `${errorPrefix}_provider_error`,
          payload?.error?.message || `Gemini Interactions API returned HTTP ${response.status}.`
        );
        error.status = response.status;
        error.requestId = response.headers?.get?.('x-request-id')
          || response.headers?.get?.('x-goog-request-id')
          || null;
        error.providerCode = payload?.error?.status || payload?.error?.code || null;
        throw error;
      }
      const raw = extractOutputText(payload);
      if (!raw) {
        throw createProviderError(
          `${errorPrefix}_empty_response`,
          `${humanizeErrorPrefix(errorPrefix)} returned no structured output.`
        );
      }
      let result;
      try {
        result = JSON.parse(raw);
      } catch {
        throw createProviderError(
          `${errorPrefix}_invalid_response`,
          `${humanizeErrorPrefix(errorPrefix)} returned invalid JSON.`
        );
      }
      return {
        ...result,
        responseId: payload?.id || null,
        usage: payload?.usage || null
      };
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

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const steps = Array.isArray(payload?.steps) ? [...payload.steps].reverse() : [];
  const output = steps.find(step => step?.type === 'model_output');
  return (Array.isArray(output?.content) ? output.content : [])
    .filter(item => item?.type === 'text' && typeof item.text === 'string')
    .map(item => item.text)
    .join('');
}

function normalizeThinkingLevel(value) {
  const level = String(value || 'low').trim().toLowerCase();
  return ['low', 'medium', 'high'].includes(level) ? level : 'low';
}

function humanizeErrorPrefix(value) {
  return String(value || '').replaceAll('_', ' ').replace(/^./, character => character.toUpperCase());
}

function createProviderError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
