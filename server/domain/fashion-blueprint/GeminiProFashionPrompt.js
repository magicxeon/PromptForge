export const GEMINI_PRO_FASHION_MODEL_ID = 'gemini-3-pro-image';
export const GEMINI_PRO_FASHION_PROMPT_STRATEGY_VERSION =
  'GEMINI-PRO-CONCISE-AUTHORITY-V3';

export function resolveFashionExecutionPrompt({
  plan,
  context,
  fallbackPrompt
}) {
  if (!shouldUseGeminiProFashionPrompt(plan, context)) {
    return {
      prompt: fallbackPrompt,
      promptStrategyVersion: plan?.route?.promptStrategyVersion || null
    };
  }

  return {
    prompt: createGeminiProFashionPrompt(context, plan),
    promptStrategyVersion: GEMINI_PRO_FASHION_PROMPT_STRATEGY_VERSION
  };
}

export function createGeminiProFashionPrompt(context, plan = {}) {
  const characterIndex = findReferenceIndex(
    context.referenceRoleManifest,
    'character_reference'
  );
  const outfitFrontIndex = findReferenceIndex(
    context.referenceRoleManifest,
    'outfit_front'
  );
  const outfitBackIndex = findReferenceIndex(
    context.referenceRoleManifest,
    'outfit_back'
  );
  const poseProxyIndex = findReferenceIndex(
    context.referenceRoleManifest,
    'template_baseline'
  );

  const character = `IMAGE_${characterIndex}`;
  const outfitFront = `IMAGE_${outfitFrontIndex}`;
  const poseProxy = `IMAGE_${poseProxyIndex}`;
  const outfitAuthority = outfitBackIndex === null
    ? outfitFront
    : `${outfitFront} and IMAGE_${outfitBackIndex}`;

  return [
    'Create exactly one photorealistic vertical commercial fashion photograph.',
    `${character} is the exclusive authority for the final person. Reconstruct this exact recognizable adult character before applying the target pose. Preserve facial identity, facial proportions, skin tone, hairstyle, height relationship, body shape, and complete body proportions. Ignore the source background, source pose, source clothing, and casting-sheet layout. Do not average or blend identity traits from any other image.`,
    `${outfitAuthority} ${outfitBackIndex === null ? 'is' : 'are'} the exclusive authority for the clothing. Dress the exact character from ${character} in this product. Preserve garment category, silhouette, construction, color, pattern, material, seams, closures, fit, and visible product details. Infer only physically necessary drape, folds, and hidden areas. Ignore any wearer identity, body, pose, environment, and lighting in the outfit source.`,
    `${poseProxy} is an identity-neutral structural pose proxy. Use it only for pose joints, movement, hand placement, neck and head direction, gaze, camera, framing, perspective, environment, architecture, and lighting. It has no identity, face, skin, hair, body, garment, accessory, or footwear authority. Replace the proxy completely and never render mannequin surfaces, wireframe lines, grid lines, or proxy clothing.`,
    `Identity, skin, hair, height, and body proportions must come from ${character} only. Garment must come from ${outfitAuthority} only. Pose and composition must come from ${poseProxy} only.`,
    createDestinationDirection(plan),
    'Output one person in one continuous full-frame photograph. Do not blend identities or reproduce a person from the original Template.'
  ].join('\n\n');
}

function shouldUseGeminiProFashionPrompt(plan, context) {
  if (plan?.route?.providerId !== 'gemini'
    || plan?.route?.modelId !== GEMINI_PRO_FASHION_MODEL_ID
    || !plan?.templatePoseProxy) {
    return false;
  }
  return [
    'character_reference',
    'outfit_front',
    'template_baseline'
  ].every(role => findReferenceIndex(context?.referenceRoleManifest, role) !== null);
}

function findReferenceIndex(manifest, role) {
  const entry = Array.isArray(manifest)
    ? manifest.find(item => Array.isArray(item?.roles) && item.roles.includes(role))
    : null;
  const index = Number(entry?.index);
  return Number.isInteger(index) && index > 0 ? index - 1 : null;
}

function createDestinationDirection(plan) {
  const ratio = plan?.aspectRatio || '6:8';
  return [
    'Create a polished ecommerce fashion campaign image.',
    `Use a ${ratio} vertical composition.`,
    'Keep the complete head-to-feet subject visible with a clear safety margin.',
    'Preserve the pose proxy camera, framing, environment, lighting, walking action, joint positions, hand placement, neck rotation, head direction, and gaze.',
    'Use simple coherent footwear only when footwear is not supplied by the outfit reference.',
    'Do not add jewelry, bags, logos, accessories, garment layers, text, labels, watermarks, extra people, multiple views, a casting sheet, a contact sheet, or a split screen.'
  ].join(' ');
}
