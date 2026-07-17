import { compilePromptOnServer } from './promptCompiler.js';
import { normalizeReferenceJobIds } from './referenceUtils.js';

export function normalizeGenerationContext(payload = {}) {
  const hasFaceReference = Boolean(payload.faceReferenceImageA || payload.faceReferenceImageB);
  const hasStyleReference = Boolean(payload.styleReferenceImageA || payload.styleReferenceImageB);
  const hasCharacterReference = Boolean(payload.characterReferenceImageA || payload.characterReferenceImageB);
  const hasOutfitReference = Boolean(payload.outfitReferenceImageFront || payload.outfitReferenceImageBack);
  const mode = payload.mode || 'normal';
  const imageReferences = {
    ...(payload.imageReferences || {}),
    faceMatch: payload.imageReferences?.faceMatch === true && hasFaceReference,
    styleMatch: mode === 'normal' && payload.imageReferences?.styleMatch === true && hasStyleReference,
    poseMatch: mode === 'normal' && payload.imageReferences?.poseMatch === true && hasStyleReference,
    characterReference: mode === 'normal'
      && payload.imageReferences?.characterReference === true
      && hasCharacterReference,
    outfitReference: mode === 'character-sheet'
      && payload.imageReferences?.outfitReference === true
      && hasOutfitReference,
    outfitReferenceFront: mode === 'character-sheet'
      && payload.imageReferences?.outfitReference === true
      && Boolean(payload.outfitReferenceImageFront),
    outfitReferenceBack: mode === 'character-sheet'
      && payload.imageReferences?.outfitReference === true
      && Boolean(payload.outfitReferenceImageBack),
    characterOverrides: mode === 'normal'
      && payload.imageReferences?.characterReference === true
      && hasCharacterReference
      && payload.imageReferences?.characterOverrides === true
  };
  delete imageReferences.useReferenceImage;

  const activeReferenceValues = [
    imageReferences.faceMatch ? payload.faceReferenceImageA : null,
    imageReferences.faceMatch ? payload.faceReferenceImageB : null,
    imageReferences.styleMatch || imageReferences.poseMatch ? payload.styleReferenceImageA : null,
    imageReferences.styleMatch || imageReferences.poseMatch ? payload.styleReferenceImageB : null,
    imageReferences.characterReference ? payload.characterReferenceImageA : null,
    imageReferences.characterReference ? payload.characterReferenceImageB : null,
    imageReferences.outfitReference ? payload.outfitReferenceImageFront : null,
    imageReferences.outfitReference ? payload.outfitReferenceImageBack : null
  ].filter(value => typeof value === 'string' && value.trim());

  return {
    ...payload,
    mode,
    template: payload.template || 'portrait',
    aspectRatio: payload.aspectRatio || '1:1',
    imageReferences,
    sourceOwnership: payload.sourceOwnership && typeof payload.sourceOwnership === 'object'
      ? payload.sourceOwnership
      : null,
    referenceCount: new Set(activeReferenceValues).size
  };
}

export function compileGenerationContext(payload = {}) {
  const context = normalizeGenerationContext(payload);
  const adminPromptOverride = typeof context.adminPromptOverride === 'string'
    ? context.adminPromptOverride.trim()
    : '';
  const compiledPrompt = context.userRole === 'admin' && adminPromptOverride
    ? adminPromptOverride
    : compilePromptOnServer(
      context.selections,
      context.aspectRatio,
      context.imageReferences,
      context.mode,
      context.template,
      context.isGptSafe,
      context.customColors
    );
  return { context, compiledPrompt };
}

export function createQueueOptions(context, {
  username,
  stream,
  modelConfig,
  providerConfigVersion,
  creditCost,
  imageResolution = null,
  comparison = null
}) {
  const references = context.imageReferences;
  return {
    aspectRatio: context.aspectRatio,
    imageReferences: references,
    sourceOwnership: context.sourceOwnership || null,
    mode: context.mode,
    template: context.template,
    isGptSafe: context.isGptSafe,
    username,
    stream,
    modelConfig,
    providerConfigVersion,
    creditCost,
    imageResolution: imageResolution || context.imageResolution || modelConfig.defaults?.resolution || null,
    faceReferenceImageA: references.faceMatch ? context.faceReferenceImageA : null,
    faceReferenceImageB: references.faceMatch ? context.faceReferenceImageB : null,
    faceReferenceJobIds: references.faceMatch ? normalizeReferenceJobIds(context.faceReferenceJobIds) : [],
    styleReferenceImageA: references.styleMatch || references.poseMatch ? context.styleReferenceImageA : null,
    styleReferenceImageB: references.styleMatch || references.poseMatch ? context.styleReferenceImageB : null,
    styleReferenceJobIds: references.styleMatch || references.poseMatch
      ? normalizeReferenceJobIds(context.styleReferenceJobIds)
      : [],
    characterReferenceImageA: references.characterReference ? context.characterReferenceImageA : null,
    characterReferenceImageB: references.characterReference ? context.characterReferenceImageB : null,
    characterReferenceJobIds: references.characterReference
      ? normalizeReferenceJobIds(context.characterReferenceJobIds)
      : [],
    outfitReferenceImageFront: references.outfitReference ? context.outfitReferenceImageFront : null,
    outfitReferenceImageBack: references.outfitReference ? context.outfitReferenceImageBack : null,
    outfitReferenceJobIds: references.outfitReference
      ? normalizeReferenceJobIds(context.outfitReferenceJobIds)
      : [],
    comparisonSetId: comparison?.setId || null,
    comparisonRunId: comparison?.runId || null,
    comparisonSlotId: comparison?.slotId || null
  };
}
