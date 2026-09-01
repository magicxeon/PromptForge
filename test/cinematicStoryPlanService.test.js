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

test('Story Plan preflight blocks a conflicting source without dispatching the provider', async () => {
  let calls = 0;
  const conflicted = structuredClone(project);
  conflicted.setup.storyBrief = 'Mira waits alone on the last train station platform.';
  conflicted.setup.creativeDirection = 'Keep the entire story inside a small cafe kitchen.';
  const planner = service({
    async generateCinematicStoryPlan() { calls += 1; throw new Error('provider must not be called'); }
  });
  const result = await planner.generatePlan(conflicted);
  assert.equal(result.status, 'blocked');
  assert.equal(result.plan, null);
  assert.equal(calls, 0);
  assert.ok(result.preflight.diagnostics.some(item => item.code === 'story_source_location_conflict'));
});

test('Story Brief source resolution dispatches one film-directed request and returns readiness plus script', async () => {
  let capturedContext = null;
  const conflicted = structuredClone(project);
  conflicted.setup.storyBrief = 'Mira waits alone on the last train station platform.';
  conflicted.setup.creativeDirection = 'Keep the entire story inside a small cafe kitchen.';
  const planner = service({
    async generateCinematicStoryPlan({ context }) {
      capturedContext = context;
      return {
        objective: 'Mira chooses to leave the past behind.',
        logline: 'At the last train, Mira chooses a warmer way forward.',
        emotionalArc: 'Watchful uncertainty to quiet resolve.',
        centralDramaticQuestion: 'Will Mira remain trapped by the message?',
        storyPromise: 'A private decision becomes visible through one physical choice.',
        finalPayoff: 'Mira pockets the phone and walks toward the exit.',
        spokenLanguage: 'none', onScreenTextPolicy: 'none', dialoguePolicy: 'none',
        characterAliases: [{ castAssignmentId: 'cast_lead', storyCharacterName: 'Mira' }],
        beats: [{
          key: 'choice', type: 'decision', title: 'Choice', purpose: 'Force the decision',
          storyChange: 'Mira stops waiting.', cause: 'The unreadable message arrives.',
          consequence: 'She walks away from the train.', emotionalStart: 'watchful',
          emotionalTurn: 'a held breath releases', emotionalEnd: 'resolved',
          requiredElements: ['black phone'], targetDurationSeconds: 20
        }],
        scenes: [{
          key: 'platform', beatKey: 'choice', title: 'Last platform', purpose: 'Make the choice visible',
          storyChange: 'Waiting becomes departure.', entryState: 'Mira watches the tracks.',
          exitState: 'Mira walks toward the warm station exit.', objective: 'Choose a direction.',
          pressure: 'The last train is arriving.', location: 'Station platform', time: 'Blue hour',
          emotionalStart: 'watchful', emotionalEnd: 'resolved', transitionIntent: 'end on warm light',
          castAssignmentIds: ['cast_lead'], wardrobeLookIds: ['look_arrival'], blocking: 'Mira turns from the tracks.',
          lighting: 'Cool platform and warm exit.', performance: 'One controlled exhale.', audioIntent: 'Distant train.',
          propContinuity: 'Black phone moves from both hands to right pocket.', screenDirection: 'Tracks left, exit right.',
          continuityNotes: ['Phone remains black'], shots: [{
            title: 'The choice', purpose: 'Show the decision', durationSeconds: 20,
            visibleMoment: 'Mira lowers the black phone and turns toward the warm exit.',
            subjectAction: 'She pockets the phone and begins walking right.', emotionalTarget: 'Quiet resolve',
            performanceCue: 'Exhale; shoulders release; no smile.', framing: 'medium wide', cameraAngle: 'eye level',
            cameraMovement: 'restrained follow', blocking: 'Turn then walk right', performance: 'Small release',
            lighting: 'Cool to warm', environment: 'Damp station platform', audioIntent: 'Train and footsteps',
            prompt: 'Mira turns toward the warm exit.', continuityEntry: 'Phone held at chest; tracks left.',
            continuityExit: 'Phone in right pocket; body moving right.', transitionToNext: 'end',
            estimatedActionDurationSeconds: 8, dialogueCues: [], audioCues: [{
              kind: 'ambience', source: 'station', description: 'Distant train and footsteps',
              startOffsetSeconds: 0, durationSeconds: 20
            }], castAssignmentIds: ['cast_lead'], wardrobeLookIds: ['look_arrival'], continuityNotes: []
          }]
        }],
        directorReview: { summary: 'The action and payoff now align.', findings: [] }, warnings: [], responseId: 'resp_directed'
      };
    }
  });
  const result = await planner.generatePlan(conflicted, { sourceResolution: 'story_brief' });
  assert.equal(result.status, 'proposal');
  assert.equal(result.filmReadiness.status, 'ready_with_warnings');
  assert.ok(result.filmReadiness.findings.some(item => item.code === 'film_shot_portable_duration_review'));
  assert.equal(result.scriptPreview.length, 1);
  assert.equal(result.plan.characterAliases[0].storyCharacterName, 'Mira');
  assert.equal(capturedContext.project.creativeDirection, '');
  assert.equal(capturedContext.project.storyBrief, conflicted.setup.storyBrief);
});
