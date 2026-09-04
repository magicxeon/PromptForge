import crypto from 'node:crypto';

const DEFAULT_BASE_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3';

export function resolveModelArkCredentialScope({
  environment = process.env,
  baseUrl = environment.MODEL_ARK_BASE_URL || DEFAULT_BASE_URL,
  apiKey = resolveApiKey(environment)
} = {}) {
  const explicitScope = normalizeScope(environment.MODEL_ARK_ACCOUNT_SCOPE_ID);
  const credentialScope = explicitScope
    ? `account:${explicitScope}`
    : fingerprintCredential(apiKey);
  if (!credentialScope) return null;
  let origin = 'ark.ap-southeast.bytepluses.com';
  try {
    origin = new URL(String(baseUrl || DEFAULT_BASE_URL)).host.toLowerCase();
  } catch {
    // Provider preflight owns invalid endpoint reporting. Keep provenance bounded.
  }
  return `modelark:${origin}:${credentialScope}`;
}

function normalizeScope(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{0,63}$/.test(normalized) ? normalized : null;
}

function fingerprintCredential(value) {
  const credential = String(value || '').trim();
  if (!credential) return null;
  return `credential:${crypto.createHash('sha256').update(credential).digest('hex').slice(0, 24)}`;
}

function resolveApiKey(environment) {
  return environment?.['MODEL_ARK_API-KEY']
    || environment?.MODEL_ARK_API
    || environment?.ARK_API_KEY
    || null;
}
