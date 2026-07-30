function generationReferenceCount(options = {}) {
  const processedCount = Number(options.referenceProcessingLineage?.referenceCount);
  if (Number.isFinite(processedCount)) return processedCount;
  if (Array.isArray(options.referenceRoleManifest)) {
    return options.referenceRoleManifest.length;
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
    ...(job.options?.referenceProcessingLineage?.policyVersion
      ? {
        referencePolicyVersion:
          job.options.referenceProcessingLineage.policyVersion
      }
      : {}),
    ...(job.options?.referenceProcessingLineage?.planFingerprint
      ? {
        referencePlanFingerprint:
          job.options.referenceProcessingLineage.planFingerprint.slice(0, 12)
      }
      : {}),
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
