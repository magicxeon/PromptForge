import { Buffer } from 'node:buffer';

const AGE_RANGE_BY_ATTRIBUTE_ID = Object.freeze({
  'character.004_teen': [15, 19],
  'character.004_e20': [20, 23],
  'character.004': [24, 27],
  'character.004_l20': [28, 29],
  'character.005_30s': [30, 39],
  'character.005': [40, 49],
  'character.005_50s': [50, 59],
  'character.006': [60, null]
});

const STABLE_FIELDS = Object.freeze(['Ethnicity', 'Beauty', 'Face Shape', 'Eyes', 'Eyebrows', 'Nose', 'Lips', 'Tone', 'Freckles', 'Height', 'Body Shape', 'Build', 'Height Impression', 'Model Build', 'Body Silhouette']);
const CORE_FIELDS = ['Age', 'Gender', 'Ethnicity', 'Beauty'];

function normalizeAttribute(value) {
  if (!value || typeof value !== 'object') return null;
  const text = typeof value.value === 'string' ? normalizeCharacterIdentityText(value.value).trim() : '';
  if (!text || text.length > 500 || /https?:|data:|[\r\n]/i.test(text)) return null;
  return { attributeId: typeof (value.attributeId ?? value.id) === 'string' ? (value.attributeId ?? value.id).slice(0, 100) : null, value: text };
}

function metadataRecord(ageRange, presentationGender, attributes) {
  return { schemaVersion: 2, ...(ageRange ? { ageRange } : {}),
    ...(presentationGender ? { presentationGender } : {}), attributes,
    missingFields: CORE_FIELDS.filter(field => field === 'Age' ? !ageRange : field === 'Gender' ? !presentationGender : !attributes[field]) };
}

// The repository must resolve ownership; never derive sensitive identity from pixels.
export async function resolveSourceCharacterIdentity(source, actorId, generationRepository) {
  const own = normalizeCharacterIdentityMetadata(source.characterSheetConfig?.identityMetadata, source);
  const ids = source.characterSheetConfig?.sourceHeadshotIds || source.referencedFaceJobIds || [];
  if (ids.length !== 1 || typeof ids[0] !== 'string') return own;
  const face = await generationRepository.findByIdForOwner(ids[0], actorId);
  if (!face || face.mode !== 'headshot') return own;
  const inherited = deriveCharacterIdentityMetadata(face);
  return normalizeCharacterIdentityMetadata({ ...own,
    ageRange: inherited.ageRange || own.ageRange,
    presentationGender: inherited.presentationGender || own.presentationGender,
    attributes: { ...own.attributes, ...inherited.attributes } });
}

export function deriveCharacterIdentityMetadata(structuredCharacterSnapshot = {}) {
  const ageSelection = structuredCharacterSnapshot?.selections?.Age;
  const ageRange = normalizeCharacterAgeRange(ageSelection);
  const genderSelection = structuredCharacterSnapshot?.selections?.Gender;
  const presentationGender = normalizeCharacterPresentationGender(genderSelection);
  const attributes = Object.fromEntries(STABLE_FIELDS.map(field => [field, normalizeAttribute(structuredCharacterSnapshot?.selections?.[field])]).filter(([, value]) => value));
  return metadataRecord(ageRange, presentationGender, attributes);
}

export function normalizeCharacterIdentityMetadata(value, structuredCharacterSnapshot = {}) {
  const derived = deriveCharacterIdentityMetadata(structuredCharacterSnapshot);
  const storedAgeRange = normalizeStoredAgeRange(value?.ageRange);
  const storedPresentationGender = normalizeStoredPresentationGender(value?.presentationGender);
  const attributes = { ...derived.attributes };
  for (const field of STABLE_FIELDS) {
    const attribute = normalizeAttribute(value?.attributes?.[field]);
    if (attribute) attributes[field] = attribute;
  }
  return metadataRecord(storedAgeRange || derived.ageRange, storedPresentationGender || derived.presentationGender, attributes);
}

export function applyCharacterIdentity(prompt, context = {}) {
  if (!String(prompt || '').trim()) return prompt;
  const usage = context.characterProfileContext;
  const stored = usage?.identityMetadata || usage?.identityPack || (context.mode === 'character-sheet' ? context.characterSheetConfig?.identityMetadata : null);
  if (!stored || (usage && !['character_usage', 'character_casting_export'].includes(usage.purpose))) return prompt;
  const metadata = normalizeCharacterIdentityMetadata(stored);
  if (metadata.missingFields.length === CORE_FIELDS.length && !Object.keys(metadata.attributes).length) return prompt;
  const age = compileCharacterAgeRangeDirective({ purpose: 'character_usage', identityMetadata: metadata });
  const attributes = Object.entries(metadata.attributes).map(([field, item]) => `${field}: ${item.value}.`);
  const directive = [
    'Approved character identity:', age,
    metadata.presentationGender ? `Gender presentation: ${metadata.presentationGender.value}.` : '', ...attributes,
    'Keep the approved reference facial geometry and apparent age. These identity attributes take precedence over conflicting styling directions. Beauty describes the approved appearance, not permission to beautify, change ethnicity, age, or replace the face. Outfit, pose, lighting and scene remain separate from identity.'
  ].filter(Boolean).join(' ');
  return String(prompt).includes(directive) ? prompt : [prompt, directive].filter(Boolean).join('\n\n');
}

export function compileCharacterAgeRangeDirective(characterProfileContext = {}) {
  if (characterProfileContext?.purpose !== 'character_usage') return '';
  const ageRange = normalizeStoredAgeRange(
    characterProfileContext?.identityPack?.ageRange
      || characterProfileContext?.identityMetadata?.ageRange
  );
  if (!ageRange) return '';
  const rangeText = ageRange.maximum === null
    ? `${ageRange.minimum} years and older`
    : `${ageRange.minimum}-${ageRange.maximum} years`;
  const youngerRangeGuard = ageRange.maximum !== null && ageRange.maximum <= 29
    ? 'For this selected younger range, retain the natural facial fullness and smooth source-consistent under-eye, forehead, and cheek surfaces visible in the canonical face; do not invent crow\'s feet, deep under-eye lines, forehead lines, deepened nasolabial folds, hollow cheeks, mature facial gauntness, or gray hair.'
    : '';
  return [
    `Treat the selected apparent age range of ${rangeText} as an immutable part of character identity, not an optional styling suggestion.`,
    'Preserve the facial maturity, skin surface, hair maturity, and age cues visible in the canonical face reference.',
    'Natural skin texture means source-consistent pores and fine detail only; do not add or remove age-related features that are absent or present in the canonical face.',
    youngerRangeGuard,
    'Lighting, expression, lens detail, and personality direction must not make the character appear older or younger than the selected range.'
  ].filter(Boolean).join(' ');
}

export function normalizeCharacterIdentityText(value) {
  const source = typeof value === 'string' ? value : '';
  if (!/(?:\u00c3.|\u00c2.|\u00e0[\u00b8\u00b9])/.test(source)) return source;
  const bytes = [];
  for (const character of source) {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }
    const byte = WINDOWS_1252_BYTE_BY_CHARACTER.get(character);
    if (byte === undefined) return source;
    bytes.push(byte);
  }
  const repaired = Buffer.from(bytes).toString('utf8');
  if (!repaired || repaired.includes('\ufffd')) return source;
  return mojibakeMarkerCount(repaired) < mojibakeMarkerCount(source)
    ? repaired
    : source;
}

function normalizeCharacterAgeRange(selection) {
  if (!selection || typeof selection !== 'object') return null;
  const attributeId = typeof selection.id === 'string' ? selection.id.trim() : '';
  const fallback = AGE_RANGE_BY_ATTRIBUTE_ID[attributeId];
  const parsed = parseRange(`${selection.label || ''} ${selection.value || ''}`);
  const range = parsed || (fallback ? { minimum: fallback[0], maximum: fallback[1] } : null);
  if (!range) return null;
  return {
    attributeId: attributeId || null,
    minimum: range.minimum,
    maximum: range.maximum
  };
}

function normalizeStoredAgeRange(value) {
  if (!value || typeof value !== 'object') return null;
  const minimum = Number(value.minimum);
  const maximum = value.maximum === null ? null : Number(value.maximum);
  if (!Number.isInteger(minimum) || minimum < 0 || minimum > 120) return null;
  if (maximum !== null && (
    !Number.isInteger(maximum)
    || maximum < minimum
    || maximum > 120
  )) return null;
  return {
    attributeId: typeof value.attributeId === 'string' && value.attributeId.trim()
      ? value.attributeId.trim()
      : null,
    minimum,
    maximum
  };
}

function normalizeCharacterPresentationGender(selection) {
  if (!selection || typeof selection !== 'object') return null;
  const evidence = [
    selection.id,
    selection.value,
    selection.label,
    ...(Array.isArray(selection.tags) ? selection.tags : [])
  ].filter(value => typeof value === 'string').join(' ').toLowerCase();
  const value = /\b(female|woman|women)\b/.test(evidence)
    ? 'female'
    : /\b(male|man|men)\b/.test(evidence)
      ? 'male'
      : null;
  if (!value) return null;
  return {
    attributeId: typeof selection.id === 'string' && selection.id.trim()
      ? selection.id.trim()
      : null,
    value
  };
}

function normalizeStoredPresentationGender(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.value !== 'female' && value.value !== 'male') return null;
  return {
    attributeId: typeof value.attributeId === 'string' && value.attributeId.trim()
      ? value.attributeId.trim()
      : null,
    value: value.value
  };
}

function parseRange(value) {
  const normalized = String(value || '').replace(/\u2013|\u2014/g, '-');
  const bounded = normalized.match(/\b(\d{1,3})\s*-\s*(\d{1,3})\b/);
  if (bounded) {
    const minimum = Number(bounded[1]);
    const maximum = Number(bounded[2]);
    if (minimum <= maximum && maximum <= 120) return { minimum, maximum };
  }
  const openEnded = normalized.match(/\b(\d{1,3})\s*\+/);
  if (openEnded && Number(openEnded[1]) <= 120) {
    return { minimum: Number(openEnded[1]), maximum: null };
  }
  return null;
}

const WINDOWS_1252_BYTE_BY_CHARACTER = new Map([
  ['\u20ac', 0x80], ['\u201a', 0x82], ['\u0192', 0x83], ['\u201e', 0x84], ['\u2026', 0x85],
  ['\u2020', 0x86], ['\u2021', 0x87], ['\u02c6', 0x88], ['\u2030', 0x89], ['\u0160', 0x8a],
  ['\u2039', 0x8b], ['\u0152', 0x8c], ['\u017d', 0x8e], ['\u2018', 0x91], ['\u2019', 0x92],
  ['\u201c', 0x93], ['\u201d', 0x94], ['\u2022', 0x95], ['\u2013', 0x96], ['\u2014', 0x97],
  ['\u02dc', 0x98], ['\u2122', 0x99], ['\u0161', 0x9a], ['\u203a', 0x9b], ['\u0153', 0x9c],
  ['\u017e', 0x9e], ['\u0178', 0x9f]
]);

function mojibakeMarkerCount(value) {
  return (String(value).match(/(?:\u00c3.|\u00c2.|\u00e0[\u00b8\u00b9])/g) || []).length;
}
