const DEFAULT_MODEL = 'gpt-5.6-luna';

export function getCinematicStoryPlanPolicy(env = process.env) {
  const apiKey = normalizeApiKey(env.OPENAI_API_KEY);
  const requestedEnabled = readBoolean(
    env.ENABLE_CINEMATIC_STORY_PLAN ?? env.ENABLE_CINEMATIC_STORY_ENHANCEMENT
  );
  return {
    enabled: requestedEnabled && Boolean(apiKey),
    requestedEnabled,
    provider: 'openai',
    model: String(env.CINEMATIC_STORY_PLAN_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
    reasoningEffort: normalizeEffort(env.CINEMATIC_STORY_PLAN_REASONING_EFFORT),
    timeoutMs: boundedInteger(env.CINEMATIC_STORY_PLAN_TIMEOUT_MS, 60_000, 1_000, 120_000),
    maxOutputTokens: boundedInteger(env.CINEMATIC_STORY_PLAN_MAX_OUTPUT_TOKENS, 8_000, 1_000, 16_000),
    apiKey
  };
}

function readBoolean(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function normalizeApiKey(value) {
  const key = String(value || '').trim();
  return key && key !== 'your_openai_api_key_here' ? key : null;
}

function normalizeEffort(value) {
  const effort = String(value || 'low').trim().toLowerCase();
  return ['none', 'low', 'medium', 'high', 'xhigh', 'max'].includes(effort) ? effort : 'low';
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}
