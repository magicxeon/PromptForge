import {
  compileGenerationContext
} from '../generation/generationRequestService.js';
import { prepareGenerationReferences } from '../generation/prepareGenerationReferences.js';
import { characterUsageService } from '../character-profiles/CharacterUsageService.js';

export async function createFashionExecutionContext({
  plan,
  item,
  actorContext,
  providerRegistry,
  templateCoreService
}) {
  const { provider, model } = providerRegistry.resolveSelection(
    plan.route.providerId,
    plan.route.modelId,
    { generationSurface: 'fashion', generationMode: 'fashion' }
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
    templateBaselineReference: plan.templatePoseProxy?.imageUrl
      || templateExecution.baselineReference?.imageUrl
      || null,
    authorizedTemplateReferenceJobIds:
      plan.templatePoseProxy?.sourceGenerationId
        ? [plan.templatePoseProxy.sourceGenerationId]
        : templateExecution.baselineReference?.sourceGenerationId
          ? [templateExecution.baselineReference.sourceGenerationId]
          : [],
    selections:
      templateExecution.executionSnapshot.structuredSelectionsSnapshot || {},
    sceneBuilder: {
      authoringMode: 'manual',
      manualPromptText: createFashionExecutionPrompt(
        plan,
        item,
        templateExecution.executionSnapshot
      )
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

export function createFashionExecutionPrompt(plan, item, executionSnapshot = {}) {
  const templatePrompt = plan.templatePoseProxy
    ? ''
    : executionSnapshot.finalPromptSnapshot
      || executionSnapshot.manualPromptSnapshot
      || '';
  return [
    templatePrompt,
    createFashionPrompt(plan, item, executionSnapshot)
  ].filter(Boolean).join(' ');
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
        if (
          bindingRole === 'fashion.character'
          || field.includes('character')
          || field.includes('face')
        ) {
          return [[input.id, characterReference]];
        }
        if (
          bindingRole === 'fashion.outfit_back'
          || (field.includes('outfit') && field.includes('back'))
        ) {
          return item?.references?.outfit_back
            ? [[input.id, referenceUrl(item.references.outfit_back)]]
            : [];
        }
        if (
          bindingRole === 'fashion.outfit_front'
          || field.includes('outfit')
        ) {
          return [[input.id, referenceUrl(item?.references?.outfit_front)]];
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
    characterReferenceImageA: referenceUrl(item.references.character_reference),
    outfitReferenceImageFront: referenceUrl(item.references.outfit_front),
    outfitReferenceImageBack: referenceUrl(item.references.outfit_back),
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

export function createFashionPrompt(plan, item, executionSnapshot = {}) {
  const performanceDirection = createTemplatePerformanceDirection(
    executionSnapshot
  );
  return [
    'Create a professional full-body ecommerce fashion photograph.',
    plan.templatePoseProxy
      ? 'The Template reference is an identity-neutral pose proxy that may appear as a gray mannequin or technical wireframe. Use it only for exact pose joints, hand placement, neck rotation, head yaw, head pitch, head roll, facial-plane direction, gaze direction, camera, framing, environment and lighting; it has no identity, skin, hair, body or clothing authority.'
      : 'Follow the selected template scene, lighting, camera and composition.',
    'Preserve the authorized Character identity and body proportions.',
    `Show the ${item.productType} product named "${item.name}" with accurate silhouette, construction, pattern, color, seams and fabric texture.`,
    `Pose direction: ${plan.poseDirective || plan.poseDirection}.`,
    `Environment direction: ${plan.environmentDirective || plan.environmentDirection}.`,
    plan.qualityPromptDirective,
    item.colorNotes ? `Product color notes: ${item.colorNotes}.` : '',
    `Product integrity mode: ${item.integrityLevel}.`,
    'Keep the complete model and garment visible with natural commercial posing and do not invent logos or garment details.',
    plan.templatePoseProxy
      ? 'Replace the pose proxy completely. Copy its complete joint layout, neck-to-shoulder relationship, head and face direction, and contact points without reproducing wireframe lines, a mannequin surface or any person from the original Template.'
      : '',
    plan.templatePoseProxy
      ? 'Reconstruct every visible human surface from the authorized Character, including the complete hands, fingers, legs, ankles and feet. Never retain proxy limb anatomy, mannequin joints, synthetic feet, grid fabric, proxy clothing or gray mannequin material in the final person.'
      : '',
    performanceDirection
  ].filter(Boolean).join(' ');
}

function createTemplatePerformanceDirection(executionSnapshot) {
  const selections = executionSnapshot?.structuredSelectionsSnapshot || {};
  const expression = selectionValue(selections.Expression);
  if (!expression) return '';
  return [
    `Template performance direction: ${expression}.`,
    'Preserve this non-identity expression as a performance by the selected Character while retaining the pose-proxy head and gaze direction.',
    'Do not copy the Template person face, facial geometry or identity to reproduce the expression.'
  ].join(' ');
}

function selectionValue(selection) {
  if (typeof selection === 'string') return selection.trim();
  return typeof selection?.value === 'string' ? selection.value.trim() : '';
}

function referenceUrl(reference) {
  if (!reference) return null;
  return typeof reference === 'string'
    ? reference
    : reference.imageUrl || reference.publicUrl || reference.assetId || null;
}
