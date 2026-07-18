import { compilePromptOnServer } from './promptCompiler.js';
import { normalizeReferenceJobIds } from './referenceUtils.js';

const CHARACTER_SHEET_IDENTITY_GROUPS = new Set(['Character', 'Face', 'Hair', 'Skin']);

function normalizeSceneBuilderState(value, mode) {
  if (mode !== 'normal') return null;
  const raw = value && typeof value === 'object' ? value : {};
  return {
    authoringMode: raw.authoringMode === 'manual' ? 'manual' : 'guided',
    manualPromptText: typeof raw.manualPromptText === 'string' ? raw.manualPromptText : '',
    lastGuidedPromptSnapshot: typeof raw.lastGuidedPromptSnapshot === 'string' ? raw.lastGuidedPromptSnapshot : '',
    templateDraft: raw.templateDraft || null
  };
}

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

  const sceneBuilder = normalizeSceneBuilderState(payload.sceneBuilder, mode);

  return {
    ...payload,
    mode,
    sceneBuilder,
    template: payload.template || 'portrait',
    aspectRatio: payload.aspectRatio || '1:1',
    imageReferences,
    sourceOwnership: payload.sourceOwnership && typeof payload.sourceOwnership === 'object'
      ? payload.sourceOwnership
      : null,
    characterSheetConfig: createCharacterSheetConfigSnapshot({
      ...payload,
      mode,
      imageReferences,
      sourceOwnership: payload.sourceOwnership && typeof payload.sourceOwnership === 'object'
        ? payload.sourceOwnership
        : null
    }),
    referenceCount: new Set(activeReferenceValues).size
  };
}

export function compileGenerationContext(payload = {}) {
  const context = normalizeGenerationContext(payload);
  const adminPromptOverride = typeof context.adminPromptOverride === 'string'
    ? context.adminPromptOverride.trim()
    : '';
  const manualScenePrompt = context.mode === 'normal'
    && context.sceneBuilder?.authoringMode === 'manual'
    && typeof context.sceneBuilder.manualPromptText === 'string'
    ? context.sceneBuilder.manualPromptText.trim()
    : '';
  const compiledPrompt = context.userRole === 'admin' && adminPromptOverride
    ? adminPromptOverride
    : (manualScenePrompt
      ? manualScenePrompt
    : compilePromptOnServer(
      context.selections,
      context.aspectRatio,
      context.imageReferences,
      context.mode,
      context.template,
      context.isGptSafe,
      context.customColors
    ));
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
    selections: context.selections && typeof context.selections === 'object' ? context.selections : {},
    sceneBuilder: context.sceneBuilder || null,
    aspectRatio: context.aspectRatio,
    imageReferences: references,
    sourceOwnership: context.sourceOwnership || null,
    characterSheetConfig: context.characterSheetConfig || null,
    storyReferenceHandoff: context.mode === 'character-sheet'
      ? {
        referenceType: 'character-sheet',
        identityLocked: true,
        outfitLocked: true,
        sourceJobId: null
      }
      : null,
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

export function createCharacterSheetConfigSnapshot(context = {}) {
  if (context.mode !== 'character-sheet') return null;
  const selections = context.selections && typeof context.selections === 'object'
    ? context.selections
    : {};
  const faceReferenceIds = normalizeReferenceJobIds(context.faceReferenceJobIds);
  const outfitReferenceIds = normalizeReferenceJobIds(context.outfitReferenceJobIds);
  const hasOutfitReference = context.imageReferences?.outfitReference === true;
  const hasBackReference = context.imageReferences?.outfitReferenceBack === true;
  const outfitSelectionIds = collectSelectionIds(selections, selection => selection?.group === 'Clothing');
  const layoutSelection = selections['Sheet Layout'];

  return {
    version: 1,
    mode: 'character-sheet',
    sourceHeadshotIds: faceReferenceIds,
    identitySelectionIds: collectSelectionIds(selections, selection =>
      CHARACTER_SHEET_IDENTITY_GROUPS.has(selection?.group)
    ),
    bodySelectionIds: collectSelectionIds(selections, (selection, fieldName) =>
      selection?.group === 'Body' && fieldName !== 'Sheet Layout'
    ),
    outfitSource: {
      type: hasOutfitReference
        ? (hasBackReference ? 'front-back-reference' : 'front-reference')
        : (Object.keys(outfitSelectionIds).length ? 'preset' : 'baseline'),
      frontReferenceIds: hasOutfitReference ? outfitReferenceIds.slice(0, 1) : [],
      backReferenceIds: hasBackReference ? outfitReferenceIds.slice(1, 2) : []
    },
    outfitSelectionIds,
    layout: {
      type: layoutSelection?.id || 'body.sheet_layout.front_side_back'
    },
    sourceOwnership: context.sourceOwnership || null
  };
}

function collectSelectionIds(selections, predicate) {
  return Object.fromEntries(
    Object.entries(selections)
      .filter(([fieldName, selection]) =>
        selection && !selection.isCustom && selection.id && predicate(selection, fieldName)
      )
      .map(([fieldName, selection]) => [fieldName, selection.id])
  );
}
