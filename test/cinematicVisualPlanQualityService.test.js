import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicVisualPlanQualityService } from '../server/domain/cinematic/CinematicVisualPlanQualityService.js';

test('visual quality accepts one observable establishing keyframe without mutating the Plan', () => {
  const service = new CinematicVisualPlanQualityService();
  const { project, plan } = fixture();
  const before = structuredClone(plan);

  const result = service.evaluate(project, plan);

  assert.equal(result.status, 'ready');
  assert.deepEqual(result.findings, []);
  assert.deepEqual(plan, before);
});

test('visual quality finds generic still-image contradictions with stable field ownership', () => {
  const service = new CinematicVisualPlanQualityService();
  const { project, plan } = fixture();
  plan.onScreenTextPolicy = 'No text anywhere in the image.';
  plan.scenes[0].screenDirection = 'Camera moves from left to right.';
  plan.scenes[0].propContinuity = 'She holds the CLOSED sign until she picks up the phone.';
  Object.assign(plan.scenes[0].shots[0], {
    visibleMoment: 'Her hand holds the CLOSED sign in a close-up.',
    subjectAction: 'Her hand holds the CLOSED sign in a close-up.',
    framing: 'hand close-up',
    performanceCue: 'Her eyes hold back tears.',
    environment: 'Wet floor inside the family cafe while rain falls outside.'
  });

  const result = service.evaluate(project, plan);
  const codes = new Set(result.findings.map(item => item.code));

  assert.equal(result.status, 'ready_with_warnings');
  assert.ok(codes.has('unexplained_interior_weather'));
  assert.ok(codes.has('duplicate_moment_and_action'));
  assert.ok(codes.has('framing_performance_mismatch'));
  assert.ok(codes.has('motion_instruction_in_still'));
  assert.ok(codes.has('future_prop_action_leakage'));
  assert.ok(codes.has('diegetic_text_conflict'));
  assert.ok(result.findings.every(item => item.sceneId === 'scene_1' && item.shotId === 'shot_1'));
});

test('visual quality identifies an internal non-visual action', () => {
  const service = new CinematicVisualPlanQualityService();
  const { project, plan } = fixture();
  plan.scenes[0].shots[0].subjectAction = 'She stands still and breathes softly.';

  const result = service.evaluate(project, plan);

  assert.ok(result.findings.some(item => item.code === 'non_visual_action' && item.repairable));
});

test('visual quality keeps Character readiness outside AI repair authority', () => {
  const service = new CinematicVisualPlanQualityService();
  const { project, plan } = fixture();
  project.castAssignments[0].identityReady = false;

  const result = service.evaluate(project, plan);
  const identity = result.findings.find(item => item.code === 'character_identity_not_ready');

  assert.equal(result.status, 'blocked');
  assert.equal(identity?.repairable, false);
});

function fixture() {
  const assignmentId = 'cast_1';
  const lookId = 'look_1';
  const project = {
    id: 'cineproj_quality',
    version: 4,
    aspectRatio: '9:16',
    setup: { storyBrief: 'A woman decides whether to keep her family cafe open.' },
    castAssignments: [{
      id: assignmentId,
      active: true,
      identityReady: true,
      characterProfileId: 'character_1',
      characterProfileVersionId: 'character_version_1',
      displayName: 'Nara',
      storyRole: 'protagonist',
      looks: [{ id: lookId, name: 'Cafe Close', locked: true, assetIds: ['asset_look_1'] }]
    }]
  };
  const shot = {
    id: 'shot_1', version: 1, orderKey: 1, title: 'Closing time', purpose: 'Establish the choice',
    coverageRole: 'establishing', durationMs: 6000,
    visibleMoment: 'Nara stands among covered tables and faces the exit on frame right.',
    subjectAction: 'Her right hand rests visibly on the CLOSED sign.',
    emotionalTarget: 'restrained loneliness', performanceCue: 'Her shoulders sit slightly low.',
    framing: 'vertical medium-wide', cameraAngle: 'eye level', cameraMovement: 'locked camera',
    blocking: 'Nara is centered; the exit remains frame right.', performance: 'Restrained posture.', gaze: '',
    lighting: 'Cool window light with natural shadow falloff.',
    environment: 'Dry cafe interior; rain beads on the exterior windows and wet pavement remains outside.',
    prompt: '', continuityEntry: 'Nara stands inside the closed cafe.',
    continuityExit: 'Her right hand remains on the sign.', transitionToNext: 'Cut to the sign.',
    estimatedActionDurationMs: 4000, dialogueCues: [], audioCues: [],
    castAssignmentIds: [assignmentId], wardrobeLookIds: [lookId], continuityNotes: [], storyboardStatus: 'draft'
  };
  const scene = {
    id: 'scene_1', version: 1, orderKey: 1, beatId: 'beat_1', title: 'Cafe after closing',
    purpose: 'Establish the final closing.', storyChange: 'Nara cannot leave yet.',
    entryState: 'The cafe is closed.', exitState: 'Nara pauses at the exit.', objective: 'Leave the cafe.',
    pressure: 'It is the final closing.', location: 'Interior of the family cafe', time: 'Rainy dusk',
    emotionalStart: 'restrained loneliness', emotionalEnd: 'hesitation', transitionIntent: 'cut',
    castAssignmentIds: [assignmentId], wardrobeLookIds: [lookId], blocking: 'Nara remains centered.',
    lighting: 'Cool exterior window light.', performance: 'Restrained.', audioIntent: 'Rain outside.',
    propContinuity: 'The CLOSED sign is held in her right hand.',
    screenDirection: 'Nara faces the exit on frame right.', continuityNotes: ['Interior floor remains dry.'],
    shots: [shot], shotOrder: [shot.id], durationMs: shot.durationMs
  };
  const plan = {
    objective: 'Turn grief into a decision.', logline: 'Nara chooses to reopen the cafe.',
    emotionalArc: 'Loneliness to quiet hope.', onScreenTextPolicy: 'No captions or watermarks; CLOSED is allowed on the story sign.',
    beats: [{
      id: 'beat_1', orderKey: 1, type: 'development', title: 'Closing', purpose: 'Establish loss',
      storyChange: 'Nara pauses.', cause: 'The cafe closes.', consequence: 'She remains.',
      emotionalStart: 'lonely', emotionalTurn: 'hesitant', emotionalEnd: 'resolved',
      requiredElements: [], targetDurationMs: 6000, sceneIds: [scene.id]
    }],
    scenes: [scene]
  };
  return { project, plan };
}
