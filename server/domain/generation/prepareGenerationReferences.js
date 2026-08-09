import { characterUsageService } from '../character-profiles/CharacterUsageService.js';
import { referenceProcessingService } from '../reference-processing/index.js';

export async function prepareGenerationReferences(context, {
  actorContext,
  providerId,
  modelId,
  modelConfig,
  characterService = characterUsageService,
  processingService = referenceProcessingService
}) {
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

  return processingService.processContext(context, {
    actorContext,
    providerId,
    modelId,
    modelConfig
  });
}
