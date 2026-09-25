import { cinematicTextModelDefaults } from './cinematicStoryConfiguration.js';
const defaults = cinematicTextModelDefaults.enhancement;
const DEFAULT_MODEL = defaults.model;

export function getCinematicStoryEnhancementPolicy(env = process.env) {
  const apiKey = normalizeApiKey(env.OPENAI_API_KEY);
  const fallbackApiKey = normalizeApiKey(env.GEMINI_API_KEY);
  const requestedEnabled = readBoolean(env.ENABLE_CINEMATIC_STORY_ENHANCEMENT);
  const fallbackRequestedEnabled = readBoolean(
    env.ENABLE_CINEMATIC_STORY_ENHANCEMENT_GEMINI_FALLBACK,
    true
  );
  return {
    enabled: requestedEnabled && Boolean(apiKey),
    requestedEnabled,
    provider: 'openai',
    model: String(env.CINEMATIC_STORY_ENHANCEMENT_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
    reasoningEffort: normalizeEffort(env.CINEMATIC_STORY_ENHANCEMENT_REASONING_EFFORT),
    timeoutMs: boundedInteger(env.CINEMATIC_STORY_ENHANCEMENT_TIMEOUT_MS, defaults.timeoutMs, 1_000, 120_000),
    longFormTimeoutMs: boundedInteger(env.CINEMATIC_STORY_LONG_FORM_TIMEOUT_MS, defaults.longFormTimeoutMs, 1_000, 300_000),
    maxOutputTokens: boundedInteger(env.CINEMATIC_STORY_ENHANCEMENT_MAX_OUTPUT_TOKENS, defaults.maxOutputTokens, 512, 8_000),
    apiKey,
    fallback: {
      requestedEnabled: fallbackRequestedEnabled,
      enabled: fallbackRequestedEnabled && Boolean(fallbackApiKey),
      provider: 'gemini',
      model: String(env.CINEMATIC_STORY_ENHANCEMENT_FALLBACK_MODEL || defaults.fallbackModel).trim()
        || defaults.fallbackModel,
      reasoningEffort: normalizeGeminiEffort(
        env.CINEMATIC_STORY_ENHANCEMENT_FALLBACK_REASONING_EFFORT
      ),
      apiKey: fallbackApiKey
    }
  };
}

function readBoolean(value, fallback = false) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return String(value || '').trim().toLowerCase() === 'true';
}

function normalizeApiKey(value) {
  const key = String(value || '').trim();
  return key && !/^your_.+_api_key_here$/i.test(key) ? key : null;
}

function normalizeEffort(value) {
  const effort = String(value || defaults.reasoningEffort).trim().toLowerCase();
  return ['none', 'low', 'medium', 'high', 'xhigh', 'max'].includes(effort) ? effort : 'low';
}

function normalizeGeminiEffort(value) {
  const effort = String(value || defaults.fallbackReasoningEffort).trim().toLowerCase();
  return ['low', 'medium', 'high'].includes(effort) ? effort : defaults.fallbackReasoningEffort;
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}
