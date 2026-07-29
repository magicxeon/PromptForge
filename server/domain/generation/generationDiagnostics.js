function generationReferenceCount(options = {}) {
  if (Array.isArray(options.referenceRoleManifest)) {
    return new Set(
      options.referenceRoleManifest
        .map(item => item?.sourceId || item?.role)
        .filter(Boolean)
    ).size;
  }
  return [
    options.faceReferenceImageA,
    options.faceReferenceImageB,
    options.styleReferenceImageA,
    options.styleReferenceImageB,
    options.characterReferenceImageA,
    options.characterReferenceImageB,
    options.outfitReferenceImageFront,
    options.outfitReferenceImageBack
  ].filter(Boolean).length;
}

export function createSafeGenerationDiagnostic(job, event, extra = {}) {
  return {
    event,
    jobId: job.id,
    comparisonSetId: job.options?.comparisonSetId || null,
    provider: job.provider,
    model: job.submodel,
    generationMode: job.options?.generationMode || job.options?.mode || null,
    generationSurface: job.options?.generationSurface || null,
    aspectRatio: job.options?.aspectRatio || null,
    requestedResolution: job.options?.imageResolution || null,
    resolvedProviderSize: extra.resolvedProviderSize || null,
    referenceCount: generationReferenceCount(job.options),
    ...(Number.isFinite(extra.queueLength) ? { queueLength: extra.queueLength } : {}),
    ...(Number.isFinite(extra.returnedWidth) ? { returnedWidth: extra.returnedWidth } : {}),
    ...(Number.isFinite(extra.returnedHeight) ? { returnedHeight: extra.returnedHeight } : {}),
    ...(extra.durationSeconds ? { durationSeconds: String(extra.durationSeconds) } : {}),
    ...(extra.errorCode ? { errorCode: String(extra.errorCode) } : {})
  };
}

export function logGenerationDiagnostic(job, event, extra = {}) {
  console.log(`[Generation] ${JSON.stringify(
    createSafeGenerationDiagnostic(job, event, extra)
  )}`);
}
