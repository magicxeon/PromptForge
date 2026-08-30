import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicStoryPlanService } from '../server/domain/generation/CinematicStoryPlanService.js';

const project = {
  id: 'cineproj_story', version: 7, title: 'Last Train', aspectRatio: '9:16',
  durationTargetMs: 20_000, activeStorySourceVersionId: 'cinesrc_1',
  activeStoryPlanVersionId: null,
  setup: {
    platform: 'youtube-shorts', genre: 'drama', audienceFeeling: 'uplifted',
    pacing: 'balanced', endingIntent: 'hopeful', storyBrief: 'A woman chooses hope.',
    creativeDirection: 'Never show another person.',
    storyRoleSlots: [{ id: 'role_lead', label: 'Young Woman', importance: 'required' }]
  },
  castAssignments: [{
    id: 'cast_lead', active: true, storyRoleSlotId: 'role_lead', displayName: 'Mira',
    storyRole: 'Young Woman', objective: 'Choose', motivation: '', pressure: '',
    personalityTraits: ['restrained'], emotionalBaseline: 'uncertain', dialogueStyle: 'none',
    performanceDirection: 'Small breath changes', identityReady: true,
    looks: [{ id: 'look_arrival', name: 'Arrival', locked: true }]
  }],
  scenes: []
};

function service(provider) {
  const recipe = id => ({ id, version: 1, enabled: true, instruction: 'test', fingerprint: 'abc123' });
  return new CinematicStoryPlanService({
    policyLoader: () => ({ enabled: true, requestedEnabled: true, provider: 'openai', model: 'test-model', reasoningEffort: 'low', maxOutputTokens: 1000, timeoutMs: 1000, apiKey: 'test' }),
    storyRecipeLoader: () => recipe('cinematic-story-plan-generate'),
    sceneRecipeLoader: () => recipe('cinematic-scene-direction-generate'),
    providerFactory: () => provider
  });
}

test('Story Plan AI returns a bounded review proposal with exact Project duration and authorized references', async () => {
  const planner = service({
    generateCinematicStoryPlan: async () => ({
      objective: 'Choose hope', logline: 'A final train forces a choice.', emotionalArc: 'Uncertainty to hope',
      beats: [
        { key: 'wait', type: 'opening', title: 'Waiting', purpose: 'Establish', storyChange: 'A message arrives', emotionalStart: 'guarded', emotionalEnd: 'shaken', targetDurationSeconds: 8 },
        { key: 'leave', type: 'resolution', title: 'Leaving', purpose: 'Resolve', storyChange: 'She walks away', emotionalStart: 'shaken', emotionalEnd: 'hopeful', targetDurationSeconds: 12 }
      ],
      scenes: [
        { beatKey: 'wait', title: 'Platform', purpose: 'Wait', storyChange: 'Message', location: 'Station', time: 'Night', emotionalStart: 'guarded', emotionalEnd: 'shaken', transitionIntent: 'cut', castAssignmentIds: ['cast_lead', 'unknown'], wardrobeLookIds: ['look_arrival', 'unknown-look'], blocking: 'Still', lighting: 'Cool', performance: 'Restrained', audioIntent: 'Station', continuityNotes: [], shots: [{ title: 'Phone', purpose: 'Message', durationSeconds: 8, framing: 'close', cameraAngle: 'eye', cameraMovement: 'locked', blocking: 'Hold phone', performance: 'Breath', lighting: 'Cool', environment: 'Platform', audioIntent: 'Tone', prompt: 'Phone insert', castAssignmentIds: ['cast_lead'], wardrobeLookIds: ['look_arrival'], continuityNotes: [] }] },
        { beatKey: 'leave', title: 'Exit', purpose: 'Choose', storyChange: 'Leaves', location: 'Exit', time: 'Night', emotionalStart: 'shaken', emotionalEnd: 'hopeful', transitionIntent: 'end', castAssignmentIds: ['cast_lead'], wardrobeLookIds: ['look_arrival'], blocking: 'Walk', lighting: 'Warm', performance: 'Exhale', audioIntent: 'Footsteps', continuityNotes: [], shots: [{ title: 'Walk', purpose: 'Resolve', durationSeconds: 12, framing: 'wide', cameraAngle: 'eye', cameraMovement: 'follow', blocking: 'Walk right', performance: 'Exhale', lighting: 'Warm', environment: 'Exit', audioIntent: 'Footsteps', prompt: 'Walk to warm exit', castAssignmentIds: ['cast_lead'], wardrobeLookIds: ['look_arrival'], continuityNotes: [] }] }
      ], warnings: [], responseId: 'resp_plan'
    })
  });
  const result = await planner.generatePlan(project);
  assert.equal(result.billingStatus, 'qualification_no_charge');
  assert.equal(result.plan.approved, false);
  assert.equal(result.plan.scenes.reduce((sum, scene) => sum + scene.durationMs, 0), 20_000);
  assert.deepEqual(result.plan.scenes[0].castAssignmentIds, ['cast_lead']);
  assert.deepEqual(result.plan.scenes[0].wardrobeLookIds, ['look_arrival']);
  assert.equal(Object.hasOwn(result, 'credits'), false);
});

test('Scene Direction AI stays scoped to the selected persisted Scene', async () => {
  const projectWithScene = structuredClone(project);
  projectWithScene.scenes = [{
    id: 'scene_platform', version: 2, orderKey: 1, beatId: 'beat_wait', title: 'Platform',
    purpose: 'Wait', location: 'Station', time: 'Night', emotionalStart: 'guarded', emotionalEnd: 'hopeful',
    transitionIntent: 'end', castAssignmentIds: ['cast_lead'], wardrobeLookIds: ['look_arrival'],
    blocking: '', lighting: '', performance: '', audioIntent: '', continuityNotes: [], durationMs: 20_000,
    shots: [{ id: 'shot_1', version: 1 }], shotOrder: ['shot_1']
  }];
  const planner = service({
    generateCinematicSceneDirection: async () => ({
      title: 'Platform Choice', purpose: 'Choose', storyChange: 'She leaves', location: 'Station', time: 'Night',
      emotionalStart: 'guarded', emotionalEnd: 'hopeful', transitionIntent: 'end', castAssignmentIds: ['cast_lead'],
      wardrobeLookIds: ['look_arrival'], blocking: 'Walk right', lighting: 'Cool to warm', performance: 'Exhale',
      audioIntent: 'Footsteps', continuityNotes: ['Phone pocketed'],
      shots: [{ title: 'Choice', purpose: 'Resolve', durationSeconds: 20, framing: 'wide', cameraAngle: 'eye', cameraMovement: 'follow', blocking: 'Walk', performance: 'Exhale', lighting: 'Warm', environment: 'Exit', audioIntent: 'Steps', prompt: 'Walk toward exit', castAssignmentIds: ['cast_lead'], wardrobeLookIds: ['look_arrival'], continuityNotes: [] }],
      warnings: [], responseId: 'resp_scene'
    })
  });
  const result = await planner.generateScene(projectWithScene, 'scene_platform');
  assert.equal(result.scene.id, 'scene_platform');
  assert.equal(result.scene.shots[0].id, 'shot_1');
  assert.equal(result.scene.durationMs, 20_000);
  assert.equal(result.billingStatus, 'qualification_no_charge');
});
