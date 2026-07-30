const LEGACY_REFERENCE_KEYS = Object.freeze([
  'resolvedTemplateBaselineReference',
  'resolvedCharacterReferenceImageA',
  'resolvedCharacterReferenceImageB',
  'resolvedOutfitReferenceImageFront',
  'resolvedOutfitReferenceImageBack',
  'resolvedFaceReferenceImageA',
  'resolvedFaceReferenceImageB',
  'resolvedStyleReferenceImageA',
  'resolvedStyleReferenceImageB'
]);

export function getResolvedReferenceImages(options = {}) {
  if (Array.isArray(options.resolvedReferenceImagesOrdered)) {
    return options.resolvedReferenceImagesOrdered.filter(Boolean);
  }
  return LEGACY_REFERENCE_KEYS
    .map(key => options[key])
    .filter(Boolean);
}
