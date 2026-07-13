export function normalizeReferenceJobIds(ids, maxItems = 2) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter(id => typeof id === 'string' && id.trim()).map(id => id.trim()))]
    .slice(0, maxItems);
}

function referenceImageFingerprint(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dataUrlMarker = ';base64,';
  const markerIndex = trimmed.indexOf(dataUrlMarker);
  return markerIndex >= 0 ? trimmed.slice(markerIndex + dataUrlMarker.length) : trimmed;
}

// Preserve role priority while ensuring identical image bytes reach a provider once.
export function dedupeResolvedReferenceImages(entries) {
  const seen = new Set();
  const result = {};

  entries.forEach(([key, value]) => {
    const fingerprint = referenceImageFingerprint(value);
    if (!fingerprint || seen.has(fingerprint)) {
      result[key] = null;
      return;
    }
    seen.add(fingerprint);
    result[key] = value;
  });

  return result;
}
