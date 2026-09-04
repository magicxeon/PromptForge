const MAX_ID_LENGTH = 200;

export function createProviderOutputProvenance({
  providerId,
  requestedModelId,
  providerMetadata = {},
  generatedAt = new Date().toISOString(),
  originalBytesPreserved = false
} = {}) {
  const normalizedProviderId = bounded(providerId);
  const normalizedRequestedModelId = bounded(requestedModelId);
  if (!normalizedProviderId || !normalizedRequestedModelId) return null;
  return {
    kind: 'provider_generated_image',
    providerId: normalizedProviderId,
    requestedModelId: normalizedRequestedModelId,
    resolvedModelId: bounded(providerMetadata.resolvedModel) || normalizedRequestedModelId,
    providerRequestId: bounded(providerMetadata.requestId),
    credentialScope: bounded(providerMetadata.credentialScope),
    generatedAt: normalizeTimestamp(providerMetadata.generatedAt || generatedAt),
    responseFormat: bounded(providerMetadata.responseFormat),
    originalBytesPreserved: originalBytesPreserved === true
  };
}

export function normalizeProviderOutputProvenance(value) {
  if (!value || value.kind !== 'provider_generated_image') return null;
  return createProviderOutputProvenance({
    providerId: value.providerId,
    requestedModelId: value.requestedModelId,
    providerMetadata: {
      resolvedModel: value.resolvedModelId,
      requestId: value.providerRequestId,
      credentialScope: value.credentialScope,
      generatedAt: value.generatedAt,
      responseFormat: value.responseFormat
    },
    generatedAt: value.generatedAt,
    originalBytesPreserved: value.originalBytesPreserved === true
  });
}

function bounded(value) {
  const normalized = String(value || '').trim();
  return normalized ? normalized.slice(0, MAX_ID_LENGTH) : null;
}

function normalizeTimestamp(value) {
  const timestamp = new Date(value);
  return Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : new Date(0).toISOString();
}
