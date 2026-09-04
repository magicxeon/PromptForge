import { describe, expect, it } from 'vitest';
import type { CinematicProject, CinematicScene } from '../schemas/cinematicSchemas';
import {
  previousApprovedStoryboardSource,
  readStoryboardAuthorDirection,
  resolveStoryboardShotCast,
  resolveStoryboardShotLooks
} from './storyboardGenerationAdapter';

describe('storyboard generation adapter', () => {
  const scene = {
    id: 'scene_1', beatId: 'beat_choice', title: 'Platform choice', purpose: 'Mira chooses to leave',
    storyChange: 'Waiting becomes forward motion', emotionalStart: 'guarded uncertainty', emotionalEnd: 'quiet hope',
    transitionIntent: 'match the warm exit direction', blocking: 'Mira remains camera-right of the tracks',
    performance: 'Keep the release restrained and visible in her shoulders', audioIntent: 'A distant train horn',
    location: 'Urban platform', time: 'Blue hour', lighting: 'Cool practical light',
    castAssignmentIds: ['cast_mira'], wardrobeLookIds: ['look_arrival'], continuityNotes: ['Phone stays in right hand'],
    shotOrder: ['shot_1', 'shot_2'],
    shots: [
      {
        id: 'shot_1', title: 'Wait', purpose: 'Hold uncertainty', prompt: '',
        framing: 'medium', cameraAngle: 'eye level', cameraMovement: 'locked', lensIntent: '50mm',
        blocking: 'Mira stands beneath the clock', performance: 'restrained breath', lighting: '', environment: '',
        castAssignmentIds: ['cast_mira'], wardrobeLookIds: ['look_arrival'], continuityNotes: [],
        approvedStoryboardSource: { imageUrl: '/outputs/shot_1.webp', sourceFingerprint: 'fp_1' }
      },
      {
        id: 'shot_2', title: 'Leave', purpose: 'Reveal the decision', prompt: '',
        visibleMoment: 'Mira lowers the phone before turning right', subjectAction: 'She pockets the phone',
        emotionalTarget: 'quiet resolve', performanceCue: 'One exhale and a small shoulder release',
        continuityEntry: 'Phone in right hand', continuityExit: 'Phone in right pocket', transitionToNext: 'cut on first step',
        framing: 'wide', cameraAngle: 'eye level', cameraMovement: 'slow follow', lensIntent: '35mm',
        blocking: 'Mira walks toward the exit', performance: 'quiet release', gaze: 'toward the warm exit', lighting: '', environment: '',
        audioIntent: 'Footsteps become louder', dialogueCues: [{ text: 'I am ready now.' }],
        audioCues: [{ description: 'A distant train horn' }],
        castAssignmentIds: ['cast_mira'], wardrobeLookIds: ['look_arrival'], continuityNotes: []
      }
    ]
  } as unknown as CinematicScene;
  const project = {
    id: 'project_1',
    setup: {
      storyBrief: 'A woman rejects the last train and chooses a new path.',
      creativeDirection: 'Photorealistic blue-hour restraint.', genre: 'drama', audienceFeeling: 'uplifted'
    },
    activeStoryPlanVersionId: 'plan_1',
    storyPlanVersions: [{
      id: 'plan_1', sceneIds: ['scene_1'], objective: 'Make the choice visible',
      logline: 'The last train forces a quiet decision.', emotionalArc: 'uncertain to hopeful',
      beats: [{
        id: 'beat_choice', title: 'Choice', purpose: 'Force a decision',
        storyChange: 'Stillness becomes movement', emotionalStart: 'afraid', emotionalEnd: 'resolved'
      }]
    }],
    castAssignments: [{
      id: 'cast_mira', active: true, displayName: 'Mira', storyRole: 'Lead',
      objective: 'Leave the platform', emotionalBaseline: 'guarded', performanceDirection: 'Minimal gestures',
      looks: [{ id: 'look_arrival', name: 'Arrival coat', garmentSummary: 'navy coat', accessorySummary: 'black phone' }]
    }]
  } as unknown as CinematicProject;

  it('reads only the author direction from persisted legacy and server contracts', () => {
    expect(readStoryboardAuthorDirection('Hold the phone close.')).toBe('Hold the phone close.');
    expect(readStoryboardAuthorDirection(
      'STORYBOARD STILL CONTRACT\n\nShot prompt:\nHold the phone close.\n\nProject intent:\nFuture state.'
    )).toBe('Hold the phone close.');
    expect(readStoryboardAuthorDirection(
      'STORYBOARD KEYFRAME CONTRACT cinematic-storyboard-keyframe-v1\n\nAUTHOR DIRECTION:\nKeep the exit frame-right.'
    )).toBe('Keep the exit frame-right.');
  });

  it('uses only owned Cast and Look IDs selected by the Shot', () => {
    const cast = resolveStoryboardShotCast(project, scene, scene.shots[0]!);
    expect(cast.map(item => item.id)).toEqual(['cast_mira']);
    expect(resolveStoryboardShotLooks(cast, scene, scene.shots[0]!).map(item => item.id)).toEqual(['look_arrival']);
  });

  it('has no prior source for the first Shot and only the previous approved source for the second', () => {
    expect(previousApprovedStoryboardSource(scene, 'shot_1')).toBeNull();
    expect(previousApprovedStoryboardSource(scene, 'shot_2')?.sourceFingerprint).toBe('fp_1');
  });
});
