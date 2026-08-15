import { describe, expect, it } from 'vitest';
import { resolveCharacterPresentationGender } from './characterPresentationModel';

describe('Scene Character presentation metadata', () => {
  it('reads Gender from an approved Character handoff snapshot', () => {
    expect(resolveCharacterPresentationGender({
      compatibleAttributeSnapshot: {
        Gender: {
          id: 'character.001',
          value: 'female woman',
          label: 'Female',
          group: 'Character',
          tags: ['female']
        }
      }
    })).toMatchObject({ value: 'female woman', group: 'Character' });
  });

  it('reads Gender from a Character Sheet History item', () => {
    expect(resolveCharacterPresentationGender({
      selections: {
        Gender: {
          id: 'character.002',
          value: 'male man',
          label: 'Male',
          group: 'Character'
        }
      }
    })).toMatchObject({ value: 'male man', group: 'Character' });
  });

  it('does not guess presentation for an untyped image reference', () => {
    expect(resolveCharacterPresentationGender({ imageUrl: '/outputs/unknown.jpg' }))
      .toBeUndefined();
  });
});
