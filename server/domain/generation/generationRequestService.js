import { compilePromptOnServer } from './promptCompiler.js';
import {
  normalizeReferenceJobIds,
  normalizeReferenceValue,
  stripEmbeddedReferenceDataFromSnapshot
} from './referenceUtils.js';
import { sanitizeReferenceSlotsForPublic } from '../scene-templates/sceneTemplateSanitizer.js';
import { getCharacterCastingPolicy } from '../character-profiles/characterCastingPolicy.js';
import {
  CHARACTER_TYPE,
  normalizeCharacterType
} from '../character-profiles/characterTypePolicy.js';
import {
  compileReferenceRoleDirective,
  createReferenceRoleManifest,
  validatePlaygroundReferenceRoles
} from './referenceRolePolicy.js';
import { faceReferenceHandoffService } from './FaceReferenceHandoffService.js';

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

function normalizePromptMode(payload) {
  if (payload.generationMode === 'headshot') return 'headshot';
  if (payload.generationMode === 'character-sheet') return 'character-sheet';
  if (['scene', 'playground', 'fashion'].includes(payload.generationMode)) {
    return 'normal';
  }
  return ['headshot', 'character-sheet', 'normal'].includes(payload.mode)
    ? payload.mode
    : 'normal';
}

function normalizeCharacterReferenceOutfitBehavior(value) {
  return value === 'replaceable' ? 'replaceable' : 'preserve';
}

export function normalizeGenerationContext(payload = {}, actorContext = null) {
  validatePlaygroundReferenceRoles(payload);
  const isCharacterCastingExport = payload.characterProfileContext?.purpose === 'character_casting_export';
  const requestedOutputCount = Number(payload.outputCount || 1);
  const hasFaceReference = Boolean(payload.faceReferenceImageA || payload.faceReferenceImageB);
  const faceReferenceJobId = normalizeReferenceValue(payload.faceReferenceImageA)?.jobId || null;
  const faceReferenceAuthorization = payload.faceReferenceContext?.authorizationToken
    ? faceReferenceHandoffService.verifyAuthorization(
      payload.faceReferenceContext.authorizationToken,
      actorContext,
      faceReferenceJobId
    )
    : null;
  const hasStyleReference = Boolean(payload.styleReferenceImageA || payload.styleReferenceImageB);
  const hasCharacterReference = Boolean(payload.characterReferenceImageA || payload.characterReferenceImageB);
  const hasOutfitFront = Boolean(payload.outfitReferenceImageFront);
  const hasOutfitBack = Boolean(payload.outfitReferenceImageBack);
  const mode = normalizePromptMode(payload);
  const characterType = mode === 'character-sheet'
    ? normalizeCharacterType(payload.characterType)
    : null;
  const reusableCharacterSheet = mode === 'character-sheet'
    && characterType === CHARACTER_TYPE.REUSABLE_MODEL;
  const castingPolicy = getCharacterCastingPolicy();
  const normalizedAspectRatio = (isCharacterCastingExport || reusableCharacterSheet)
    ? castingPolicy.aspectRatio
    : (payload.aspectRatio || '1:1');
  const normalizedOutputCount = (isCharacterCastingExport || reusableCharacterSheet)
    ? castingPolicy.outputCount
    : Math.max(1, Number.isFinite(requestedOutputCount) ? requestedOutputCount : 1);
  const hasTemplateOutfit = payload.sceneTemplateSnapshot
    && payload.sceneTemplateSnapshot.referenceSlotMapping
    && (payload.sceneTemplateSnapshot.referenceSlotMapping.outfit_front_reference !== undefined
        || payload.sceneTemplateSnapshot.referenceSlotMapping.outfit_back_reference !== undefined);
  const allowOutfit = (mode === 'character-sheet' && !reusableCharacterSheet)
    || hasTemplateOutfit
    || payload.generationSurface === 'playground'
    || payload.generationSurface === 'fashion';
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
    characterReference: (mode === 'normal' || isCharacterCastingExport)
      && payload.imageReferences?.characterReference === true
      && hasCharacterReference,
    outfitReference: allowOutfit
      && hasOutfitFront,
    outfitReferenceFront: allowOutfit
      && hasOutfitFront,
    outfitReferenceBack: allowOutfit
      && hasOutfitFront
      && hasOutfitBack,
    characterOverrides: (mode === 'normal' || isCharacterCastingExport)
      && payload.imageReferences?.characterReference === true
      && hasCharacterReference
      && payload.imageReferences?.characterOverrides === true
  };
  delete imageReferences.useReferenceImage;

  const activeReferenceValues = [
    payload.templateBaselineReference,
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
  const characterReferenceOutfitBehavior = normalizeCharacterReferenceOutfitBehavior(
    payload.characterReferenceOutfitBehavior
      || payload.characterProfileContext?.outfitBehavior
  );
  const selections = reusableCharacterSheet
    ? Object.fromEntries(Object.entries(payload.selections || {}).filter(([, selection]) =>
      selection?.group !== 'Clothing'
    ))
    : (payload.selections || {});
  let sceneTemplateSnapshot = payload.sceneTemplateSnapshot
    ? stripEmbeddedReferenceDataFromSnapshot(payload.sceneTemplateSnapshot)
    : null;

  if (sceneTemplateSnapshot) {
    // The generate endpoint must not trust caller-provided ownership fields. Public
    // snapshots are therefore treated as cross-user unless a future server-issued
    // template capability proves ownership.
    sceneTemplateSnapshot = sanitizeReferenceSlotsForPublic(sceneTemplateSnapshot, actorContext || {}, null);
  }

  const normalizedContext = {
    ...payload,
    mode,
    characterType,
    characterReferenceOutfitBehavior,
    selections,
    sceneBuilder,
    sceneTemplateSnapshot,
    template: payload.template || 'portrait',
    aspectRatio: normalizedAspectRatio,
    outputCount: normalizedOutputCount,
    imageReferences,
    outfitReferenceOverrides,
    sourceOwnership: payload.sourceOwnership && typeof payload.sourceOwnership === 'object'
      ? payload.sourceOwnership
      : null,
    characterSheetConfig: createCharacterSheetConfigSnapshot({
      ...payload,
      mode,
      characterType,
      selections,
      imageReferences,
      aspectRatio: normalizedAspectRatio,
      outputCount: normalizedOutputCount,
      sourceOwnership: payload.sourceOwnership && typeof payload.sourceOwnership === 'object'
        ? payload.sourceOwnership
        : null
    }),
    characterProfileContext: normalizeCharacterProfileContext(payload.characterProfileContext),
    authorizedFaceReferenceJobIds: faceReferenceAuthorization
      ? normalizeReferenceJobIds([faceReferenceAuthorization.jobId])
      : [],
    authorizedTemplateReferenceJobIds: normalizeReferenceJobIds(
      payload.authorizedTemplateReferenceJobIds
    ),
    referenceCount: new Set(activeReferenceValues).size
  };
  normalizedContext.referenceRoleManifest = createReferenceRoleManifest(normalizedContext);
  return normalizedContext;
}

export function compileGenerationContext(payload = {}, actorContext = null) {
  const context = normalizeGenerationContext(payload, actorContext);
  return {
    context,
    compiledPrompt: compilePromptFromGenerationContext(context)
  };
}

export function compilePromptFromGenerationContext(context) {
  const adminPromptOverride = typeof context.adminPromptOverride === 'string'
    ? context.adminPromptOverride.trim()
    : '';
  const manualScenePrompt = context.mode === 'normal'
    && context.sceneBuilder?.authoringMode === 'manual'
    && typeof context.sceneBuilder.manualPromptText === 'string'
    ? context.sceneBuilder.manualPromptText.trim()
    : '';
  const manualReferenceDirective = manualScenePrompt && !context.templateBaselineReference
    ? compileReferenceRoleDirective(context)
    : '';
  const reusableCharacterSheet = context.mode === 'character-sheet'
    && context.characterType === CHARACTER_TYPE.REUSABLE_MODEL;
  const castingExport = context.characterProfileContext?.purpose === 'character_casting_export';
  const usesCastingLayout = reusableCharacterSheet || castingExport;
  const castingPolicy = getCharacterCastingPolicy();
  const basePrompt = context.userRole === 'admin' && adminPromptOverride
    ? adminPromptOverride
    : (manualScenePrompt
      ? [manualReferenceDirective, manualScenePrompt].filter(Boolean).join(' ')
    : compilePromptOnServer(
      context.selections,
      context.aspectRatio,
      context.imageReferences,
      context.mode,
      context.template,
      context.isGptSafe,
      context.customColors,
      context.outfitReferenceOverrides,
      {
        characterReferenceOutfitBehavior: context.characterReferenceOutfitBehavior,
        ...(usesCastingLayout
          ? {
            characterSheetLayoutOverride: castingPolicy.promptDirective,
            omitCharacterSheetClothing: true
          }
          : {})
      }
    ));
  const templateDirectedPrompt = context.templateBaselineReference
    ? [compileReferenceRoleDirective(context), basePrompt].filter(Boolean).join(' ')
    : basePrompt;
  const effectiveCharacterOutfitBehavior = normalizeCharacterReferenceOutfitBehavior(
    context.characterReferenceOutfitBehavior
      || context.characterProfileContext?.outfitBehavior
  );
  const preserveCharacterOutfit = effectiveCharacterOutfitBehavior === 'preserve'
    && context.imageReferences?.outfitReference !== true;
  const characterReferenceDirective = (
    context.imageReferences?.characterReference
    || context.characterProfileContext?.purpose === 'character_usage'
  )
    ? [
      'Use the selected character reference only to preserve the same character identity and body proportions.',
      preserveCharacterOutfit
        ? 'Preserve the original outfit identity and garment details from the outfit-bound character reference.'
        : context.imageReferences?.outfitReference === true
          ? 'Replace the source outfit with the explicitly supplied outfit reference while preserving the character identity and body proportions.'
          : 'The fitted white casting uniform in that reusable character reference is not the target outfit and must not be copied.',
      preserveCharacterOutfit
        ? 'Follow the destination expression, pose, styling, and environment directions without replacing the original outfit.'
        : 'Follow the destination expression, pose, clothing, styling, and environment directions.'
    ]
    : [];
  return castingExport
      ? (context.userRole === 'admin' && adminPromptOverride
      ? `${castingPolicy.promptDirective}, ${templateDirectedPrompt}`
      : templateDirectedPrompt)
    : context.characterProfileContext?.purpose === 'character_usage'
      ? [
        ...characterReferenceDirective,
        context.characterProfileContext.personalitySummarySnapshot
          ? `Portray the character personality as: ${context.characterProfileContext.personalitySummarySnapshot}.`
          : '',
        templateDirectedPrompt
      ].filter(Boolean).join(' ')
      : characterReferenceDirective.length
        ? [...characterReferenceDirective, templateDirectedPrompt].filter(Boolean).join(' ')
      : reusableCharacterSheet && context.userRole === 'admin' && adminPromptOverride
        ? `${castingPolicy.promptDirective}, ${templateDirectedPrompt}`
        : templateDirectedPrompt;
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
  requestId = null,
  templateUseContext = null
}) {
  const references = context.imageReferences;
  const {
    authorizedCharacterReferenceAssetId,
    ...persistedCharacterProfileContext
  } = context.characterProfileContext || {};
  return {
    jobId,
    selections: context.selections && typeof context.selections === 'object' ? context.selections : {},
    sceneBuilder: context.sceneBuilder || null,
    sceneTemplateSnapshot: context.sceneTemplateSnapshot || null,
    referenceRoleManifest: context.referenceRoleManifest || [],
    referenceProcessingLineage: context.referenceProcessingLineage || null,
    referenceProcessingPlan: context.referenceProcessing
      ? {
        policyVersion: context.referenceProcessing.policyVersion,
        planFingerprint: context.referenceProcessing.planFingerprint,
        providerPlan: structuredClone(context.referenceProcessing.providerPlan),
        processedReferences: context.referenceProcessing.processedReferences.map(reference => ({
          slotId: reference.slotId,
          role: reference.role,
          sourceAssetId: reference.sourceAssetId,
          derivativeAssetId: reference.derivativeAssetId,
          processorIds: [...reference.processorIds],
          processorVersions: { ...reference.processorVersions },
          detectedScope: reference.detectedScope,
          confidence: reference.confidence,
          warningCodes: [...reference.warningCodes]
        }))
      }
      : null,
    aspectRatio: context.aspectRatio,
    imageReferences: references,
    sourceOwnership: context.sourceOwnership || null,
    characterSheetConfig: context.characterSheetConfig || null,
    characterReferenceOutfitBehavior: context.characterReferenceOutfitBehavior,
    characterProfileContext: context.characterProfileContext
      ? persistedCharacterProfileContext
      : null,
    authorizedCharacterReferenceJobIds:
      context.characterProfileContext?.purpose === 'character_usage'
        ? normalizeReferenceJobIds([authorizedCharacterReferenceAssetId])
        : [],
    authorizedFaceReferenceJobIds: normalizeReferenceJobIds(
      context.authorizedFaceReferenceJobIds
    ),
    authorizedTemplateReferenceJobIds: normalizeReferenceJobIds(
      context.authorizedTemplateReferenceJobIds
    ),
    outfitReferenceOverrides: context.outfitReferenceOverrides || normalizeOutfitReferenceOverrides(null),
    storyReferenceHandoff: context.mode === 'character-sheet'
      ? {
        referenceType: 'character-sheet',
        identityLocked: true,
        outfitLocked: context.characterType !== CHARACTER_TYPE.REUSABLE_MODEL,
        outfitBehavior: context.characterType === CHARACTER_TYPE.REUSABLE_MODEL
          ? 'replaceable'
          : 'preserve',
        sourceJobId: null
      }
      : null,
    mode: context.mode,
    generationMode: context.generationMode || null,
    generationSurface: context.generationSurface || null,
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
    templateUseContext: templateUseContext && typeof templateUseContext === 'object'
      ? structuredClone(templateUseContext)
      : null,
    imageResolution: imageResolution || context.imageResolution || modelConfig.defaults?.resolution || null,
    templateBaselineReference: context.templateBaselineReference || null,
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

function normalizeCharacterProfileContext(value) {
  if (!value || typeof value !== 'object') return null;
  const characterProfileId = String(value.characterProfileId || '').trim();
  const characterProfileVersionId = String(value.characterProfileVersionId || '').trim();
  if (!characterProfileId || !characterProfileVersionId) return null;
  return {
    purpose: value.purpose === 'character_casting_export' ? 'character_casting_export' : 'character_usage',
    characterProfileId,
    characterProfileVersionId,
    useCase: ['fashion', 'scene_story', 'general'].includes(value.useCase) ? value.useCase : 'general',
    sourceType: ['fashion_blueprint', 'scene_builder', 'direct_generation'].includes(value.sourceType)
      ? value.sourceType
      : 'direct_generation',
    sourceId: typeof value.sourceId === 'string' ? value.sourceId : null,
    characterType: normalizeCharacterType(value.characterType),
    outfitBehavior: value.outfitBehavior === 'preserve' ? 'preserve' : 'replaceable'
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
  const characterType = normalizeCharacterType(context.characterType);
  const reusableModel = characterType === CHARACTER_TYPE.REUSABLE_MODEL;
  const castingPolicy = reusableModel ? getCharacterCastingPolicy() : null;

  return {
    version: 1,
    mode: 'character-sheet',
    characterType,
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
      type: reusableModel
        ? castingPolicy.layoutId
        : (layoutSelection?.id || 'body.sheet_layout.front_side_back')
    },
    castingCandidate: reusableModel,
    castingLayoutVersion: reusableModel ? castingPolicy.layoutId : null,
    uniformPolicyVersion: reusableModel ? castingPolicy.uniformPolicyId : null,
    aspectRatio: reusableModel ? castingPolicy.aspectRatio : (context.aspectRatio || null),
    outputCount: reusableModel ? castingPolicy.outputCount : Number(context.outputCount || 1),
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
