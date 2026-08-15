import { RepositoryContractError } from '../../repositories/repositoryContracts.js';

export const CHARACTER_TYPE = Object.freeze({
  REUSABLE_MODEL: 'reusable_model',
  STYLED_CHARACTER: 'styled_character'
});

const CAPABILITIES = Object.freeze({
  [CHARACTER_TYPE.REUSABLE_MODEL]: Object.freeze({
    destinations: Object.freeze(['fashion_blueprint', 'scene_builder']),
    outfitBehavior: 'replaceable',
    requiresCastingExport: true
  }),
  [CHARACTER_TYPE.STYLED_CHARACTER]: Object.freeze({
    destinations: Object.freeze(['scene_builder']),
    outfitBehavior: 'preserve',
    requiresCastingExport: false
  })
});

export function normalizeCharacterType(value) {
  return value === CHARACTER_TYPE.STYLED_CHARACTER
    ? CHARACTER_TYPE.STYLED_CHARACTER
    : CHARACTER_TYPE.REUSABLE_MODEL;
}

export function getCharacterTypeCapabilities(value) {
  return CAPABILITIES[normalizeCharacterType(value)];
}

export function normalizeIntendedUsesForCharacterType(value, characterType) {
  const uses = Array.isArray(value) ? [...new Set(value)] : [];
  return normalizeCharacterType(characterType) === CHARACTER_TYPE.STYLED_CHARACTER
    ? uses.filter(use => use !== 'fashion')
    : uses;
}

export function assertCharacterDestination(characterType, destination) {
  const normalizedType = normalizeCharacterType(characterType);
  const capabilities = getCharacterTypeCapabilities(normalizedType);
  if (!capabilities.destinations.includes(destination)) {
    throw new RepositoryContractError(
      'character_destination_incompatible',
      'This outfit-bound Character can be used in Scene Builder only. Create a Reusable Model casting export before using it in Fashion Blueprint.',
      409
    );
  }
  return capabilities;
}

export function resolveCanonicalCharacterAsset(version = {}, characterType) {
  return normalizeCharacterType(characterType) === CHARACTER_TYPE.STYLED_CHARACTER
    ? version.canonicalCharacterSheetAssetId || null
    : version.canonicalCastingExportAssetId || null;
}
