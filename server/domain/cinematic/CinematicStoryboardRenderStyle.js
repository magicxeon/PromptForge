// Persisted output styles, not provider acceptance guarantees.
export const STORYBOARD_RENDER_STYLES = Object.freeze(['concept_sketch_v1', 'photorealistic_storyboard_v1', 'faceless_previs_v1', 'white_previs_v1']);

export function normalizeStoryboardRenderStyle(value) {
  return STORYBOARD_RENDER_STYLES.includes(value) ? value : null;
}

export function resolveStoryboardPromptPolicy(policy, faceless, treatment = 'blank') {
  if (faceless === true && treatment === 'white_previs' && policy.whitePrevisOverrides) {
    return { ...policy, ...policy.whitePrevisOverrides,
      referenceRoleInstructions: { ...policy.referenceRoleInstructions, ...policy.whitePrevisOverrides.referenceRoleInstructions } };
  }
  if (faceless !== false || !policy.photorealisticOverrides) return policy;
  return { ...policy, ...policy.photorealisticOverrides,
    referenceRoleInstructions: { ...policy.referenceRoleInstructions, ...policy.photorealisticOverrides.referenceRoleInstructions } };
}

export function storyboardCompositionPurpose(style) {
  if (style === 'concept_sketch_v1') return 'sketch_composition';
  if (['photorealistic_storyboard_v1', 'faceless_previs_v1', 'white_previs_v1'].includes(style)) return 'storyboard_composition';
  return null;
}

export function isStoryboardCompositionReference(reference, style) {
  const purpose = storyboardCompositionPurpose(style);
  return Boolean(purpose && reference?.role === 'reference_image' && reference.purpose === purpose);
}
