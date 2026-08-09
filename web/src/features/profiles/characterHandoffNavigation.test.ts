import { describe, expect, it } from 'vitest';
import {
  createCharacterHandoffNavigationState,
  readCharacterHandoffNavigationState
} from './characterHandoffNavigation';

const handoff = {
  destination: 'scene_builder' as const,
  characterReferenceUrl: '/api/community/character-profiles/charprof_1/image',
  characterType: 'reusable_model',
  outfitBehavior: 'replaceable',
  characterProfileContext: {
    purpose: 'character_usage',
    characterProfileId: 'charprof_1',
    characterProfileVersionId: 'charver_1'
  }
};

describe('Character handoff navigation state', () => {
  it('keeps Character Profile lineage beside the canonical reference', () => {
    const state = createCharacterHandoffNavigationState(handoff);

    expect(readCharacterHandoffNavigationState(state, 'scene_builder')).toEqual(handoff);
    expect(
      readCharacterHandoffNavigationState(state, 'scene_builder')?.characterProfileContext
    ).toMatchObject({
      purpose: 'character_usage',
      characterProfileId: 'charprof_1',
      characterProfileVersionId: 'charver_1'
    });
  });

  it('rejects raw image state without Character Profile lineage', () => {
    expect(readCharacterHandoffNavigationState({
      mpfCharacterHandoff: {
        destination: 'scene_builder',
        characterReferenceUrl: '/outputs/raw-character.jpg'
      }
    }, 'scene_builder')).toBeNull();
  });

  it('rejects incomplete Profile context that cannot activate the identity pack', () => {
    const state = createCharacterHandoffNavigationState({
      ...handoff,
      characterProfileContext: {
        characterProfileId: 'charprof_1',
        characterProfileVersionId: 'charver_1'
      }
    });

    expect(readCharacterHandoffNavigationState(state, 'scene_builder')).toBeNull();
  });
});
