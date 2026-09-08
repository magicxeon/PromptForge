import { expect, it } from 'vitest';
import { characterHandoffSchema, characterSummarySchema } from '../profiles/schemas/profileSchemas';
import { isSceneCharacterEligible, isSceneCharacterHandoffValid, isTemplateCharacterEligible, isTemplateCharacterHandoffValid } from './templateCharacterPolicy';

const character = characterSummarySchema.parse({ id: 'nara', displayName: 'Nara', handoffAvailable: true, characterProfileVersionId: 'v1', destinationCapabilities: ['scene_builder'] });
const handoff = characterHandoffSchema.parse({ handoffVersion: 1, destination: 'scene_builder', characterProfileId: 'nara', characterProfileVersionId: 'v1', characterReferenceAssetId: 'asset', characterReferenceUrl: '/authorized', displayName: 'Nara', characterType: 'reusable_model', outfitBehavior: 'replaceable', characterProfileContext: { purpose: 'character_usage', characterProfileId: 'nara', characterProfileVersionId: 'v1' } });
it('allows approved reusable Scene identities, not fixed wardrobe/unavailable characters', () => {
  expect(isTemplateCharacterEligible(character)).toBe(true);
  expect(isTemplateCharacterEligible({ ...character, characterType: 'styled_character', outfitBehavior: 'preserve' })).toBe(false);
  expect(isTemplateCharacterEligible({ ...character, handoffAvailable: false })).toBe(false);
  expect(isTemplateCharacterEligible({ ...character, destinationCapabilities: [] })).toBe(false);
});
it('normal Scene accepts styled outfits but rejects a stale authorized version', () => {
  const styled = { ...character, characterType: 'styled_character' as const, outfitBehavior: 'preserve' };
  expect(isSceneCharacterEligible(styled)).toBe(true);
  expect(isSceneCharacterHandoffValid(styled, { ...handoff, outfitBehavior: 'preserve' })).toBe(true);
  expect(isSceneCharacterHandoffValid(character, { ...handoff, characterProfileContext: { purpose: 'character_usage', characterProfileVersionId: 'v2' } })).toBe(false);
});
it('requires matching authorized identity, destination and replaceable wardrobe response', () => {
  expect(isTemplateCharacterHandoffValid(character, handoff)).toBe(true);
  expect(isTemplateCharacterHandoffValid(character, { ...handoff, characterProfileId: 'other' })).toBe(false);
  expect(isTemplateCharacterHandoffValid(character, { ...handoff, outfitBehavior: 'preserve' })).toBe(false);
  expect(isTemplateCharacterHandoffValid(character, { ...handoff, characterProfileContext: {} })).toBe(false);
});
