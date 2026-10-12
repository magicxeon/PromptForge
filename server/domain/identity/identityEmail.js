import { domainToASCII } from 'node:url';

export function normalizeIdentityEmail(value) {
  const fail = () => {
    throw Object.assign(new Error('Identity email rejected.'), { code: 'IDENTITY_EMAIL_INVALID' });
  };
  if (typeof value !== 'string' || value.length > 512) fail();
  const submitted = value.trim();
  const parts = submitted.split('@');
  if (parts.length !== 2) fail();
  const [local, domain] = parts;
  if (/[\s\x00-\x1f\x7f%/\\?#:\[\]]/.test(domain)) fail();
  // Deliberately support unquoted ASCII dot-atoms only. SMTPUTF8 local parts,
  // comments, controls and ambiguous quoting are rejected, never rewritten.
  if (
    !local ||
    local.length > 64 ||
    !/^[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~.]+$/.test(local) ||
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..')
  )
    fail();
  const asciiDomain = domainToASCII(domain).toLowerCase();
  if (
    !asciiDomain ||
    asciiDomain.length > 253 ||
    !asciiDomain.includes('.') ||
    asciiDomain.split('.').some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  )
    fail();
  const deliveryEmail = `${local}@${asciiDomain}`;
  if (Buffer.byteLength(deliveryEmail) > 254 || Buffer.byteLength(submitted) > 254) fail();
  return Object.freeze({
    canonicalEmail: `${local.toLowerCase()}@${asciiDomain}`,
    deliveryEmail,
    submittedEmail: submitted,
  });
}
