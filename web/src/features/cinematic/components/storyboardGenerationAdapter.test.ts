import { describe, expect, it } from 'vitest';
import type { CinematicProject, CinematicScene } from '../schemas/cinematicSchemas';
import {
  buildStoryboardPrompt,
  previousApprovedStoryboardSource,
  resolveShotEmotionalTarget,
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

  it('compiles Scene, Shot, Character, Look and continuity without provider wording', () => {
    const prompt = buildStoryboardPrompt(project, scene, scene.shots[1]!);
    expect(prompt).toContain('STORYBOARD STILL CONTRACT');
    expect(prompt).toContain('Project intent:');
    expect(prompt).toContain('The last train forces a quiet decision.');
    expect(prompt).toContain('Owning beat:');
    expect(prompt).toContain('Stillness becomes movement');
    expect(prompt).toContain('Platform choice');
    expect(prompt).toContain('Waiting becomes forward motion');
    expect(prompt).toContain('guarded uncertainty toward quiet hope');
    expect(prompt).toContain('Selected Shot emotional target: quiet hope');
    expect(prompt).toContain('Exact visible moment: Mira lowers the phone before turning right');
    expect(prompt).toContain('One primary physical action: She pockets the phone');
    expect(prompt).toContain('Observable performance cue: One exhale and a small shoulder release');
    expect(prompt).toContain('Entry anchor: Phone in right hand');
    expect(prompt).toContain('Exit anchor: Phone in right pocket');
    expect(prompt).toContain('Do not smile unless this Shot explicitly requests it');
    expect(prompt).toContain('Mira remains camera-right of the tracks');
    expect(prompt).toContain('Keep the release restrained and visible in her shoulders');
    expect(prompt).toContain('toward the warm exit');
    expect(prompt).toContain('Mira as Lead');
    expect(prompt).toContain('Arrival coat, navy coat, black phone');
    expect(prompt).toContain('Phone stays in right hand');
    expect(prompt).not.toContain('A distant train horn');
    expect(prompt).not.toContain('Footsteps become louder');
    expect(prompt).not.toContain('I am ready now.');
  });

  it('targets the Scene opening and ending emotion by Shot position', () => {
    expect(resolveShotEmotionalTarget(scene, scene.shots[0]!)).toBe('guarded uncertainty');
    expect(resolveShotEmotionalTarget(scene, scene.shots[1]!)).toBe('quiet hope');
  });

  it('does not nest a previously saved compiled contract', () => {
    const first = buildStoryboardPrompt(project, scene, { ...scene.shots[0]!, prompt: 'Hold the phone close.' });
    const second = buildStoryboardPrompt(project, scene, { ...scene.shots[0]!, prompt: first });
    expect(second.match(/STORYBOARD STILL CONTRACT/g)).toHaveLength(1);
    expect(second).toContain('Shot prompt:\nHold the phone close.');
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
