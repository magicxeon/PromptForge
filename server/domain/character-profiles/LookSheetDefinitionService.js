import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { normalizeCharacterIdentityMetadata, applyCharacterIdentity } from './characterIdentityMetadata.js';

const recipe = JSON.parse(readFileSync(new URL('../../config/prompt-recipes/character-looks/document-sheet.v2.json', import.meta.url), 'utf8'));
const recipeFingerprint = hash(recipe);
const bounds = { name: 80, appearance: 2000, situation: 800, outfit: 800, personality: 240 };

export function getLookSheetPreset() { return structuredClone(recipe); }

function layoutForRatio(ratio) {
  const [width, height] = String(ratio).split(':').map(Number);
  if (ratio === 'auto') return 'portrait';
  return width > height ? 'landscape' : width < height ? 'portrait' : 'square';
}

export function normalizeLookSheetDefinition(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Buffer.byteLength(JSON.stringify(value), 'utf8') > 24 * 1024
    || Object.keys(value).some(key => !['schemaVersion', 'ageYears', ...Object.keys(bounds)].includes(key))
    || value.schemaVersion !== 1) throw invalid();
  const fields = {};
  for (const [key, max] of Object.entries(bounds)) {
    const input = value[key] ?? recipe.defaults[key] ?? '';
    if (typeof input !== 'string') throw invalid();
    const text = input.trim();
    if ([...text].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw invalid();
    fields[key] = text || recipe.defaults[key] || '';
    if (!fields[key]) throw invalid();
  }
  const ageYears = value.ageYears ?? null;
  if (ageYears !== null && (!Number.isInteger(ageYears) || ageYears < 18 || ageYears > 120)) throw invalid('look_sheet_adult_required');
  return { schemaVersion: 1, ...fields, ageYears };
}

// Call only after canonical Character/reference authorization has completed.
export function acceptLookSheetSnapshot(context) {
  if (!context.lookSheetDefinition) return null;
  const fields = normalizeLookSheetDefinition(context.lookSheetDefinition);
  const character = context.characterProfileContext;
  const identity = character ? normalizeCharacterIdentityMetadata(character.identityMetadata || character.identityPack) : null;
  const range = identity?.ageRange || null;
  if (character && (character.purpose !== 'character_usage' || !range)) {
    throw invalid('look_sheet_identity_incomplete');
  }
  if (range && range.minimum < 18) throw invalid('look_sheet_adult_required');
  if (!character && fields.ageYears === null) throw invalid('look_sheet_age_required');
  if (range && fields.ageYears !== null
    && (fields.ageYears < range.minimum || (range.maximum !== null && fields.ageYears > range.maximum))) {
    throw invalid('look_sheet_age_conflict');
  }
  const preserveOutfit = character?.outfitBehavior === 'preserve';
  if (preserveOutfit && (context.imageReferences?.outfitReference || fields.outfit !== recipe.defaults.outfit)) {
    throw invalid('look_sheet_outfit_locked');
  }
  const data = {
    schemaVersion: 1, presetId: recipe.id, presetVersion: recipe.version,
    strategy: recipe.strategy, recipeFingerprint, fields,
    ageRange: range, identityFingerprint: identity ? hash(identity) : null,
    aspectRatio: context.aspectRatio || '1:1',
    layoutId: `editorial-v${recipe.version}-${layoutForRatio(context.aspectRatio || '1:1')}`,
    textMode: recipe.textMode,
    source: character ? { characterProfileId: character.characterProfileId,
      characterProfileVersionId: character.characterProfileVersionId } : null,
    preserveOutfit, entrySurface: context.generationSurface,
    referenceFingerprint: context.referenceProcessing?.planFingerprint || null
  };
  return { ...data, fingerprint: hash(data) };
}

export function compileLookSheetPrompt(context) {
  if (context.lookSheetEnhancedPrompt) return context.lookSheetEnhancedPrompt;
  const definition = normalizeLookSheetDefinition(context.lookSheetDefinition);
  const snapshot = context.lookSheetSnapshot;
  const age = definition.ageYears !== null ? `${definition.ageYears} years`
    : snapshot?.ageRange ? `${snapshot.ageRange.minimum}-${snapshot.ageRange.maximum ?? 'older'} years` : 'the approved character age';
  const ratio = context.aspectRatio || '1:1';
  const layout = layoutForRatio(ratio);
  return applyCharacterIdentity([recipe.direction,
    `Compose the single document for a ${ratio} ${layout} canvas. Follow this orientation's fixed section map without cropping any full-body view or stretching the character.`,
    recipe.layouts[layout],
    `Character descriptive fields: ${JSON.stringify({
    name: definition.name, age, appearance: definition.appearance,
    roleAndSituation: definition.situation,
    outfit: snapshot?.preserveOutfit ? 'Preserve the approved reference outfit without replacement.' : definition.outfit,
    personality: definition.personality
  })}.`, 'Age and approved identity take precedence over all styling and situation fields.'].join('\n\n'), context);
}

function hash(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function invalid(code = 'look_sheet_definition_invalid') {
  return Object.assign(new Error('Check the Look Sheet definition and approved character identity.'), { statusCode: 400, code });
}
