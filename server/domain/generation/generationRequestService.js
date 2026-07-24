import { compilePromptOnServer } from './promptCompiler.js';
import { normalizeReferenceJobIds, stripEmbeddedReferenceDataFromSnapshot } from './referenceUtils.js';
import { sanitizeReferenceSlotsForPublic } from '../scene-templates/sceneTemplateSanitizer.js';

const CHARACTER_SHEET_IDENTITY_GROUPS = new Set(['Character', 'Face', 'Hair', 'Skin']);

function normalizeOutfitReferenceOverrides(value) {
  const raw = value && typeof value === 'object' ? value : {};
  return {
    enabled: raw.enabled === true,
    primaryColor: raw.primaryColor === true,
    secondaryColor: raw.secondaryColor === true,
    pattern: raw.pattern === true,
    material: raw.material === true
  };
}

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

export function normalizeGenerationContext(payload = {}, actorContext = null) {
  const hasFaceReference = Boolean(payload.faceReferenceImageA || payload.faceReferenceImageB);
  const hasStyleReference = Boolean(payload.styleReferenceImageA || payload.styleReferenceImageB);
  const hasCharacterReference = Boolean(payload.characterReferenceImageA || payload.characterReferenceImageB);
  const hasOutfitFront = Boolean(payload.outfitReferenceImageFront);
  const hasOutfitBack = Boolean(payload.outfitReferenceImageBack);
  const mode = payload.mode || 'normal';
  const hasTemplateOutfit = payload.sceneTemplateSnapshot
    && payload.sceneTemplateSnapshot.referenceSlotMapping
    && (payload.sceneTemplateSnapshot.referenceSlotMapping.outfit_front_reference !== undefined
        || payload.sceneTemplateSnapshot.referenceSlotMapping.outfit_back_reference !== undefined);
  const allowOutfit = mode === 'character-sheet'
    || hasTemplateOutfit
    || payload.generationSurface === 'playground';
  if (allowOutfit && hasOutfitBack && !hasOutfitFront) {
    const error = new Error('Outfit Front is required when an Outfit Back reference is supplied.');
    error.statusCode = 400;
    error.code = 'outfit_front_required';
    throw error;
  }
  const outfitReferenceOverrides = normalizeOutfitReferenceOverrides(payload.outfitReferenceOverrides);
  const imageReferences = {
    ...(payload.imageReferences || {}),
    faceMatch: payload.imageReferences?.faceMatch === true && hasFaceReference,
    styleMatch: mode === 'normal' && payload.imageReferences?.styleMatch === true && hasStyleReference,
    poseMatch: mode === 'normal' && payload.imageReferences?.poseMatch === true && hasStyleReference,
    characterReference: mode === 'normal'
      && payload.imageReferences?.characterReference === true
      && hasCharacterReference,
    outfitReference: allowOutfit
      && hasOutfitFront,
    outfitReferenceFront: allowOutfit
      && hasOutfitFront,
    outfitReferenceBack: allowOutfit
      && hasOutfitFront
      && hasOutfitBack,
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
  let sceneTemplateSnapshot = payload.sceneTemplateSnapshot
    ? stripEmbeddedReferenceDataFromSnapshot(payload.sceneTemplateSnapshot)
    : null;

  if (sceneTemplateSnapshot) {
    // The generate endpoint must not trust caller-provided ownership fields. Public
    // snapshots are therefore treated as cross-user unless a future server-issued
    // template capability proves ownership.
    sceneTemplateSnapshot = sanitizeReferenceSlotsForPublic(sceneTemplateSnapshot, actorContext || {}, null);
  }

  return {
    ...payload,
    mode,
    sceneBuilder,
    sceneTemplateSnapshot,
    template: payload.template || 'portrait',
    aspectRatio: payload.aspectRatio || '1:1',
    imageReferences,
    outfitReferenceOverrides,
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

export function compileGenerationContext(payload = {}, actorContext = null) {
  const context = normalizeGenerationContext(payload, actorContext);
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
      context.customColors,
      context.outfitReferenceOverrides
    ));
  return { context, compiledPrompt };
}

export function createQueueOptions(context, {
  jobId = null,
  username,
  stream,
  modelConfig,
  providerConfigVersion,
  creditCost,
  imageResolution = null,
  comparison = null,
  reservationId = null,
  pricingSnapshot = null,
  routingSnapshot = null,
  payerUserId = null,
  estimateId = null,
  requestId = null
}) {
  const references = context.imageReferences;
  return {
    jobId,
    selections: context.selections && typeof context.selections === 'object' ? context.selections : {},
    sceneBuilder: context.sceneBuilder || null,
    sceneTemplateSnapshot: context.sceneTemplateSnapshot || null,
    aspectRatio: context.aspectRatio,
    imageReferences: references,
    sourceOwnership: context.sourceOwnership || null,
    characterSheetConfig: context.characterSheetConfig || null,
    outfitReferenceOverrides: context.outfitReferenceOverrides || normalizeOutfitReferenceOverrides(null),
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
    reservationId,
    pricingSnapshot,
    routingSnapshot,
    payerUserId: payerUserId || username || 'usr_demo',
    estimateId,
    requestId,
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
    outfitReferenceOverrides: normalizeOutfitReferenceOverrides(context.outfitReferenceOverrides),
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
