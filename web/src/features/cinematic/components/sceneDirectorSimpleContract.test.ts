import { describe, expect, it } from 'vitest';
import type { CinematicScene } from '../schemas/cinematicSchemas';
import { completeSimpleSceneContract, isSimpleSceneReady } from './sceneDirectorSimpleContract';

describe('Scene Director Simple contract', () => {
  it('fills missing Storyboard authority from the authored Simple essentials', () => {
    const scene = fixture();
    expect(isSimpleSceneReady(scene)).toBe(true);

    const completed = completeSimpleSceneContract(scene);
    expect(completed.purpose).toBe('Nara turns the CLOSED sign and chooses to reopen.');
    expect(completed.entryState).toBe('Nara holds the CLOSED sign beside the dark counter.');
    expect(completed.emotionalStart).toBe('quiet resolve');
    expect(completed.shots[0]).toEqual(expect.objectContaining({
      purpose: 'Nara holds the CLOSED sign beside the dark counter.',
      performanceCue: 'quiet resolve',
      continuityEntry: 'Nara holds the CLOSED sign beside the dark counter.',
      continuityExit: 'Warm counter light fills the cafe.',
      transitionToNext: 'cut',
      castAssignmentIds: ['cast_nara'],
      wardrobeLookIds: ['look_cafe']
    }));
  });

  it('never overwrites populated AI or expert Advanced authority', () => {
    const scene = fixture();
    scene.purpose = 'AI dramatic purpose';
    scene.entryState = 'AI entry anchor';
    scene.blocking = 'AI blocking';
    scene.lighting = 'AI rainy blue-hour lighting';
    scene.audioIntent = 'AI rain ambience';
    scene.shots[0] = {
      ...scene.shots[0]!,
      purpose: 'AI shot purpose',
      performanceCue: 'AI breath cue',
      continuityEntry: 'AI continuity entry',
      continuityExit: 'AI continuity exit',
      transitionToNext: 'AI motivated cut',
      dialogueCues: [{
        speakerCastAssignmentId: 'cast_nara', offscreenVoiceRole: '', text: 'Tomorrow, we reopen.',
        delivery: 'quietly', startOffsetMs: 1000, estimatedDurationMs: 1800, speakerVisible: true
      }]
    };

    const completed = completeSimpleSceneContract(scene);
    expect(completed).toEqual(expect.objectContaining({
      purpose: 'AI dramatic purpose',
      entryState: 'AI entry anchor',
      blocking: 'AI blocking',
      lighting: 'AI rainy blue-hour lighting',
      audioIntent: 'AI rain ambience'
    }));
    expect(completed.shots[0]).toEqual(expect.objectContaining({
      purpose: 'AI shot purpose',
      performanceCue: 'AI breath cue',
      continuityEntry: 'AI continuity entry',
      continuityExit: 'AI continuity exit',
      transitionToNext: 'AI motivated cut'
    }));
    expect(completed.shots[0]?.dialogueCues?.[0]?.text).toBe('Tomorrow, we reopen.');
  });

  it('keeps Simple save unavailable until every visible essential is present', () => {
    const scene = fixture();
    scene.shots[0] = { ...scene.shots[0]!, visibleMoment: '' };
    expect(isSimpleSceneReady(scene)).toBe(false);
  });
});

function fixture(): CinematicScene {
  return {
    id: 'scene_cafe', version: 1, orderKey: 1, beatId: 'beat_choice',
    title: 'The light returns', purpose: '',
    storyChange: 'Nara turns the CLOSED sign and chooses to reopen.',
    entryState: '', exitState: 'Warm counter light fills the cafe.',
    objective: '', pressure: '', location: 'Family cafe', time: 'Rainy blue hour',
    emotionalStart: '', emotionalEnd: 'quiet resolve', transitionIntent: '',
    castAssignmentIds: ['cast_nara'], wardrobeLookIds: ['look_cafe'],
    blocking: '', lighting: '', performance: '', audioIntent: '',
    propContinuity: '', screenDirection: '', continuityNotes: [],
    shots: [{
      id: 'shot_sign', version: 1, orderKey: 1, title: 'Turn the sign', purpose: '',
      visibleMoment: 'Nara holds the CLOSED sign beside the dark counter.',
      subjectAction: 'The sign turns toward OPEN.', emotionalTarget: 'quiet resolve',
      performanceCue: '', durationMs: 4000, framing: 'medium shot', cameraAngle: 'eye level',
      cameraMovement: 'locked camera', lensIntent: '', blocking: '', performance: '', gaze: '',
      lighting: '', environment: '', audioIntent: '', prompt: '', continuityEntry: '', continuityExit: '',
      transitionToNext: '', estimatedActionDurationMs: 0, dialogueCues: [], audioCues: [],
      castAssignmentIds: [], wardrobeLookIds: [], continuityNotes: [], storyboardStatus: 'draft'
    }],
    shotOrder: ['shot_sign'], durationMs: 4000
  };
}
