import fs from 'node:fs';

export function validateStoryAuthoring(value) {
  if (value?.schemaVersion !== 1 || !Number.isInteger(value.version)) throw new TypeError('Invalid story authoring version.');
  for (const key of ['storyBrief', 'creativeDirection']) {
    if (!Number.isInteger(value.limits?.[key]) || value.limits[key] < 1 || value.limits[key] > 10000) throw new TypeError('Invalid story authoring limit.');
  }
  for (const key of ['genres', 'audienceFeelings', 'pacingTraits']) {
    const choice = value.choices?.[key];
    if (!choice || !Array.isArray(choice.ids) || !choice.ids.length || choice.ids.length > 40
      || new Set(choice.ids).size !== choice.ids.length || !choice.ids.every(id => /^[a-z][a-z0-9-]{0,39}$/.test(id))
      || !choice.ids.includes(choice.default) || !Number.isInteger(choice.maxSelections)
      || choice.maxSelections < 1 || choice.maxSelections > 3
      || (choice.incompatiblePairs || []).some(pair => !Array.isArray(pair) || pair.length !== 2 || pair.some(id => !choice.ids.includes(id)))) {
      throw new TypeError('Invalid story intent choices.');
    }
  }
  const styles = value.countryStyles;
  if (!validGuidanceOptions(styles, { flags: true })) {
    throw new TypeError('Invalid story country styles.');
  }
  if (!validGuidanceOptions(value.periods)) throw new TypeError('Invalid story periods.');
  return structuredClone(value);
}

export const storyAuthoringConfiguration = validateStoryAuthoring(JSON.parse(
  fs.readFileSync(new URL('./cinematic/story-authoring.v1.json', import.meta.url), 'utf8')));
export function validateCinematicTextModelDefaults(value) {
  if (value?.schemaVersion !== 1 || !Number.isInteger(value.version) || value.version < 1) throw new TypeError('Invalid Cinematic text policy.');
  for (const key of ['enhancement', 'storyPlan']) {
    const policy = value[key];
    if (!policy || !/^[a-z0-9][a-z0-9._-]{0,119}$/i.test(policy.model || '')
      || !['none', 'minimal', 'low', 'medium', 'high', 'xhigh'].includes(policy.reasoningEffort)
      || !Number.isInteger(policy.maxOutputTokens) || policy.maxOutputTokens < 1 || policy.maxOutputTokens > 32000) throw new TypeError('Invalid Cinematic text model.');
    if (key === 'enhancement' && (!/^[a-z0-9][a-z0-9._-]{0,119}$/i.test(policy.fallbackModel || '')
      || !['low', 'medium', 'high'].includes(policy.fallbackReasoningEffort))) {
      throw new TypeError('Invalid Cinematic text fallback model.');
    }
    for (const field of key === 'enhancement' ? ['timeoutMs', 'longFormTimeoutMs'] : ['generationTimeoutMs', 'repairTimeoutMs']) {
      if (!Number.isInteger(policy[field]) || policy[field] < 1000 || policy[field] > 300000) throw new TypeError('Invalid Cinematic text timeout.');
    }
  }
  return structuredClone(value);
}
export const cinematicTextModelDefaults = validateCinematicTextModelDefaults(JSON.parse(
  fs.readFileSync(new URL('./cinematic/text-model-policy.v1.json', import.meta.url), 'utf8')));

export function normalizeStoryIntent(input = {}, configuration = storyAuthoringConfiguration) {
  const style = input.storyCountryStyle ?? configuration.countryStyles.default;
  if (!configuration.countryStyles.options.some(option => option.id === style)) {
    throw Object.assign(new Error('Select a configured story country style.'), { code: 'cinematic_story_intent_invalid', statusCode: 400 });
  }
  const period = input.storyPeriod ?? configuration.periods.default;
  if (!configuration.periods.options.some(option => option.id === period)) {
    throw Object.assign(new Error('Select a configured story period.'), { code: 'cinematic_story_intent_invalid', statusCode: 400 });
  }
  const result = { storyCountryStyle: style, storyPeriod: period };
  for (const [key, scalar] of [['genres', 'genre'], ['audienceFeelings', 'audienceFeeling'], ['pacingTraits', 'pacing']]) {
    const rule = configuration.choices[key];
    const selected = input[key] === undefined
      ? [rule.ids.includes(input[scalar]) ? input[scalar] : rule.default] : input[key];
    if (!Array.isArray(selected) || !selected.length || selected.length > rule.maxSelections
      || new Set(selected).size !== selected.length || selected.some(id => !rule.ids.includes(id))
      || (rule.incompatiblePairs || []).some(pair => pair.every(id => selected.includes(id)))) {
      throw Object.assign(new Error(`Select compatible ${key} within the configured limit.`), { code: 'cinematic_story_intent_invalid', statusCode: 400 });
    }
    result[key] = [...selected];
    result[scalar] = selected[0];
  }
  return result;
}

export function storyCountryStyleGuidance(input = {}) {
  const { storyCountryStyle } = normalizeStoryIntent(input);
  return storyAuthoringConfiguration.countryStyles.options.find(option => option.id === storyCountryStyle).guidance;
}

export function storyPeriodGuidance(input = {}) {
  const { storyPeriod } = normalizeStoryIntent(input);
  return storyAuthoringConfiguration.periods.options.find(option => option.id === storyPeriod).guidance;
}

function validGuidanceOptions(value, { flags = false } = {}) {
  return value && Array.isArray(value.options) && value.options.length > 0 && value.options.length <= 30
    && new Set(value.options.map(option => option.id)).size === value.options.length
    && value.options.some(option => option.id === value.default)
    && value.options.every(option => /^[a-z][a-z0-9-]{0,39}$/.test(option.id)
      && (!flags || option.flag === null || /^[a-z]{2}$/.test(option.flag))
      && typeof option.guidance === 'string' && option.guidance.trim() && option.guidance.length <= 1200);
}
