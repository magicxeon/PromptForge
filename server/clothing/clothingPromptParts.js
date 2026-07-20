/**
 * ModelPromptForge - Server-side Clothing Prompt Helper
 */

const CANONICAL_FALLBACK = 'wearing modest neutral character reference clothing, an opaque light gray fitted top and matching mid-thigh shorts, non-revealing, clean and practical for character sheet visibility';
const CANONICAL_OUTFIT_BASE_TAGS = new Set([
  'outfit-base-unisex',
  'outfit-base-female',
  'outfit-base-male'
]);

export function getClothingSourceOwnership(selections, referenceState, mode) {
  if (mode !== 'character-sheet') {
    return 'standard';
  }

  if (hasOutfitReference(referenceState)) {
    return 'upload';
  }
  
  const hasModularSelection = selections && (
    (selections['Outfit Base'] && selections['Outfit Base'].id) ||
    (selections['Pattern'] && selections['Pattern'].id) ||
    (selections['Material'] && selections['Material'].id) ||
    (selections['Material / Surface'] && selections['Material / Surface'].id) ||
    (selections['Primary Color'] && selections['Primary Color'].id) ||
    (selections['Secondary Color'] && selections['Secondary Color'].id)
  );

  if (hasModularSelection) {
    return 'modular';
  }

  return 'fallback';
}

export function compileClothingPromptParts(selections, referenceState, mode, referenceOverrides = null) {
  const ownership = getClothingSourceOwnership(selections, referenceState, mode);

  if (ownership === 'standard') {
    return '';
  }

  // Priority 1: Upload Reference
  if (ownership === 'upload') {
    const parts = [hasBackOutfitReference(referenceState)
      ? 'matching the clothing outfit from the uploaded front and back outfit references, preserving garment silhouette, colors, pattern, material appearance, construction, and visible details across all character sheet views'
      : 'matching the garment silhouette, colors, pattern, material appearance, and visible styling from the uploaded front outfit reference, inferring unseen back details naturally'];
    const overrides = normalizeReferenceOverrides(referenceOverrides);
    if (overrides.enabled) {
      if (overrides.primaryColor && selections?.['Primary Color']?.value) {
        parts.push(`changing the primary garment color to ${selections['Primary Color'].value}`);
      }
      if (overrides.secondaryColor && selections?.['Secondary Color']?.value) {
        parts.push(`changing the secondary garment color to ${selections['Secondary Color'].value}`);
      }
      if (overrides.pattern && selections?.Pattern?.value) {
        parts.push(`applying ${selections.Pattern.value}`);
      }
      const material = selections?.Material || selections?.['Material / Surface'];
      if (overrides.material && material?.value) {
        parts.push(`rendering the garment with ${material.value}`);
      }
      if (parts.length > 1) parts.push('while preserving all other outfit details');
    }
    return cleanupClothingPromptParts(parts);
  }

  // Priority 2: Modular Clothing
  if (ownership === 'modular') {
    const outfitBase = selections['Outfit Base'];
    const pattern = selections['Pattern'];
    const material = selections['Material'] || selections['Material / Surface'];
    const primaryColor = selections['Primary Color'];
    const secondaryColor = selections['Secondary Color'];

    // If Outfit Base is modest_reference or not specified, colors/patterns/materials are ignored for safety
    if (!isCanonicalOutfitBase(outfitBase)) {
      return CANONICAL_FALLBACK;
    }

    const parts = [];

    // 1. Outfit Base
    const baseText = outfitBase.value || '';
    if (baseText) parts.push(baseText);

    // 2. Primary Color
    if (primaryColor && primaryColor.value) {
      parts.push(`in ${primaryColor.value} as the primary garment color`);
    }

    // 3. Secondary Color
    if (secondaryColor && secondaryColor.value) {
      const hasPattern = pattern && pattern.id && pattern.id !== 'outfit.pattern.solid';
      if (hasPattern) {
        parts.push(`with ${secondaryColor.value} secondary color in the pattern`);
      } else {
        parts.push(`with ${secondaryColor.value} trim accents`);
      }
    }

    // 4. Pattern
    if (pattern && pattern.value && pattern.id !== 'outfit.pattern.solid') {
      parts.push(pattern.value);
    }

    // 5. Material
    if (material && material.value) {
      parts.push(material.value);
    }

    return cleanupClothingPromptParts(parts);
  }

  // Priority 3: Default Fallback
  return CANONICAL_FALLBACK;
}

export function cleanupClothingPromptParts(parts) {
  if (!parts || parts.length === 0) return '';
  
  // Deduplicate and clean up double spacing / comma issues
  const cleanParts = parts
    .map(p => String(p).trim())
    .filter(Boolean);

  let prompt = cleanParts.join(', ');

  // Standard cleanups
  prompt = prompt.replace(/,(\s*,)+/g, ',');
  prompt = prompt.replace(/^\s*,\s*/, '');
  prompt = prompt.replace(/\s*,\s*$/, '');
  
  return prompt.trim();
}

export function isCanonicalOutfitBase(outfitBase) {
  if (!outfitBase || outfitBase.id === 'outfit.base.modest_reference') return false;
  if (outfitBase.isCustom === true) return true;
  const tags = outfitBase.tags || [];
  return tags.some(tag => CANONICAL_OUTFIT_BASE_TAGS.has(tag));
}

function hasOutfitReference(referenceState) {
  return Boolean(
    referenceState?.outfitReference ||
    referenceState?.outfitReferenceFront ||
    referenceState?.outfitReferenceImageFront
  );
}

function hasBackOutfitReference(referenceState) {
  return Boolean(
    referenceState?.outfitReferenceBack ||
    referenceState?.outfitReferenceImageBack
  );
}

export function normalizeReferenceOverrides(value) {
  const raw = value && typeof value === 'object' ? value : {};
  return {
    enabled: raw.enabled === true,
    primaryColor: raw.primaryColor === true,
    secondaryColor: raw.secondaryColor === true,
    pattern: raw.pattern === true,
    material: raw.material === true
  };
}
