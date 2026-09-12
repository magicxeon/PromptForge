import fs from 'node:fs';
import crypto from 'node:crypto';

export function validateGeneratedReferencePolicy(value) {
  if (!value || typeof value.version !== 'string' || !value.version
    || typeof value.allowAnyProvider !== 'boolean' || !Array.isArray(value.blockedSources)
    || value.blockedSources.some(rule => !rule || typeof rule !== 'object'
      || !Object.keys(rule).length
      || Object.entries(rule).some(([key, entry]) => !['providerId', 'modelId'].includes(key)
        || typeof entry !== 'string' || !entry.trim()))) {
    throw new TypeError('Invalid generated reference policy.');
  }
  return Object.freeze({ ...value, policyVersion: `${value.version}-${crypto.createHash('sha256')
    .update(JSON.stringify(value)).digest('hex').slice(0, 12)}` });
}

export const generatedReferencePolicy = validateGeneratedReferencePolicy(JSON.parse(
  fs.readFileSync(new URL('./generated-reference-policy.json', import.meta.url), 'utf8')
));

export function generatedSourceIdentity(source) {
  const provenance = source?.providerOutputProvenance;
  return {
    providerId: provenance?.providerId || source?.providerId || source?.provider || '',
    modelId: provenance?.resolvedModelId || source?.resolvedModelId || source?.modelId
      || source?.resolvedSubmodel || source?.submodel || '',
    requestedModelId: provenance?.requestedModelId || source?.requestedModelId || source?.submodel || ''
  };
}

export function isGeneratedReferenceAllowed(source, policy = generatedReferencePolicy) {
  const identity = generatedSourceIdentity(source);
  return !policy.blockedSources.some(rule => (!rule.providerId || rule.providerId === identity.providerId)
    && (!rule.modelId || [identity.modelId, identity.requestedModelId].includes(rule.modelId)));
}

export function assertGeneratedReferenceAllowed(source, policy = generatedReferencePolicy) {
  if (!isGeneratedReferenceAllowed(source, policy)) throw Object.assign(
    new Error('This image source is disabled in the generated reference configuration.'),
    { code: 'video_reference_source_disabled', statusCode: 409 }
  );
}
