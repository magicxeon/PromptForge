import crypto from 'node:crypto';

export function normalizeVideoReferences(input = {}) {
  const raw = Array.isArray(input.references) && input.references.length
    ? input.references
    : input.referenceImageUrl
      ? [{ role: 'first_frame', referenceImageUrl: input.referenceImageUrl }]
      : [];
  return raw.slice(0, 12).flatMap((value, index) => {
    const referenceImageUrl = String(value?.referenceImageUrl || value?.url || '').trim();
    if (!referenceImageUrl) return [];
    return [{
      role: String(value?.role || (index === 0 ? 'first_frame' : `reference_image_${index + 1}`)).trim(),
      assetId: String(value?.assetId || '').trim() || null,
      assetVersionId: String(value?.assetVersionId || '').trim() || null,
      sourceFingerprint: String(value?.sourceFingerprint || '').trim() || null,
      referenceImageUrl
    }];
  });
}

export function fingerprintVideoReferencePlan(references, inputMode) {
  return crypto.createHash('sha256').update(JSON.stringify({
    version: 'video-reference-plan-v1',
    inputMode,
    references: (references || []).map(reference => ({
      role: reference.role,
      assetId: reference.assetId,
      assetVersionId: reference.assetVersionId,
      sourceFingerprint: reference.sourceFingerprint,
      legacyLocatorFingerprint: reference.sourceFingerprint || reference.assetVersionId
        ? null
        : crypto.createHash('sha256').update(reference.referenceImageUrl).digest('hex')
    }))
  })).digest('hex');
}

export function sanitizeVideoReferences(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map(reference => ({
    role: String(reference?.role || '').trim(),
    assetId: String(reference?.assetId || '').trim() || null,
    assetVersionId: String(reference?.assetVersionId || '').trim() || null,
    sourceFingerprint: String(reference?.sourceFingerprint || '').trim() || null
  }));
}
