import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileCharacterAgeRangeDirective,
  deriveCharacterIdentityMetadata,
  normalizeCharacterIdentityMetadata,
  normalizeCharacterIdentityText
} from '../server/domain/character-profiles/characterIdentityMetadata.js';

test('Character identity metadata compacts the selected Age option into a bounded range', () => {
  const metadata = deriveCharacterIdentityMetadata({
    selections: {
      Age: {
        id: 'character.004',
        label: 'Young Adult (24-27)',
        value: 'young adult'
      }
    }
  });

  assert.deepEqual(metadata, {
    schemaVersion: 2, attributes: {}, missingFields: ['Gender', 'Ethnicity', 'Beauty'],
    ageRange: {
      attributeId: 'character.004',
      minimum: 24,
      maximum: 27
    }
  });
  const directive = compileCharacterAgeRangeDirective({
    purpose: 'character_usage',
    identityPack: metadata
  });
  assert.match(directive, /selected apparent age range of 24-27 years/i);
  assert.match(directive, /immutable part of character identity/i);
  assert.match(directive, /source-consistent pores/i);
  assert.match(directive, /crow's feet/i);
  assert.match(directive, /must not make the character appear older or younger/i);
});

test('Character identity metadata derives legacy ranges and rejects malformed stored overrides', () => {
  const metadata = normalizeCharacterIdentityMetadata({
    ageRange: { minimum: 35, maximum: 20 }
  }, {
    selections: {
      Age: {
        id: 'character.006',
        label: 'Senior (60+)',
        value: 'senior'
      }
    }
  });

  assert.deepEqual(metadata.ageRange, {
    attributeId: 'character.006',
    minimum: 60,
    maximum: null
  });
  assert.equal(compileCharacterAgeRangeDirective({ purpose: 'character_usage' }), '');
  assert.equal(compileCharacterAgeRangeDirective({
    purpose: 'character_casting_export',
    identityPack: metadata
  }), '');
});

test('Character identity metadata compacts presentation gender for downstream option policy', () => {
  const metadata = deriveCharacterIdentityMetadata({
    selections: {
      Gender: {
        id: 'character.002',
        label: 'Male',
        value: 'male man',
        tags: ['adult-male']
      }
    }
  });

  assert.deepEqual(metadata.presentationGender, {
    attributeId: 'character.002',
    value: 'male'
  });
  assert.deepEqual(normalizeCharacterIdentityMetadata({
    presentationGender: { attributeId: 'tampered', value: 'unknown' }
  }, {
    selections: {
      Gender: {
        id: 'character.001',
        label: 'Female',
        value: 'female woman'
      }
    }
  }).presentationGender, {
    attributeId: 'character.001',
    value: 'female'
  });
});

test('Character identity text repairs legacy UTF-8 mojibake before provider compilation', () => {
  const original = 'สุขุม ดูดี เนี๊ยบ รักสะอาด';
  const mojibake = Buffer.from(original, 'utf8').toString('latin1');

  assert.equal(normalizeCharacterIdentityText(mojibake), original);
  assert.equal(normalizeCharacterIdentityText('Warm and confident'), 'Warm and confident');
});
