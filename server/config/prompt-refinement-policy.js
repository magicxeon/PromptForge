const DEFAULT_MODEL = 'gpt-5.6-luna';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 1_800;
const DEFAULT_AUDIT_MAX_FILES = 500;
const ALLOWED_REASONING_EFFORTS = new Set(['none', 'low', 'medium', 'high', 'xhigh', 'max']);

export function getPromptRefinementPolicy(env = process.env) {
  const apiKey = normalizeApiKey(env.OPENAI_API_KEY);
  const requestedEnabled = readBoolean(env.ENABLE_AI_PROMPT_REFINE);
  const reasoningEffort = String(env.PROMPT_REFINEMENT_REASONING_EFFORT || 'low')
    .trim()
    .toLowerCase();

  return {
    enabled: requestedEnabled && Boolean(apiKey),
    requestedEnabled,
    provider: 'openai',
    model: String(env.PROMPT_REFINEMENT_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
    reasoningEffort: ALLOWED_REASONING_EFFORTS.has(reasoningEffort)
      ? reasoningEffort
      : 'low',
    timeoutMs: readBoundedInteger(
      env.PROMPT_REFINEMENT_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
      1_000,
      120_000
    ),
    maxOutputTokens: readBoundedInteger(
      env.PROMPT_REFINEMENT_MAX_OUTPUT_TOKENS,
      DEFAULT_MAX_OUTPUT_TOKENS,
      256,
      8_000
    ),
    auditMaxFiles: readBoundedInteger(
      env.PROMPT_REFINEMENT_AUDIT_MAX_FILES,
      DEFAULT_AUDIT_MAX_FILES,
      10,
      10_000
    ),
    logPrompts: readBoolean(env.LOG_AI_PROMPT_REFINE) && env.NODE_ENV !== 'production',
    apiKey
  };
}

export function getPublicPromptRefinementPolicy(env = process.env) {
  const policy = getPromptRefinementPolicy(env);
  return {
    enabled: policy.enabled,
    provider: policy.provider,
    model: policy.model
  };
}

function readBoolean(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function readBoundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function normalizeApiKey(value) {
  const apiKey = String(value || '').trim();
  if (!apiKey || apiKey === 'your_openai_api_key_here') return null;
  return apiKey;
}
