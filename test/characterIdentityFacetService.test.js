import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCharacterIdentityFacets } from '../server/domain/character-profiles/CharacterIdentityFacetService.js';

test('Character identity facets expose bounded picker metadata from the pinned version', () => {
  assert.deepEqual(buildCharacterIdentityFacets({
    identityMetadata: {
      presentationGender: { value: 'Female' },
      ageRange: { minimum: 21, maximum: 23 }
    },
    structuredCharacterSnapshot: {
      selections: {
        Age: { label: '21-23 years' },
        Ethnicity: { label: 'East Asian' }
      }
    }
  }), {
    presentationGender: 'female',
    ageRange: { minimum: 21, maximum: 23, label: '21-23 years' },
    ethnicity: 'east asian'
  });
});

test('Character identity facets do not invent missing sensitive metadata', () => {
  assert.deepEqual(buildCharacterIdentityFacets({}), {
    presentationGender: null,
    ageRange: null,
    ethnicity: null
  });
});
