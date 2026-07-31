import { describe, expect, it } from 'vitest';
import type {
  AttributeGroup,
  AttributeSelection
} from './attributes/attributeModel';
import {
  filterStudioReferences,
  filterStudioSelections,
  randomizeStudioSelections,
  visibleStudioGroups
} from './studioModePolicy';

const groups = [
  group('Character'),
  group('Face'),
  group('Hair'),
  group('Skin'),
  group('Body'),
  group('Clothing'),
  group('Pose'),
  group('Environment'),
  group('Lighting'),
  group('Camera'),
  group('Quality'),
  group('NSFW')
];

describe('studioModePolicy', () => {
  it('keeps every compatible category visible without stage filtering', () => {
    expect(visibleStudioGroups(groups, 'character-sheet', 'styled_character')
      .map(item => item.group)).toEqual([
        'Character',
        'Face',
        'Hair',
        'Skin',
        'Body',
        'Clothing',
        'Camera',
        'Quality'
      ]);
  });

  it('does not expose Character Sheet controls overridden by its fixed casting contract', () => {
    expect(visibleStudioGroups(groups, 'character-sheet', 'styled_character')
      .map(item => item.group)).not.toEqual(expect.arrayContaining(['Pose', 'Lighting']));
  });

  it('strips clothing from reusable Character Sheet state and payload input', () => {
    const selections = {
      Face: selection('Face'),
      Body: selection('Body'),
      Outfit: selection('Clothing')
    };
    expect(Object.keys(filterStudioSelections(
      selections,
      'character-sheet',
      'reusable_model'
    ))).toEqual(['Face', 'Body']);
  });

  it('does not leak Character Sheet selections into Face Creation', () => {
    const selections = {
      Face: selection('Face'),
      Body: selection('Body'),
      Outfit: selection('Clothing')
    };
    expect(Object.keys(filterStudioSelections(
      selections,
      'headshot',
      'styled_character'
    ))).toEqual(['Face']);
  });

  it('retains editable appearance and body attributes for a Scene without a Character Reference', () => {
    const selections = {
      Hair: selection('Hair'),
      Tone: selection('Skin'),
      Build: selection('Body'),
      Outfit: selection('Clothing')
    };

    expect(Object.keys(filterStudioSelections(
      selections,
      'scene',
      'styled_character'
    ))).toEqual(['Hair', 'Tone', 'Build', 'Outfit']);
  });

  it('lets a Character Reference own appearance/body while respecting outfit behavior', () => {
    const selections = {
      Character: selection('Character'),
      Hair: selection('Hair'),
      Tone: selection('Skin'),
      Build: selection('Body'),
      Outfit: selection('Clothing'),
      Expression: selection('Face')
    };
    selections.Expression.category = 'expression';

    expect(Object.keys(filterStudioSelections(
      selections,
      'scene',
      'reusable_model',
      { character_reference: '/outputs/character.png' },
      'replaceable'
    ))).toEqual(['Outfit', 'Expression']);

    expect(Object.keys(filterStudioSelections(
      selections,
      'scene',
      'styled_character',
      { character_reference: '/outputs/character.png' },
      'preserve'
    ))).toEqual(['Expression']);
  });

  it('preserves locked fields while randomizing unlocked fields', () => {
    const lockedSelection = selection('Face');
    const result = randomizeStudioSelections(
      [
        groupWithField('Face', 'Face Shape'),
        groupWithField('Hair', 'Hair Style')
      ],
      new Set(['Face Shape']),
      { 'Face Shape': lockedSelection }
    );

    expect(result['Face Shape']).toEqual(lockedSelection);
    expect(result['Hair Style']?.group).toBe('Hair');
  });

  it('preserves but does not randomize fields controlled by a reference', () => {
    const faceShape = selection('Face');
    const result = randomizeStudioSelections(
      [
        groupWithField('Face', 'Face Shape'),
        groupWithField('Face', 'Expression')
      ],
      new Set(),
      { 'Face Shape': faceShape },
      { face_reference: '/outputs/face.png' }
    );

    expect(result['Face Shape']).toEqual(faceShape);
    expect(result.Expression?.group).toBe('Face');
  });
});

describe('Studio reference mode policy', () => {
  const references = {
    face_reference: '/outputs/face.png',
    character_reference: '/outputs/character.png',
    style_reference: '/outputs/style.png',
    pose_reference: '/outputs/pose.png',
    outfit_front: '/outputs/front.png',
    outfit_back: '/outputs/back.png'
  };

  it('keeps only identity input for Face Creation and reusable casting', () => {
    expect(filterStudioReferences(references, 'headshot', 'reusable_model'))
      .toEqual({ face_reference: '/outputs/face.png' });
    expect(filterStudioReferences(references, 'character-sheet', 'reusable_model'))
      .toEqual({ face_reference: '/outputs/face.png' });
  });

  it('allows identity and outfit inputs for a Styled Character sheet', () => {
    expect(filterStudioReferences(references, 'character-sheet', 'styled_character'))
      .toEqual({
        face_reference: '/outputs/face.png',
        outfit_front: '/outputs/front.png',
        outfit_back: '/outputs/back.png'
      });
  });
});

function group(name: string): AttributeGroup {
  return { group: name, fields: [] };
}

function groupWithField(name: string, fieldName: string): AttributeGroup {
  return {
    group: name,
    fields: [{
      name: fieldName,
      control: 'select',
      group: name,
      options: [{
        id: `${name}.option`,
        category: name.toLowerCase(),
        subcategory: fieldName,
        label: name,
        group: name,
        prompt: name,
        tags: []
      }]
    }]
  };
}

function selection(groupName: string): AttributeSelection {
  return {
    id: `${groupName}.option`,
    value: groupName,
    label: groupName,
    isCustom: false,
    group: groupName,
    category: groupName.toLowerCase(),
    tags: [],
    gptPositiveWords: []
  };
}
