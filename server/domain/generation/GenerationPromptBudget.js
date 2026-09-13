import fs from 'node:fs';

const policy = JSON.parse(fs.readFileSync(new URL('../../config/generation-prompt-budget.json', import.meta.url), 'utf8'));

// This is a final-text validator, not another prompt compiler or AI workflow.
export function inspectGenerationPrompt(prompt, { providerId = '', modelId = '', operation = 'image',
  originalCharacters, recommendedCharacters } = {}, configuration = policy) {
  const characters = Array.from(String(prompt || '')).length;
  const limit = configuration.providerLimits[`${providerId}/${modelId}/${operation}`];
  const recommendation = recommendedCharacters || configuration.recommendedCharacters[operation];
  const hardLimit = typeof limit?.source === 'string' && limit.source.trim() && Number.isInteger(limit.maximumCharacters)
    && limit.maximumCharacters > 0 && limit.unit === configuration.countUnit
    ? limit.maximumCharacters : null;
  const original = originalCharacters ?? characters;
  return {
    policyVersion: configuration.version, unit: configuration.countUnit, characters,
    originalCharacters: original, recommendedCharacters: recommendation,
    hardLimit, hardLimitSource: hardLimit ? limit.source : null,
    status: characters > configuration.requestSafetyCharacters || (hardLimit !== null && characters > hardLimit)
      ? 'over_limit' : characters > recommendation ? 'above_recommendation' : characters < original ? 'optimized' : 'within_budget',
    scope: hardLimit === null ? 'provider_limit_unknown' : 'provider_verified',
    requestSafetyCharacters: configuration.requestSafetyCharacters
  };
}

export function validateGenerationPrompt(prompt, options) {
  const budget = inspectGenerationPrompt(prompt, options);
  if (budget.status === 'over_limit') {
    throw Object.assign(new Error(budget.hardLimit !== null && budget.characters > budget.hardLimit
      ? 'The final prompt exceeds the verified model limit.'
      : 'The final prompt exceeds the application request size bound.'), {
      code: 'generation_prompt_too_long', statusCode: 400, details: budget
    });
  }
  return budget;
}
