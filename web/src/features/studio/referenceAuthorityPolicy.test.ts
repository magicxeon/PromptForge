import { describe, expect, it } from 'vitest';
import type {
  AttributeGroup,
  AttributeSelection
} from './attributes/attributeModel';
import {
  filterReferenceOwnedSelections,
  referenceControlledFieldNames,
  resolveFieldReferenceAuthority,
  sceneDirectionGroups
} from './referenceAuthorityPolicy';

describe('referenceAuthorityPolicy', () => {
  it('lets Expression direct performance while Face Reference owns facial identity', () => {
    const references = { face_reference: '/outputs/face.png' };

    expect(resolveFieldReferenceAuthority(field('Face', 'Face Shape'), references))
      .toBe('face');
    expect(resolveFieldReferenceAuthority(field('Face', 'Smile'), references))
      .toBe('face');
    expect(resolveFieldReferenceAuthority(field('Face', 'Expression'), references))
      .toBeNull();
  });

  it('lets an explicit Outfit Reference own clothing over Character Reference', () => {
    const references = {
      character_reference: '/outputs/character.png',
      outfit_front: '/outputs/outfit.png'
    };

    expect(resolveFieldReferenceAuthority(field('Character', 'Gender'), references))
      .toBe('character');
    expect(resolveFieldReferenceAuthority(field('Clothing', 'Outfit Base'), references))
      .toBe('outfit');
    expect(resolveFieldReferenceAuthority(field('Clothing', 'Accessories'), references))
      .toBe('outfit');
    expect(resolveFieldReferenceAuthority(field('Face', 'Expression'), references))
      .toBeNull();
  });

  it('keeps clothing editable for a reusable Character Reference', () => {
    const references = { character_reference: '/outputs/reusable-character.png' };

    expect(resolveFieldReferenceAuthority(
      field('Character', 'Gender'),
      references,
      'replaceable'
    )).toBe('character');
    expect(resolveFieldReferenceAuthority(
      field('Clothing', 'Outfit Base'),
      references,
      'replaceable'
    )).toBeNull();
    expect(resolveFieldReferenceAuthority(
      field('Accessories', 'Accessories'),
      references,
      'replaceable'
    )).toBeNull();
  });

  it('keeps clothing owned by a styled Character Reference', () => {
    const references = { character_reference: '/outputs/styled-character.png' };

    expect(resolveFieldReferenceAuthority(
      field('Clothing', 'Outfit Base'),
      references,
      'preserve'
    )).toBe('character');
  });

  it('removes reference-owned selections from the effective generation input', () => {
    const selections = {
      'Face Shape': selection('Face'),
      Expression: selection('Face', 'expression'),
      'Outfit Base': selection('Clothing'),
      'Pose Intent': selection('Pose')
    };

    expect(Object.keys(filterReferenceOwnedSelections(selections, {
      character_reference: '/outputs/character.png'
    }))).toEqual(['Expression', 'Pose Intent']);
  });

  it('resolves disabled fields and exposes only Expression from Face in Scene', () => {
    const groups = [
      group('Face', ['Face Shape', 'Expression']),
      group('Clothing', ['Outfit Base']),
      group('Pose', ['Pose Intent'])
    ];

    expect([...referenceControlledFieldNames(groups, {
      face_reference: '/outputs/face.png',
      outfit_front: '/outputs/outfit.png'
    })]).toEqual(['Face Shape', 'Outfit Base']);
    expect(sceneDirectionGroups(groups).flatMap(item => item.fields.map(item => item.name)))
      .toEqual(['Expression', 'Outfit Base', 'Pose Intent']);
  });

  it('uses the server authority projection instead of the client fallback matrix', () => {
    const projection = {
      schemaVersion: 1,
      policyVersion: 'rpp-test',
      planFingerprint: 'fingerprint',
      controlledGroups: [{
        group: 'Lighting',
        role: 'style_reference',
        editableFields: [],
        suppressedFields: ['Lighting Setup']
      }],
      suppressedSelections: [],
      references: [],
      warnings: []
    };

    expect(resolveFieldReferenceAuthority(
      field('Lighting', 'Lighting Setup'),
      {},
      'replaceable',
      projection
    )).toBe('style');
  });
});

function field(group: string, name: string) {
  return { group, name };
}

function group(name: string, fieldNames: string[]): AttributeGroup {
  return {
    group: name,
    fields: fieldNames.map(fieldName => ({
      name: fieldName,
      control: 'select',
      group: name,
      options: []
    }))
  };
}

function selection(group: string, category = group.toLowerCase()): AttributeSelection {
  return {
    id: `${group}.${category}`,
    value: `${group} prompt`,
    label: group,
    isCustom: false,
    group,
    category,
    tags: [],
    gptPositiveWords: []
  };
}
