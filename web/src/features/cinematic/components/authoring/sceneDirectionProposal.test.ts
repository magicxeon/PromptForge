import { describe, expect, it } from 'vitest';
import type { CinematicScene, CinematicSceneDirectionProposal } from '../../schemas/cinematicSchemas';
import { applySceneDirectionFieldProposals, recommendedSceneDirectionFields } from './sceneDirectionProposal';

describe('Scene direction field proposal merge', () => {
  it('applies only selected proposed fields and preserves locked or unselected authority', () => {
    const scene = fixture();
    const proposal = {
      fieldProposals: [
        field('scene:scene-1.lighting', 'Cool rainy practical', true),
        { ...field('scene:scene-1.blocking', 'AI blocking', false), outcome: 'locked' as const },
        field('shot:scene-1:shot-1.performanceCue', 'One controlled exhale', false)
      ]
    } as CinematicSceneDirectionProposal;
    const selected = recommendedSceneDirectionFields(proposal);
    const result = applySceneDirectionFieldProposals(scene, proposal.fieldProposals || [], selected);
    expect(result.lighting).toBe('Cool rainy practical');
    expect(result.blocking).toBe('User blocking');
    expect(result.shots[0]?.performanceCue).toBe('User cue');
    expect(scene.lighting).toBe('Original light');
  });
});

function field(fieldKey: string, proposedValue: string, recommended: boolean) {
  return {
    fieldKey, manifestPath: fieldKey.startsWith('shot:') ? 'shot.performanceCue' : `scene.${fieldKey.split('.').at(-1)}`,
    group: 'direction', visibility: 'advanced' as const, localizationKey: 'cinematic.director.lighting',
    currentValue: '', proposedValue, outcome: 'proposed' as const, recommended
  };
}

function fixture(): CinematicScene {
  return {
    id: 'scene-1', version: 1, orderKey: 1, beatId: 'beat-1', title: 'Cafe', purpose: '',
    storyChange: 'She stays.', location: 'Cafe', time: 'Night', emotionalStart: '', emotionalEnd: 'resolved',
    transitionIntent: 'cut', castAssignmentIds: [], wardrobeLookIds: [], blocking: 'User blocking',
    lighting: 'Original light', performance: '', audioIntent: '', continuityNotes: [],
    shots: [{
      id: 'shot-1', version: 1, orderKey: 1, title: 'Choice', purpose: '', durationMs: 4000,
      framing: '', cameraAngle: '', cameraMovement: '', lensIntent: '', blocking: '', performance: '',
      performanceCue: 'User cue', gaze: '', lighting: '', environment: '', audioIntent: '', prompt: '',
      castAssignmentIds: [], wardrobeLookIds: [], continuityNotes: [], storyboardStatus: 'draft'
    }],
    shotOrder: ['shot-1'], durationMs: 4000
  };
}
