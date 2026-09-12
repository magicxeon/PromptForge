export const TRUSTED_GENERATED_SOURCE_POLICY = Object.freeze({
  kind: 'trusted_generated_only',
  allowImageReferenceUploads: true,
  version: 'modelark-seedream-5-family-2026-09-12',
  providerId: 'modelark',
  modelIds: ['seedream-5-0-lite-260128', 'dola-seedream-5-0-pro-260628'],
  resolvedModelAliases: ['seedream-5-0-260128'],
  generationModes: ['text_to_image', 'image_to_image'],
});

export function isTrustedGeneratedSourceModel(
  source,
  policy = TRUSTED_GENERATED_SOURCE_POLICY,
) {
  const requestedModelId = String(source?.requestedModelId || '');
  const resolvedModelId = String(
    source?.modelId || source?.resolvedModelId || '',
  );
  const requestedAllowed =
    !requestedModelId || policy.modelIds.includes(requestedModelId);
  const resolvedAllowed =
    policy.modelIds.includes(resolvedModelId) ||
    policy.resolvedModelAliases.includes(resolvedModelId);
  return (
    Boolean(requestedModelId || resolvedModelId) &&
    requestedAllowed &&
    resolvedAllowed
  );
}

export function isTrustedGeneratedSourceMode(
  source,
  policy = TRUSTED_GENERATED_SOURCE_POLICY,
) {
  const referenceCount = Number(source?.referenceCount);
  return (
    policy.generationModes.includes(source?.generationMode) &&
    ((source.generationMode === 'text_to_image' && referenceCount === 0) ||
      (source.generationMode === 'image_to_image' && referenceCount > 0))
  );
}

// Provider-returned URLs only; no user URLs, redirects or private network hosts.
export function isTrustedOutputUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === '443') &&
      [
        'bytepluses.com',
        'bytepluscdn.com',
        'volces.com',
        'byteimg.com',
        'ibytedtos.com',
      ].some((host) => url.hostname.endsWith(`.${host}`))
    );
  } catch {
    return false;
  }
}
