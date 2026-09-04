import assert from 'node:assert/strict';
import test from 'node:test';
import { StoryboardKeyframeContractCompiler } from '../server/domain/cinematic/StoryboardKeyframeContractCompiler.js';

const project = {
  id: 'cineproj_contract', version: 7, aspectRatio: '9:16',
  setup: { storyBrief: 'Nara decides whether to reopen the family cafe.' },
  activeStoryPlanVersionId: 'cineplan_1',
  storyPlanVersions: [{
    id: 'cineplan_1', sceneIds: ['scene_1'], objective: 'Make the choice visible.',
    beats: [{ id: 'beat_1', purpose: 'Hold the final hesitation.', storyChange: 'Stillness becomes a decision.' }]
  }],
  castAssignments: [{
    id: 'cast_nara', active: true, characterProfileId: 'char_nara',
    characterProfileVersionId: 'charver_nara_2', displayName: 'Nara', storyRole: 'Lead',
    identityReady: true,
    looks: [{
      id: 'look_close', name: 'Quiet Resolve', garmentSummary: 'dark cafe apron',
      accessorySummary: 'old phone', locked: true, assetIds: ['asset_look_front']
    }]
  }]
};

const scene = {
  id: 'scene_1', version: 2, beatId: 'beat_1', title: 'After closing',
  location: 'Interior family cafe', time: 'rainy dusk', emotionalStart: 'isolated', emotionalEnd: 'quiet hope',
  entryState: 'The cafe is dark.', exitState: 'Nara reaches for the light.',
  lighting: 'cool window light with practical lamps off', screenDirection: 'exit remains frame-right',
  castAssignmentIds: ['cast_nara'], wardrobeLookIds: ['look_close'],
  continuityNotes: ['Hair and apron remain unchanged'], shotOrder: ['shot_1', 'shot_2'],
  shots: []
};

const shot = {
  id: 'shot_1', version: 3, title: 'Empty cafe', visibleMoment: 'Nara stands alone among covered tables.',
  subjectAction: 'She scans the empty room.', emotionalTarget: 'isolated restraint',
  framing: 'vertical medium-wide', cameraAngle: 'eye level', cameraMovement: 'slow move left to right',
  blocking: 'Nara is centered with the exit frame-right', performanceCue: 'heavy shoulders and one shallow breath',
  environment: 'dry interior floor; rain remains outside the windows', prompt: 'Keep the CLOSED sign near the counter.',
  castAssignmentIds: ['cast_nara'], wardrobeLookIds: ['look_close'], continuityNotes: []
};
scene.shots = [shot, { ...shot, id: 'shot_2', emotionalTarget: 'quiet hope' }];

test('Storyboard keyframe compiler is deterministic and keeps the current Shot authoritative', () => {
  const compiler = new StoryboardKeyframeContractCompiler();
  const input = {
    project, scene, shot,
    referencePlan: {
      lookAssetIds: ['asset_look_front'],
      characterProfileVersionIds: ['charver_nara_2']
    }
  };
  const first = compiler.compile(input);
  const second = compiler.compile(input);
  const unrelatedProjectMutation = compiler.compile({
    ...input,
    project: { ...project, version: project.version + 1 }
  });
  assert.equal(first.sourceFingerprint, second.sourceFingerprint);
  assert.equal(first.sourceFingerprint, unrelatedProjectMutation.sourceFingerprint);
  assert.equal(first.performance.emotionalTarget, 'isolated restraint');
  assert.equal(first.currentState.coverageRole, 'establishing');
  assert.equal(first.visualSpec.moment.coverageRole, 'establishing');
  assert.equal(first.visualSpec.environment.location, 'Interior family cafe');
  assert.match(first.providerIndependentPrompt, /Visible emotion: isolated restraint/i);
  assert.match(first.providerIndependentPrompt, /Establishing keyframe/i);
  assert.doesNotMatch(first.providerIndependentPrompt, /motion context only/i);
  assert.doesNotMatch(first.providerIndependentPrompt, /live-action cinematic photograph/i);
  assert.doesNotMatch(first.providerIndependentPrompt, /subtle lens softness/i);
  assert.doesNotMatch(first.providerIndependentPrompt, /Natural camera realism|REALISM_BOOSTER/i);
  assert.doesNotMatch(first.providerIndependentPrompt, /Stillness becomes a decision/i);
  assert.doesNotMatch(first.providerIndependentPrompt, /Nara decides whether to reopen/i);
  assert.doesNotMatch(first.providerIndependentPrompt, /quiet hope.*Show only this state/i);
  assert.ok(first.providerIndependentPrompt.length <= 3600);
});

test('Storyboard keyframe compiler strips a previously saved legacy contract', () => {
  const compiler = new StoryboardKeyframeContractCompiler();
  const legacy = `STORYBOARD STILL CONTRACT\n\nShot prompt:\nKeep the sign in her right hand.\n\nProject intent:\nFuture story.`;
  const result = compiler.compile({ project, scene, shot: { ...shot, prompt: legacy } });
  assert.equal(result.authorDirection, 'Keep the sign in her right hand.');
  assert.equal(result.providerIndependentPrompt.match(/STORYBOARD KEYFRAME CONTRACT/g)?.length, 1);
  assert.doesNotMatch(result.providerIndependentPrompt, /Future story/);
});

test('Storyboard keyframe compiler reports future emotion and unexplained interior wetness', () => {
  const compiler = new StoryboardKeyframeContractCompiler();
  const result = compiler.compile({
    project,
    scene,
    shot: { ...shot, emotionalTarget: 'quiet hope', environment: 'wet floor and puddles inside the cafe' }
  });
  assert.ok(result.findings.some(item => item.code === 'future_emotional_state_leakage'));
  assert.ok(result.findings.some(item => item.code === 'unexplained_interior_weather'));
});

test('Storyboard keyframe compiler preserves an intentional insert opening without an establishing warning', () => {
  const compiler = new StoryboardKeyframeContractCompiler();
  const result = compiler.compile({
    project,
    scene,
    shot: { ...shot, coverageRole: 'insert', framing: 'close-up of the hand and CLOSED sign' }
  });
  assert.equal(result.visualSpec.moment.coverageRole, 'insert');
  assert.doesNotMatch(result.providerIndependentPrompt, /slow move left to right/i);
  assert.ok(!result.findings.some(item => item.code === 'first_shot_non_establishing'));
});

test('Storyboard keyframe compiler infers a legacy close-up opening as an insert', () => {
  const compiler = new StoryboardKeyframeContractCompiler();
  const result = compiler.compile({
    project,
    scene,
    shot: { ...shot, framing: 'vertical close-up of the hand and CLOSED sign' }
  });
  assert.equal(result.visualSpec.moment.coverageRole, 'insert');
  assert.match(result.providerIndependentPrompt, /Insert keyframe/i);
  assert.doesNotMatch(result.providerIndependentPrompt, /Establishing keyframe/i);
});

test('Storyboard keyframe compiler keeps a multi-phase action out of the visible prompt', () => {
  const compiler = new StoryboardKeyframeContractCompiler();
  const multiPhaseAction = 'กำป้ายแน่นขึ้นแล้วคลายเล็กน้อย';
  const visibleMoment = 'มือของนารากำป้าย CLOSED ไว้นิ่งเหนือโต๊ะคลุมผ้า';
  const result = compiler.compile({
    project,
    scene,
    shot: { ...shot, subjectAction: multiPhaseAction, visibleMoment }
  });
  assert.equal(result.currentState.primaryPhysicalAction, multiPhaseAction);
  assert.equal(result.visualSpec.moment.action, visibleMoment);
  assert.ok(result.findings.some(item => item.code === 'multiple_visible_actions'));
  assert.doesNotMatch(result.providerIndependentPrompt, /คลายเล็กน้อย/u);
});

test('Storyboard keyframe compiler reduces a multi-phase performance cue to one visible state', () => {
  const compiler = new StoryboardKeyframeContractCompiler();
  const result = compiler.compile({
    project,
    scene,
    shot: { ...shot, performanceCue: 'นิ้วเกร็งและคลายเพียงเล็กน้อย' }
  });
  assert.equal(result.performance.observableCue, 'นิ้วเกร็งและคลายเพียงเล็กน้อย');
  assert.equal(result.visualSpec.performance.observableCue, 'นิ้วเกร็ง');
  assert.ok(result.findings.some(item => item.code === 'multiple_visible_performance_cues'));
  assert.doesNotMatch(result.providerIndependentPrompt, /คลายเพียงเล็กน้อย/u);
});

test('Storyboard keyframe compiler warns when a first Shot is authored as generic action coverage', () => {
  const compiler = new StoryboardKeyframeContractCompiler();
  const result = compiler.compile({ project, scene, shot: { ...shot, coverageRole: 'action' } });
  assert.ok(result.findings.some(item => item.code === 'first_shot_non_establishing'));
});
