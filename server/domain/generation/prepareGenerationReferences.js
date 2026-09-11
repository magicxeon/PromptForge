import { characterUsageService } from '../character-profiles/CharacterUsageService.js';
import { referenceProcessingService } from '../reference-processing/index.js';
import { generationResultRepo } from '../../repositories/generation/GenerationResultRepository.js';
import { resolveSourceCharacterIdentity } from '../character-profiles/characterIdentityMetadata.js';
import { acceptLookSheetSnapshot, compileLookSheetPrompt } from '../character-profiles/LookSheetDefinitionService.js';
import { lookSheetEnhancementService } from './LookSheetEnhancementService.js';
import { resolveCinematicCastReferences } from '../cinematic/CinematicImageCastReferences.js';

export async function prepareGenerationReferences(context, {
  actorContext,
  providerId,
  modelId,
  modelConfig,
  characterService = characterUsageService,
  processingService = referenceProcessingService,
  generationRepository = generationResultRepo,
  enhancementService = lookSheetEnhancementService,
  cinematicCastResolver = resolveCinematicCastReferences
}) {
  if (context.cinematicCastReferences?.length) {
    if (context.generationSurface !== 'cinematic' || context.characterProfileContext) {
      throw Object.assign(new Error('Cinematic Cast sheets cannot be mixed with a Character override.'), { code: 'cinematic_cast_references_invalid', statusCode: 400 });
    }
    context.cinematicCastReferences = await cinematicCastResolver(context.cinematicCastReferences, actorContext);
  }
  context.characterProfileContext = await characterService.validateGenerationContext(
    context.characterProfileContext,
    actorContext
  );

  if (context.characterProfileContext?.purpose === 'character_usage') {
    context.characterReferenceOutfitBehavior =
      context.characterProfileContext.outfitBehavior === 'replaceable'
        ? 'replaceable'
        : 'preserve';
    const canonicalAssetId =
      context.characterProfileContext.authorizedCharacterReferenceAssetId;
    const explicitFaceReference = context.imageReferences.faceMatch === true
      && Boolean(context.faceReferenceImageA || context.faceReferenceImageB);
    const canonicalFaceAssetId =
      context.characterProfileContext.authorizedCharacterFaceReferenceAssetId
      || context.characterProfileContext.authorizedCharacterFaceReferenceUrl
      || null;
    context.characterReferenceImageA = canonicalAssetId;
    context.characterReferenceImageB = null;
    context.characterReferenceJobIds = [canonicalAssetId];
    context.imageReferences.characterReference = true;
    if (!explicitFaceReference && canonicalFaceAssetId) {
      context.faceReferenceImageA = canonicalFaceAssetId;
      context.faceReferenceImageB = null;
      context.faceReferenceJobIds = [canonicalFaceAssetId];
      context.imageReferences.faceMatch = true;
      context.characterProfileContext.faceAuthoritySource = 'character_canonical_face';
    } else if (explicitFaceReference) {
      context.characterProfileContext.faceAuthoritySource = 'explicit_face_override';
    } else {
      context.characterProfileContext.faceAuthoritySource = 'character_three_view_fallback';
    }
  }

  const result = await processingService.processContext(context, {
    actorContext,
    providerId,
    modelId,
    modelConfig
  });
  if (context.mode === 'character-sheet' && context.characterSheetConfig) {
    context.characterSheetConfig.identityMetadata = await resolveSourceCharacterIdentity({
      selections: context.selections,
      characterSheetConfig: { sourceHeadshotIds: context.faceReferenceJobIds || [] }
    }, actorContext.userId, generationRepository);
  }
  context.lookSheetSnapshot = acceptLookSheetSnapshot(context);
  if (context.lookSheetEnhancementId) {
    if (!context.lookSheetSnapshot || context.generationSurface !== 'playground') {
      throw Object.assign(new Error('Enhancement cannot be used here.'), { code: 'enhancement_stale', statusCode: 400 });
    }
    const artifact = await enhancementService.resolve(context.lookSheetEnhancementId, actorContext.userId,
      context.lookSheetSnapshot, compileLookSheetPrompt(context));
    context.lookSheetEnhancedPrompt = artifact.prompt;
    context.lookSheetSnapshot = { ...context.lookSheetSnapshot, enhancementId: artifact.id,
      enhancementRecipeVersion: artifact.recipeVersion, fingerprint: artifact.fingerprint };
  }
  return result;
}
