import { characterUsageService } from '../character-profiles/CharacterUsageService.js';
import { referenceProcessingService } from '../reference-processing/index.js';

export async function prepareGenerationReferences(context, {
  actorContext,
  providerId,
  modelId,
  modelConfig
}) {
  context.characterProfileContext = await characterUsageService.validateGenerationContext(
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
    // The approved three-view casting asset gives Gemini stronger identity,
    // skin-tone and body-proportion evidence than an inferred face crop.
    context.characterReferenceImageA = canonicalAssetId;
    context.characterReferenceImageB = null;
    context.characterReferenceJobIds = [canonicalAssetId];
    context.imageReferences.characterReference = true;
  }

  return referenceProcessingService.processContext(context, {
    actorContext,
    providerId,
    modelId,
    modelConfig
  });
}
