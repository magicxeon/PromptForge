import { cinematicTextModelDefaults } from './cinematicStoryConfiguration.js';
const defaults = cinematicTextModelDefaults.storyPlan;
const DEFAULT_MODEL = defaults.model;
const DEFAULT_FALLBACK_MODEL = defaults.fallbackModel;

export function getCinematicStoryPlanPolicy(env = process.env) {
  const apiKey = normalizeApiKey(env.OPENAI_API_KEY);
  const fallbackApiKey = normalizeApiKey(env.GEMINI_API_KEY);
  const requestedEnabled = readBoolean(
    env.ENABLE_CINEMATIC_STORY_PLAN ?? env.ENABLE_CINEMATIC_STORY_ENHANCEMENT
  );
  const fallbackRequestedEnabled = readBoolean(
    env.ENABLE_CINEMATIC_STORY_PLAN_GEMINI_FALLBACK,
    true
  );
  const generationTimeoutMs = boundedInteger(
    env.CINEMATIC_STORY_PLAN_GENERATION_TIMEOUT_MS ?? env.CINEMATIC_STORY_PLAN_TIMEOUT_MS,
    defaults.generationTimeoutMs,
    10_000,
    240_000
  );
  const repairTimeoutMs = boundedInteger(
    env.CINEMATIC_STORY_PLAN_REPAIR_TIMEOUT_MS,
    defaults.repairTimeoutMs,
    10_000,
    180_000
  );
  return {
    enabled: requestedEnabled && Boolean(apiKey || (fallbackRequestedEnabled && fallbackApiKey)),
    requestedEnabled,
    provider: 'openai',
    model: String(env.CINEMATIC_STORY_PLAN_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
    reasoningEffort: normalizeEffort(env.CINEMATIC_STORY_PLAN_REASONING_EFFORT),
    timeoutMs: generationTimeoutMs,
    generationTimeoutMs,
    repairTimeoutMs,
    maxOutputTokens: boundedInteger(env.CINEMATIC_STORY_PLAN_MAX_OUTPUT_TOKENS, defaults.maxOutputTokens, 1_000, 16_000),
    apiKey,
    fallback: {
      requestedEnabled: fallbackRequestedEnabled,
      enabled: fallbackRequestedEnabled && Boolean(fallbackApiKey),
      provider: 'gemini',
      model: String(env.CINEMATIC_STORY_PLAN_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL).trim()
        || DEFAULT_FALLBACK_MODEL,
      reasoningEffort: normalizeGeminiEffort(
        env.CINEMATIC_STORY_PLAN_FALLBACK_REASONING_EFFORT
          ?? env.CINEMATIC_STORY_PLAN_REASONING_EFFORT
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
  return ['none', 'low', 'medium', 'high', 'xhigh', 'max'].includes(effort) ? effort : 'medium';
}

function normalizeGeminiEffort(value) {
  const effort = String(value || 'medium').trim().toLowerCase();
  return ['low', 'medium', 'high'].includes(effort) ? effort : 'medium';
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}
