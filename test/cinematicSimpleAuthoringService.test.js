import assert from 'node:assert/strict';
import test from 'node:test';
import { cinematicSimpleAuthoringService } from '../server/domain/cinematic/CinematicSimpleAuthoringService.js';

test('Simple authoring completes only missing derived Scene and Shot fields', () => {
  const original = fixture();
  const { input, completions } = cinematicSimpleAuthoringService.completeStoryPlanInput(original);
  const scene = input.scenes[0];
  assert.equal(scene.purpose, 'Nara turns the sign and keeps the cafe open.');
  assert.equal(scene.entryState, 'Nara holds the CLOSED sign.');
  assert.equal(scene.shots[0].continuityExit, 'Warm light fills the cafe.');
  assert.deepEqual(scene.shots[0].castAssignmentIds, ['cast_nara']);
  assert.ok(completions.some(item => item.field === 'castAssignmentIds' && item.source === 'inherited'));
  assert.equal(original.scenes[0].purpose, '');
});

test('Simple authoring preserves existing AI and expert Advanced fields byte-for-byte', () => {
  const original = fixture();
  Object.assign(original.scenes[0], {
    purpose: 'AI purpose', entryState: 'AI entry', blocking: 'Expert blocking', lighting: 'Blue practical'
  });
  Object.assign(original.scenes[0].shots[0], {
    purpose: 'AI shot purpose', continuityEntry: 'AI continuity', performanceCue: 'Expert cue'
  });
  const { input, completions } = cinematicSimpleAuthoringService.completeStoryPlanInput(original);
  assert.equal(input.scenes[0].purpose, 'AI purpose');
  assert.equal(input.scenes[0].entryState, 'AI entry');
  assert.equal(input.scenes[0].lighting, 'Blue practical');
  assert.equal(input.scenes[0].shots[0].purpose, 'AI shot purpose');
  assert.equal(input.scenes[0].shots[0].continuityEntry, 'AI continuity');
  assert.ok(!completions.some(item => item.entity === 'scene' && item.field === 'purpose'));
});

function fixture() {
  return {
    scenes: [{
      id: 'scene_cafe', title: 'The light returns', purpose: '',
      storyChange: 'Nara turns the sign and keeps the cafe open.', entryState: '',
      exitState: 'Warm light fills the cafe.', emotionalStart: '', emotionalEnd: 'quiet resolve',
      transitionIntent: '', castAssignmentIds: ['cast_nara'], wardrobeLookIds: ['look_cafe'],
      blocking: '', performance: '',
      shots: [{
        id: 'shot_sign', title: 'Turn the sign', purpose: '', durationMs: 4000,
        visibleMoment: 'Nara holds the CLOSED sign.', subjectAction: 'The sign turns toward OPEN.',
        emotionalTarget: 'quiet resolve', performanceCue: '', continuityEntry: '', continuityExit: '',
        transitionToNext: '', estimatedActionDurationMs: 0, castAssignmentIds: [], wardrobeLookIds: []
      }]
    }]
  };
}
