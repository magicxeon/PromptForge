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
          instructions: SYSTEM_INSTRUCTION,
          input: JSON.stringify({ canonicalPrompt: prompt, executionContext: context }),
          reasoning: { effort: reasoningEffort },
          text: {
            format: {
              type: 'json_schema',
              name: 'momelo_prompt_refinement',
              strict: true,
              schema: REFINEMENT_SCHEMA
            },
            verbosity: 'low'
          },
          max_output_tokens: maxOutputTokens
        }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const error = createProviderError(
          'prompt_refinement_provider_error',
          payload?.error?.message || `OpenAI Responses API returned HTTP ${response.status}.`
        );
        error.status = response.status;
        error.requestId = response.headers?.get?.('x-request-id') || null;
        throw error;
      }
      const parsed = parseStructuredOutput(payload);
      return {
        ...parsed,
        responseId: payload?.id || null,
        usage: payload?.usage || null
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw createProviderError('prompt_refinement_timeout', 'Prompt refinement timed out.');
      }
      if (error?.code) throw error;
      throw createProviderError('prompt_refinement_transport_error', error?.message || 'Prompt refinement failed.');
    } finally {
      clearTimeout(timeout);
    }
  }
}

function parseStructuredOutput(payload) {
  const raw = typeof payload?.output_text === 'string'
    ? payload.output_text
    : payload?.output
      ?.flatMap(item => Array.isArray(item?.content) ? item.content : [])
      .find(item => item?.type === 'output_text')?.text;
  if (!raw) {
    throw createProviderError('prompt_refinement_empty_response', 'Prompt refinement returned no structured output.');
  }
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw createProviderError('prompt_refinement_invalid_response', 'Prompt refinement returned invalid JSON.');
  }
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

function createProviderError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
