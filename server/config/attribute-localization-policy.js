const DEFAULT_MODEL = 'gpt-5.6-luna';

export function getAttributeLocalizationPolicy(env = process.env) {
  const apiKey = normalizeApiKey(env.OPENAI_API_KEY);
  const requestedEnabled = String(env.ATTRIBUTE_LOCALIZATION_ENABLED ?? 'true').trim().toLowerCase() !== 'false';
  return {
    enabled: requestedEnabled && Boolean(apiKey),
    requestedEnabled,
    provider: 'openai',
    model: String(env.ATTRIBUTE_LOCALIZATION_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
    reasoningEffort: 'low',
    timeoutMs: boundedInteger(env.ATTRIBUTE_LOCALIZATION_TIMEOUT_MS, 20_000, 1_000, 60_000),
    maxOutputTokens: boundedInteger(env.ATTRIBUTE_LOCALIZATION_MAX_OUTPUT_TOKENS, 600, 128, 2_000),
    apiKey
  };
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function normalizeApiKey(value) {
  const apiKey = String(value || '').trim();
  if (!apiKey || apiKey === 'your_openai_api_key_here') return null;
  return apiKey;
}
