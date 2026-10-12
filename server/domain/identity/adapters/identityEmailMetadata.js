import { createHmac } from 'node:crypto';
import { keyFor, reject } from '../identitySecrets.js';
import { normalizeIdentityEmail } from '../identityEmail.js';

export function recipientDigest(keyring, version, email) {
  return createHmac('sha256', keyFor(keyring, version))
    .update(`identity:mail-recipient:v1:${version}\0`)
    .update(normalizeIdentityEmail(email).canonicalEmail)
    .digest('hex');
}
export function recipientDigests(keyring, email) {
  if (Object.keys(keyring.keys).length > 8) reject('IDENTITY_DELIVERY_UNAVAILABLE');
  return Object.keys(keyring.keys).map((version) => ({
    version: Number(version),
    digest: recipientDigest(keyring, Number(version), email),
  }));
}
