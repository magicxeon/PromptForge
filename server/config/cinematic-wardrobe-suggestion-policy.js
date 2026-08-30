function readBoolean(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

export function getCinematicWardrobeSuggestionPolicy(env = process.env) {
  const requestedEnabled = readBoolean(
    env.ENABLE_CINEMATIC_WARDROBE_SUGGESTION ?? env.ENABLE_CINEMATIC_STORY_ENHANCEMENT
  );
  const apiKey = String(env.OPENAI_API_KEY || '').trim();
  return {
    requestedEnabled,
    enabled: requestedEnabled && Boolean(apiKey),
    apiKey,
    provider: 'openai',
    model: String(env.CINEMATIC_WARDROBE_SUGGESTION_MODEL || env.CINEMATIC_STORY_ENHANCEMENT_MODEL || 'gpt-5-mini').trim(),
    reasoningEffort: String(env.CINEMATIC_WARDROBE_SUGGESTION_REASONING || 'low').trim(),
    maxOutputTokens: Math.max(700, Number(env.CINEMATIC_WARDROBE_SUGGESTION_MAX_OUTPUT_TOKENS || 1800)),
    timeoutMs: Math.max(10_000, Number(env.CINEMATIC_WARDROBE_SUGGESTION_TIMEOUT_MS || 60_000))
  };
}
