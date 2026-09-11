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

function service(provider, options = {}) {
  const recipe = id => ({
    id, version: 1, enabled: true, instruction: 'test', fingerprint: 'abc123',
    limits: { maximumVisualRepairRounds: 2 }
  });
  return new CinematicStoryPlanService({
    policyLoader: () => ({
      enabled: true, requestedEnabled: true, provider: 'openai', model: 'test-model',
      reasoningEffort: 'low', maxOutputTokens: 1000, timeoutMs: 1000, apiKey: 'test',
      ...(options.policy || {})
    }),
    storyRecipeLoader: () => recipe('cinematic-story-plan-generate'),
    sceneRecipeLoader: () => recipe('cinematic-scene-direction-generate'),
    providerFactory: () => provider,
    ...(options.visualQualityService ? { visualQualityService: options.visualQualityService } : {})
  });
}

test('Story Plan AI returns a bounded review proposal with exact Project duration and authorized references', async () => {
  const progressEvents = [];
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
      ], warnings: [], responseId: 'resp_plan',
      executionProvider: 'gemini', executionModel: 'gemini-3.8-flash',
      fallbackUsed: true, fallbackReason: 'primary_rate_or_quota_exhausted'
    })
  });
  const result = await planner.generatePlan(project, {
    onProgress: progress => progressEvents.push(progress)
  });
  assert.equal(result.billingStatus, 'qualification_no_charge');
  assert.equal(result.plan.approved, false);
  assert.equal(result.plan.scenes.reduce((sum, scene) => sum + scene.durationMs, 0), 20_000);
  assert.deepEqual(result.plan.scenes[0].castAssignmentIds, ['cast_lead']);
  assert.deepEqual(result.plan.scenes[0].wardrobeLookIds, ['look_arrival']);
  assert.equal(result.plan.scenes[0].shots[0].coverageRole, 'establishing');
  assert.equal(result.plan.scenes[1].shots[0].coverageRole, 'establishing');
  assert.equal(result.plan.scenes[0].shots[0].coverageRole, 'establishing');
  assert.equal(result.plan.scenes[1].shots[0].coverageRole, 'establishing');
  assert.equal(Object.hasOwn(result, 'credits'), false);
  assert.equal(result.provenance.provider, 'gemini');
  assert.equal(result.provenance.model, 'gemini-3.8-flash');
  assert.equal(result.provenance.fallbackUsed, true);
  assert.equal(result.provenance.fallbackReason, 'primary_rate_or_quota_exhausted');
  assert.deepEqual(
    progressEvents
      .map(progress => progress.activeStageId)
      .filter(Boolean),
    [
      'source_preflight', 'plan_generation', 'director_review',
      'visual_validation', 'storyboard_readiness'
    ]
  );
  assert.equal(progressEvents.at(-1).activeStageId, null);
  assert.equal(
    progressEvents.at(-1).stages.find(stage => stage.id === 'visual_repair')?.status,
    'skipped'
  );
  assert.equal(progressEvents.at(-1).stages.at(-1).status, 'completed');
  assert.ok(progressEvents.every(progress => (
    progress.stages.filter(stage => stage.status === 'processing').length <= 1
  )));
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
  let capturedContext = null;
  const planner = service({
    generateCinematicSceneDirection: async ({ context }) => {
      capturedContext = context;
      assert.equal(context.project.storyCountryStyle, 'none');
      assert.match(context.project.storyCountryStyleGuidance, /No regional/);
      return ({
      title: 'Platform Choice', purpose: 'Choose', storyChange: 'She leaves', location: 'Station', time: 'Night',
      emotionalStart: 'guarded', emotionalEnd: 'hopeful', transitionIntent: 'end', castAssignmentIds: ['cast_lead'],
      wardrobeLookIds: ['look_arrival'], blocking: 'Walk right', lighting: 'Cool to warm', performance: 'Exhale',
      audioIntent: 'Footsteps', continuityNotes: ['Phone pocketed'],
      shots: [{ title: 'Choice', purpose: 'Resolve', durationSeconds: 20, framing: 'wide', cameraAngle: 'eye', cameraMovement: 'follow', blocking: 'Walk', performance: 'Exhale', lighting: 'Warm', environment: 'Exit', audioIntent: 'Steps', prompt: 'Walk toward exit', castAssignmentIds: ['cast_lead'], wardrobeLookIds: ['look_arrival'], continuityNotes: [] }],
      warnings: [], responseId: 'resp_scene'
    }); }
  });
  const sceneDraft = structuredClone(projectWithScene.scenes[0]);
  sceneDraft.title = 'Unsaved Scene title';
  const result = await planner.generateScene(projectWithScene, 'scene_platform', {
    direction: 'Keep the blocking unchanged.',
    sceneDraft,
    requestedFieldPaths: ['scene.lighting', 'scene.blocking'],
    lockedFieldPaths: ['scene.blocking']
  });
  assert.equal(result.scene.id, 'scene_platform');
  assert.equal(result.scene.shots[0].id, 'shot_1');
  assert.equal(result.scene.shots[0].coverageRole, 'establishing');
  assert.equal(result.scene.shots[0].coverageRole, 'establishing');
  assert.equal(result.scene.durationMs, 20_000);
  assert.equal(result.scene.blocking, '');
  assert.equal(result.fieldProposals.find(item => item.manifestPath === 'scene.lighting').outcome, 'proposed');
  assert.equal(result.fieldProposals.find(item => item.manifestPath === 'scene.lighting').recommended, true);
  assert.equal(result.fieldProposals.find(item => item.manifestPath === 'scene.blocking').outcome, 'locked');
  assert.equal(result.mergeSummary.locked, 1);
  assert.equal(capturedContext.selectedScene.title, 'Unsaved Scene title');
  assert.equal(capturedContext.fieldSelection.lockedFieldKeys[0], 'scene:scene_platform.blocking');
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
  assert.equal(result.workflow.status, 'blocked');
  assert.equal(result.workflow.stages[0].status, 'blocked');
  assert.equal(result.workflow.stages[1].status, 'queued');
});

test('Story Brief source resolution dispatches one film-directed request and returns readiness plus script', async () => {
  let capturedContext = null;
  const conflicted = structuredClone(project);
  conflicted.setup.storyCountryStyle = 'south-korea';
  conflicted.setup.storyBrief = 'Mira waits alone on the last train station platform.';
  conflicted.setup.creativeDirection = 'Keep the entire story inside a small cafe kitchen.';
  const planner = service({
    async generateCinematicStoryPlan({ context }) {
      capturedContext = context;
      assert.equal(context.project.storyCountryStyle, 'south-korea');
      assert.match(context.project.storyCountryStyleGuidance, /Korean drama/);
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
            cameraMovement: 'restrained follow', lensIntent: 'normal perspective',
            blocking: 'Turn then walk right', performance: 'Small release', gaze: 'Toward the warm exit, never camera.',
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
  assert.equal(result.plan.scenes[0].shots[0].lensIntent, 'normal perspective');
  assert.equal(result.plan.scenes[0].shots[0].gaze, 'Toward the warm exit, never camera.');
  assert.equal(result.filmReadiness.status, 'ready_with_warnings');
  assert.ok(result.filmReadiness.findings.some(item => item.code === 'film_shot_portable_duration_review'));
  assert.equal(result.scriptPreview.length, 1);
  assert.equal(result.plan.characterAliases[0].storyCharacterName, 'Mira');
  assert.equal(capturedContext.project.creativeDirection, '');
  assert.equal(capturedContext.project.storyBrief, conflicted.setup.storyBrief);
});

test('Story Plan workflow repairs allowlisted visual fields and rejects protected provider changes', async () => {
  const providerCalls = [];
  const initial = repairPlanResponse({ subjectAction: 'She stands still and breathes softly.' });
  const attemptedRepair = repairPlanResponse({ subjectAction: 'Her right hand visibly tightens around the sign.' });
  attemptedRepair.scenes[0].lighting = 'Unrequested changed lighting.';
  attemptedRepair.scenes[0].shots[0].environment = 'Unrequested changed environment.';
  attemptedRepair.directorReview.summary = 'Unrequested changed Director review.';
  attemptedRepair.warnings = ['Unrequested changed warning.'];
  attemptedRepair.scenes[0].shots[0].durationSeconds = 2;
  attemptedRepair.scenes[0].shots[0].castAssignmentIds = ['unknown_cast'];
  attemptedRepair.scenes[0].shots[0].wardrobeLookIds = ['unknown_look'];
  attemptedRepair.scenes[0].shots[0].dialogueCues = [{
    speakerCastAssignmentId: 'unknown_cast', offscreenVoiceRole: '', text: 'Changed dialogue',
    delivery: 'loud', startOffsetSeconds: 0, estimatedDurationSeconds: 1, speakerVisible: true
  }];
  const provider = {
    async generateCinematicStoryPlan(input) {
      providerCalls.push(input);
      return structuredClone(providerCalls.length === 1 ? initial : attemptedRepair);
    }
  };
  let qualityCalls = 0;
  const visualQualityService = {
    evaluate(_project, plan) {
      qualityCalls += 1;
      const scene = plan.scenes[0];
      const shot = scene.shots[0];
      const findings = qualityCalls === 1 ? [{
        code: 'non_visual_action', severity: 'warning', repairable: true,
        sceneId: scene.id, sceneTitle: scene.title, shotId: shot.id, shotTitle: shot.title,
        fieldPaths: ['shot.subjectAction'], summary: 'Action is not visible.', recommendation: 'Use a visible gesture.'
      }] : [];
      return {
        contractVersion: 'cinematic-visual-plan-quality-v1',
        status: findings.length ? 'ready_with_warnings' : 'ready',
        findingCount: findings.length,
        repairableCount: findings.length,
        findings
      };
    }
  };

  const result = await service(provider, { visualQualityService }).generatePlan(project);
  const shot = result.plan.scenes[0].shots[0];

  assert.equal(providerCalls.length, 2);
  assert.equal(providerCalls[1].context.directorOperation, 'repair_visual');
  assert.equal(providerCalls[1].context.visualRepair.findings[0].code, 'non_visual_action');
  assert.equal(shot.subjectAction, 'Her right hand visibly tightens around the sign.');
  assert.equal(shot.durationMs, 20_000);
  assert.deepEqual(shot.castAssignmentIds, ['cast_lead']);
  assert.deepEqual(shot.wardrobeLookIds, ['look_arrival']);
  assert.equal(shot.dialogueCues[0].text, 'Original dialogue');
  assert.equal(result.plan.scenes[0].lighting, 'Cool window light.');
  assert.equal(shot.environment, 'Dry cafe interior with rain outside.');
  assert.equal(result.plan.directorSummary, 'Directed and reviewed.');
  assert.deepEqual(result.plan.warnings, []);
  assert.equal(result.workflow.repairRoundCount, 1);
  assert.equal(result.workflow.repairs.some(item => item.fieldPath === 'shot.subjectAction'), true);
  assert.equal(result.workflow.remainingFindings.length, 0);
});

test('Story Plan visual repair performs at most two improving rounds', async () => {
  const providerCalls = [];
  const progressEvents = [];
  const responses = [
    repairPlanResponse({ subjectAction: 'Initial invisible action.' }),
    repairPlanResponse({ subjectAction: 'First visible repair.' }),
    repairPlanResponse({ subjectAction: 'Second visible repair.' }),
    repairPlanResponse({ subjectAction: 'Forbidden third repair.' })
  ];
  const provider = {
    async generateCinematicStoryPlan(input) {
      providerCalls.push(input);
      return structuredClone(responses[providerCalls.length - 1]);
    }
  };
  const visualQualityService = {
    evaluate(_project, plan) {
      const scene = plan.scenes[0];
      const shot = scene.shots[0];
      const counts = {
        'Initial invisible action.': 3,
        'First visible repair.': 2,
        'Second visible repair.': 1,
        'Forbidden third repair.': 0
      };
      const findingCount = counts[shot.subjectAction] ?? 0;
      const findings = Array.from({ length: findingCount }, (_, index) => ({
        code: `visual_issue_${index + 1}`, severity: 'warning', repairable: true,
        sceneId: scene.id, sceneTitle: scene.title, shotId: shot.id, shotTitle: shot.title,
        fieldPaths: ['shot.subjectAction'], summary: `Visual issue ${index + 1}.`,
        recommendation: 'Use a visible action.'
      }));
      return {
        contractVersion: 'cinematic-visual-plan-quality-v1',
        status: findings.length ? 'ready_with_warnings' : 'ready',
        findingCount, repairableCount: findingCount, findings
      };
    }
  };

  const result = await service(provider, { visualQualityService }).generatePlan(project, {
    onProgress: progress => progressEvents.push(progress)
  });

  assert.equal(providerCalls.length, 3);
  assert.equal(result.plan.scenes[0].shots[0].subjectAction, 'Second visible repair.');
  assert.equal(result.workflow.repairRoundCount, 2);
  assert.equal(result.workflow.repairRounds.every(item => item.status === 'accepted'), true);
  assert.equal(result.workflow.remainingFindings.length, 1);
  assert.ok(progressEvents.some(progress => progress.activeStageId === 'visual_repair'));
  assert.equal(
    progressEvents.at(-1).stages.find(stage => stage.id === 'visual_repair')?.status,
    'completed'
  );
});

test('Story Plan repairs unexplained interior wetness while preserving exterior rain', async () => {
  const initial = repairPlanResponse({ subjectAction: 'Her right hand visibly tightens around the sign.' });
  initial.scenes[0].shots[0].environment = 'Wet floor inside the closed family cafe while rain falls outside.';
  const repaired = repairPlanResponse({ subjectAction: 'Her right hand visibly tightens around the sign.' });
  repaired.scenes[0].shots[0].environment = 'Dry cafe interior with rain and wet pavement visible outside the windows.';
  let calls = 0;
  const provider = {
    async generateCinematicStoryPlan() {
      calls += 1;
      return structuredClone(calls === 1 ? initial : repaired);
    }
  };

  const result = await service(provider).generatePlan(project);

  assert.equal(calls, 2);
  assert.equal(result.plan.scenes[0].shots[0].environment,
    'Dry cafe interior with rain and wet pavement visible outside the windows.');
  assert.ok(result.workflow.initialFindings.some(item => item.code === 'unexplained_interior_weather'));
  assert.equal(result.workflow.remainingFindings.some(item => item.code === 'unexplained_interior_weather'), false);
});

test('Story Plan initial timeout reports a retryable generation-stage error without mutating the Project', async () => {
  const baseline = structuredClone(project);
  let capturedTimeout = null;
  const provider = {
    async generateCinematicStoryPlan({ timeoutMs }) {
      capturedTimeout = timeoutMs;
      const error = new Error('provider timeout');
      error.code = 'cinematic_story_plan_timeout';
      throw error;
    }
  };

  await assert.rejects(
    () => service(provider, { policy: { generationTimeoutMs: 12_000, repairTimeoutMs: 7_000 } }).generatePlan(project),
    error => error.code === 'cinematic_story_plan_generation_timeout'
      && error.statusCode === 504
      && error.details?.stage === 'plan_generation'
      && error.details?.retryable === true
      && error.details?.timeoutMs === 12_000
  );
  assert.equal(capturedTimeout, 12_000);
  assert.deepEqual(project, baseline);
});

test('Story Plan repair timeout retains the generated Plan and stops later repair rounds', async () => {
  const calls = [];
  const provider = {
    async generateCinematicStoryPlan({ timeoutMs }) {
      calls.push(timeoutMs);
      if (calls.length === 1) {
        const response = repairPlanResponse({ subjectAction: 'She stands still and breathes softly.' });
        response.scenes[0].propContinuity = 'She holds the sign then drops it.';
        return response;
      }
      const error = new Error('provider timeout');
      error.code = 'cinematic_story_plan_timeout';
      throw error;
    }
  };

  const result = await service(provider, {
    policy: { generationTimeoutMs: 12_000, repairTimeoutMs: 7_000 }
  }).generatePlan(project);

  assert.deepEqual(calls, [12_000, 7_000]);
  assert.equal(result.status, 'proposal');
  assert.equal(result.plan.scenes[0].shots[0].subjectAction, 'She stands still and breathes softly.');
  assert.equal(result.workflow.status, 'ready_with_warnings');
  assert.equal(result.workflow.stages.find(item => item.id === 'visual_repair').status, 'stopped');
  assert.equal(result.workflow.repairRoundCount, 1);
  assert.equal(result.workflow.repairRounds[0].status, 'provider_timeout');
  assert.equal(result.workflow.repairRounds[0].provenance, null);
  assert.deepEqual(result.workflow.repairRounds[0].failure, {
    code: 'cinematic_story_plan_repair_timeout',
    message: 'Visual repair exceeded its time budget. The generated Plan was retained for review.',
    retryable: true,
    stage: 'visual_repair',
    timeoutMs: 7_000
  });
  assert.ok(result.workflow.remainingFindings.some(item => item.code === 'future_prop_action_leakage'));
});

function repairPlanResponse({ subjectAction }) {
  return {
    objective: 'Choose whether to reopen.', logline: 'One last closing becomes a decision.',
    emotionalArc: 'Loneliness to quiet resolve.', centralDramaticQuestion: 'Will she leave?',
    storyPromise: 'A visible choice.', finalPayoff: 'She turns on the light.', spokenLanguage: 'Thai',
    onScreenTextPolicy: 'No captions; CLOSED is allowed on the sign.', dialoguePolicy: 'sparse',
    characterAliases: [{ castAssignmentId: 'cast_lead', storyCharacterName: 'Nara' }],
    beats: [{
      key: 'choice', type: 'decision', title: 'Choice', purpose: 'Make the choice visible.',
      storyChange: 'She remains.', cause: 'The cafe closes.', consequence: 'She reconsiders.',
      emotionalStart: 'lonely', emotionalTurn: 'hesitant', emotionalEnd: 'resolved',
      requiredElements: ['CLOSED sign'], targetDurationSeconds: 20
    }],
    scenes: [{
      key: 'cafe', beatKey: 'choice', title: 'Cafe after closing', purpose: 'Establish the decision.',
      storyChange: 'Leaving becomes reconsideration.', entryState: 'The cafe is closed.',
      exitState: 'Nara remains by the counter.', objective: 'Leave.', pressure: 'The final closing.',
      location: 'Interior of the family cafe', time: 'Rainy dusk', emotionalStart: 'lonely',
      emotionalEnd: 'resolved', transitionIntent: 'cut', castAssignmentIds: ['cast_lead'],
      wardrobeLookIds: ['look_arrival'], blocking: 'Nara faces the exit on frame right.',
      lighting: 'Cool window light.', performance: 'Restrained.', audioIntent: 'Rain outside.',
      propContinuity: 'The CLOSED sign remains in her right hand.',
      screenDirection: 'The exit remains frame right.', continuityNotes: ['Interior floor is dry.'],
      shots: [{
        title: 'Closing time', purpose: 'Establish the decision.', coverageRole: 'establishing',
        durationSeconds: 20, visibleMoment: 'Nara stands among covered tables facing the exit.',
        subjectAction, emotionalTarget: 'restrained loneliness',
        performanceCue: 'Her shoulders sit slightly low.', framing: 'vertical medium-wide',
        cameraAngle: 'eye level', cameraMovement: 'locked camera',
        blocking: 'Nara remains centered.', performance: 'Restrained posture.',
        lighting: 'Cool window light.', environment: 'Dry cafe interior with rain outside.',
        audioIntent: 'Rain outside.', prompt: '', continuityEntry: 'Nara stands inside the cafe.',
        continuityExit: 'The sign remains in her right hand.', transitionToNext: 'cut',
        estimatedActionDurationSeconds: 4, dialogueCues: [{
          speakerCastAssignmentId: 'cast_lead', offscreenVoiceRole: '', text: 'Original dialogue',
          delivery: 'quiet', startOffsetSeconds: 1, estimatedDurationSeconds: 2, speakerVisible: true
        }], audioCues: [], castAssignmentIds: ['cast_lead'], wardrobeLookIds: ['look_arrival'],
        continuityNotes: []
      }]
    }],
    directorReview: { summary: 'Directed and reviewed.', findings: [] }, warnings: [], responseId: 'resp_repair'
  };
}
