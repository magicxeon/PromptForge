export const REFERENCE_ROLE_ORDER = Object.freeze([
  'template_baseline_reference',
  'character_reference_a',
  'character_reference_b',
  'outfit_front_reference',
  'outfit_back_reference',
  'face_reference_a',
  'face_reference_b',
  'style_reference',
  'pose_reference'
]);

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validatePlaygroundReferenceRoles(payload = {}) {
  if (payload.generationSurface !== 'playground') return;

  const references = payload.imageReferences || {};
  const hasFace = references.faceMatch === true
    && (hasValue(payload.faceReferenceImageA) || hasValue(payload.faceReferenceImageB));
  const hasCharacter = references.characterReference === true
    && (hasValue(payload.characterReferenceImageA) || hasValue(payload.characterReferenceImageB));
  const hasOutfitBack = hasValue(payload.outfitReferenceImageBack);
  const hasOutfitFront = hasValue(payload.outfitReferenceImageFront);

  if (hasFace && hasCharacter) {
    const error = new Error('Face Reference and Character Reference cannot be used together in Playground.');
    error.statusCode = 400;
    error.code = 'reference_role_conflict';
    throw error;
  }

  if (hasOutfitBack && !hasOutfitFront) {
    const error = new Error('Outfit Front is required when an Outfit Back reference is supplied.');
    error.statusCode = 400;
    error.code = 'outfit_front_required';
    throw error;
  }
}

export function createReferenceRoleManifest(context = {}) {
  const references = context.imageReferences || {};
  const manifest = [];
  const indexesByValue = new Map();
  const add = (role, value) => {
    if (!hasValue(value)) return;
    const existingIndex = indexesByValue.get(value);
    if (existingIndex !== undefined) {
      const roles = manifest[existingIndex].roles;
      if (!roles.includes(role)) roles.push(role);
      return;
    }
    indexesByValue.set(value, manifest.length);
    manifest.push({ index: manifest.length + 1, roles: [role] });
  };

  add('template_baseline_reference', context.templateBaselineReference);
  if (references.characterReference) {
    add('character_reference_a', context.characterReferenceImageA);
    add('character_reference_b', context.characterReferenceImageB);
  }
  if (references.outfitReference) {
    add('outfit_front_reference', context.outfitReferenceImageFront);
    add('outfit_back_reference', context.outfitReferenceImageBack);
  }
  if (references.faceMatch) {
    add('face_reference_a', context.faceReferenceImageA);
    add('face_reference_b', context.faceReferenceImageB);
  }

  if (references.styleMatch && references.poseMatch) {
    if (context.generationSurface === 'playground') {
      add('style_reference', context.styleReferenceImageA);
      add('pose_reference', context.styleReferenceImageB);
    } else {
      add('style_reference', context.styleReferenceImageA);
      add('pose_reference', context.styleReferenceImageA);
      add('style_reference', context.styleReferenceImageB);
      add('pose_reference', context.styleReferenceImageB);
    }
  } else if (references.styleMatch) {
    add('style_reference', context.styleReferenceImageA);
    add('style_reference', context.styleReferenceImageB);
  } else if (references.poseMatch) {
    add('pose_reference', context.styleReferenceImageA);
    add('pose_reference', context.styleReferenceImageB);
  }

  return manifest;
}

const ROLE_DIRECTIVES = Object.freeze({
  template_baseline_reference: 'preserve the published template composition, camera framing, pose, environment, lighting, outfit, garment details, and visual treatment; change only inputs explicitly supplied as template replacements, and do not preserve the original facial identity when a face or character replacement is supplied',
  character_reference_a: 'preserve the same character identity, face, hair, skin, and body proportions while allowing the requested destination pose, outfit, environment, and visual treatment',
  character_reference_b: 'use as an additional view of the same character identity',
  outfit_front_reference: 'copy only the front garment silhouette, colors, pattern, material, construction, and visible clothing details',
  outfit_back_reference: 'copy only the matching back garment construction and visible clothing details',
  face_reference_a: 'preserve only the recognizable facial identity and facial proportions; do not copy body, pose, outfit, environment, or visual style',
  face_reference_b: 'use as an additional view of the same facial identity',
  style_reference: 'apply only lighting, palette, contrast, texture, camera or rendering treatment, and visual mood; do not copy identity, body, pose, garment design, or scene content',
  pose_reference: 'apply only body arrangement, gesture, framing intent, and approximate composition; do not copy identity, clothing, environment, or rendering style'
});

export function compileReferenceRoleDirective(context = {}) {
  const manifest = createReferenceRoleManifest(context);
  if (!manifest.length) return '';

  const entries = manifest.map(entry => {
    const roleInstructions = entry.roles.map(role => `${role}: ${ROLE_DIRECTIVES[role]}`).join(' ');
    return `Reference image ${entry.index}: ${roleInstructions}.`;
  });
  return [
    'Interpret the uploaded reference images only according to the following ordered role manifest.',
    ...entries,
    'When role instructions conflict with incidental content visible in a reference, follow the role boundary and the destination prompt.'
  ].join(' ');
}
