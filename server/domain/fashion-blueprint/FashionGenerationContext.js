import {
  compileGenerationContext
} from '../generation/generationRequestService.js';
import { prepareGenerationReferences } from '../generation/prepareGenerationReferences.js';
import { characterUsageService } from '../character-profiles/CharacterUsageService.js';

const QUALITY_PROMPTS = Object.freeze({
  draft: 'clean ecommerce draft quality with clear garment placement',
  selling_quality: 'high-quality ecommerce selling image with accurate fabric, seams, color and fit',
  premium_campaign: 'premium commercial fashion campaign quality with exceptional garment fidelity and polished lighting'
});

export async function createFashionExecutionContext({
  plan,
  item,
  actorContext,
  providerRegistry,
  templateCoreService
}) {
  const { provider, model } = providerRegistry.resolveSelection(
    plan.route.providerId,
    plan.route.modelId
  );
  const validatedCharacterContext = await characterUsageService.validateGenerationContext(
    plan.characterProfileContext,
    actorContext
  );
  const characterReference =
    validatedCharacterContext.authorizedCharacterReferenceAssetId;
  const session = await templateCoreService.loadSession(
    plan.templateUseSessionId,
    actorContext
  );
  const templateExecution = await templateCoreService.resolveSession(
    plan.templateUseSessionId,
    actorContext,
    createFashionTemplateReplacements(
      session,
      plan,
      item,
      characterReference
    )
  );
  const payload = {
    ...createGenerationPayload(plan, item),
    characterProfileContext: validatedCharacterContext,
    characterReferenceImageA: characterReference,
    sceneTemplateSnapshot: templateExecution.executionSnapshot,
    templateBaselineReference: templateExecution.baselineReference?.imageUrl || null,
    authorizedTemplateReferenceJobIds:
      templateExecution.baselineReference?.sourceGenerationId
        ? [templateExecution.baselineReference.sourceGenerationId]
        : [],
    selections:
      templateExecution.executionSnapshot.structuredSelectionsSnapshot || {},
    sceneBuilder: {
      authoringMode: 'manual',
      manualPromptText: [
        templateExecution.executionSnapshot.finalPromptSnapshot
          || templateExecution.executionSnapshot.manualPromptSnapshot
          || '',
        createFashionPrompt(plan, item)
      ].filter(Boolean).join(' ')
    }
  };
  const { context } = compileGenerationContext(payload, actorContext);
  await prepareGenerationReferences(context, {
    actorContext,
    providerId: provider.id,
    modelId: model.id,
    modelConfig: model
  });
  return {
    context,
    payload,
    provider,
    model,
    templateExecution
  };
}

function createFashionTemplateReplacements(
  resolved,
  plan,
  item,
  characterReference
) {
  const baselineSelections =
    resolved.version.executionSnapshot?.structuredSelectionsSnapshot || {};
  const baselineReferences =
    resolved.version.executionSnapshot?.referenceSlotMapping || {};
  return Object.fromEntries(
    (resolved.version.publicInputSchema?.inputs || []).flatMap(input => {
      const field = String(input.sourceFieldName || '').toLocaleLowerCase();
      const bindingRole = input.fashionBindingRole || null;
      if (input.type === 'reference_image') {
        if (bindingRole === 'fashion.character' || field.includes('character')) {
          return [[input.id, characterReference]];
        }
        if (
          bindingRole === 'fashion.outfit_back'
          || (field.includes('outfit') && field.includes('back'))
        ) {
          return item?.references?.outfit_back
            ? [[input.id, item.references.outfit_back]]
            : [];
        }
        if (
          bindingRole === 'fashion.outfit_front'
          || field.includes('outfit')
        ) {
          return [[input.id, item?.references?.outfit_front]];
        }
        const baseline = baselineReferences[input.sourceFieldName]?.value;
        return baseline ? [[input.id, baseline]] : [];
      }
      if (bindingRole === 'fashion.pose' || field.includes('pose')) {
        return [[
          input.id,
          { value: plan.poseDirection, label: plan.poseDirection }
        ]];
      }
      if (
        bindingRole === 'fashion.environment'
        || field.includes('environment')
        || field.includes('scene')
      ) {
        return [[
          input.id,
          {
            value: plan.environmentDirection,
            label: plan.environmentDirection
          }
        ]];
      }
      if (input.sourceFieldName === 'manualPromptSnapshot') {
        return [[
          input.id,
          resolved.version.executionSnapshot.manualPromptSnapshot
            || resolved.version.executionSnapshot.finalPromptSnapshot
            || ''
        ]];
      }
      const baseline = baselineSelections[input.sourceFieldName];
      return baseline ? [[input.id, baseline]] : [];
    })
  );
}

function createGenerationPayload(plan, item) {
  return {
    provider: plan.route.providerId,
    submodel: plan.route.modelId,
    imageResolution: plan.resolution,
    aspectRatio: plan.aspectRatio,
    outputCount: plan.outputCountPerProduct,
    mode: 'normal',
    generationMode: 'fashion',
    generationSurface: 'fashion',
    template: 'portrait',
    selections: {},
    imageReferences: {
      characterReference: true,
      outfitReference: true,
      faceMatch: false,
      styleMatch: false,
      poseMatch: false,
      characterOverrides: false
    },
    characterReferenceImageA: item.references.character_reference,
    outfitReferenceImageFront: item.references.outfit_front,
    outfitReferenceImageBack: item.references.outfit_back,
    outfitReferenceScope: item.outfitScope || 'full_look',
    sceneBuilder: {
      authoringMode: 'manual',
      manualPromptText: createFashionPrompt(plan, item)
    },
    characterProfileContext: plan.characterProfileContext,
    routingMode: plan.routingMode,
    qualityTier: plan.qualityTier
  };
}

function createFashionPrompt(plan, item) {
  return [
    'Create a professional full-body ecommerce fashion photograph.',
    'Follow the selected template scene, lighting, camera and composition.',
    'Preserve the authorized Character identity and body proportions.',
    `Show the ${item.productType} product named "${item.name}" with accurate silhouette, construction, pattern, color, seams and fabric texture.`,
    `Pose direction: ${plan.poseDirection}.`,
    `Environment direction: ${plan.environmentDirection}.`,
    QUALITY_PROMPTS[plan.qualityTier],
    'Keep the complete model and garment visible with natural commercial posing and do not invent logos or garment details.'
  ].join(' ');
}
