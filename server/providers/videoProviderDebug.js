import crypto from 'node:crypto';

export function parseEnvironmentBoolean(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

export function resolveVideoProviderDebugEnabled(env = process.env, providerToggle = '') {
  return parseEnvironmentBoolean(env?.VIDEO_PROVIDER_DEBUG)
    || (providerToggle ? parseEnvironmentBoolean(env?.[providerToggle]) : false);
}

export function writeVideoProviderDebug({ enabled, logger = console, providerId, event, details = {} }) {
  if (!enabled || typeof logger?.info !== 'function') return;
  logger.info(
    `[VideoProvider][${providerId}][Debug]`,
    JSON.stringify({ event, ...compactObject(details) })
  );
}

export function summarizeVideoPrompt(prompt) {
  const value = String(prompt || '');
  return {
    promptLength: value.length,
    promptFingerprint: value
      ? crypto.createHash('sha256').update(value).digest('hex').slice(0, 16)
      : null
  };
}

export function summarizeVideoProviderError(error) {
  const cause = error?.cause;
  return compactObject({
    errorName: firstString(error?.name) || 'Error',
    errorCode: firstString(error?.code, error?.status),
    statusCode: finiteNumber(error?.statusCode, error?.status),
    requestId: firstString(error?.requestId, error?.request_id, error?.response?.requestId),
    message: sanitizeDiagnosticText(error?.message),
    causeName: firstString(cause?.name),
    causeCode: firstString(cause?.code),
    causeErrno: firstString(cause?.errno),
    causeSyscall: firstString(cause?.syscall),
    causeAddress: firstString(cause?.address),
    causePort: finiteNumber(cause?.port),
    causeMessage: cause ? sanitizeDiagnosticText(cause.message) : null
  });
}

function sanitizeDiagnosticText(value) {
  return String(value || '')
    .replace(/data:[^;,\s]+;base64,[a-zA-Z0-9+/=\s]+/g, '[media omitted]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[URL omitted]')
    .replace(/([?&](?:key|api_key)=)[^&\s]+/gi, '$1[credential omitted]')
    .slice(0, 1000);
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''));
}

function firstString(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return null;
}

function finiteNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}
