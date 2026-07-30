import { describe, expect, it } from 'vitest';
import { getMissingTemplateReferenceRequirements } from './templateReferenceRequirements';

describe('getMissingTemplateReferenceRequirements', () => {
  it('treats face and character references as one identity requirement', () => {
    const required = [
      'face_reference',
      'character_reference',
      'outfit_front',
      'outfit_back'
    ] as const;

    expect(getMissingTemplateReferenceRequirements([...required], {})).toEqual([
      'identity_reference',
      'outfit_front',
      'outfit_back'
    ]);
    expect(getMissingTemplateReferenceRequirements([...required], {
      character_reference: '/outputs/character.png',
      outfit_front: '/outputs/front.png',
      outfit_back: '/outputs/back.png'
    })).toEqual([]);
  });
});
