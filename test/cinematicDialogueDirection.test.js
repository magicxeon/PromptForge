import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicStoryPlanService } from '../server/domain/generation/CinematicStoryPlanService.js';
import { loadPromptRecipe } from '../server/config/prompt-recipes/loadPromptRecipe.js';

const project = {
  id: 'project', version: 1, durationTargetMs: 12000, activeStorySourceVersionId: 'source',
  setup: { storyBrief: 'A customer returns to a cafe. A promise repairs the relationship.' },
  castAssignments: [{ id: 'speaker', active: true, looks: [{ id: 'look' }] }], scenes: []
};
const line = 'I will make you coffee every time you return.';
function response(durations = [4, 8]) {
  return { spokenLanguage: 'en', beats: [{ key: 'beat', cause: 'A promise.', consequence: 'Trust returns.' }],
    scenes: [{ key: 'scene', beatKey: 'beat', title: 'Promise', entryState: 'A customer waits.', exitState: 'The customer stays.',
      castAssignmentIds: ['speaker'], wardrobeLookIds: ['look'], shots: durations.map((durationSeconds, index) => ({
        title: index ? 'Response' : 'Promise', durationSeconds, castAssignmentIds: ['speaker'], wardrobeLookIds: ['look'],
        visibleMoment: 'A person waits beside a table.', framing: 'medium two shot', subjectAction: 'The hand lowers.',
        emotionalTarget: 'Hopeful', performanceCue: 'Lips form the words; head tilts as the listener reacts.', gaze: 'At listener, then down.',
        continuityEntry: 'The cup is on the table.', continuityExit: 'The cup stays on the table.',
        estimatedActionDurationSeconds: 1,
        dialogueCues: index ? [] : [{ text: line, speakerCastAssignmentId: 'speaker', offscreenVoiceRole: '',
          delivery: 'quiet', speakerVisible: true, startOffsetSeconds: 2, estimatedDurationSeconds: 0.5 }], audioCues: []
      })) }], directorReview: { summary: 'Model self-review', findings: [] } };
}
function createService(responses, { rounds = 2, visual = null } = {}) {
  const calls = [];
  const clearVisual = { evaluate() { return { contractVersion: 'visual-test', status: 'ready', findings: [], findingCount: 0, repairableCount: 0 }; } };
  const recipe = loadPromptRecipe('cinematic/story-plan.v9.json');
  const service = new CinematicStoryPlanService({
    policyLoader: () => ({ enabled: true, model: 'fake', timeoutMs: 100, maxOutputTokens: 1000 }),
    storyRecipeLoader: () => ({ ...recipe, limits: { ...recipe.limits, maximumVisualRepairRounds: rounds } }),
    providerFactory: () => ({
      async generateCinematicStoryPlan(input) {
        calls.push(input);
        const value = responses[Math.min(calls.length - 1, responses.length - 1)];
        if (value instanceof Error) throw value;
        return structuredClone(value);
      },
      async generateCinematicSceneDirection(input) { calls.push(input); return structuredClone(responses[0]); }
    }), visualQualityService: visual || clearVisual
  });
  return { service, calls };
}

test('final duration allocation can introduce overload absent from raw proposal; advice never becomes an approval lock', async () => {
  const { service, calls } = createService([response([8, 8])], { rounds: 0 });
  const result = await service.generatePlan({ ...project, durationTargetMs: 8000 });
  const overload = review => review.findings.some(item => item.code === 'film_dialogue_estimated_overload');
  assert.equal(overload(result.dialogueReview.proposal), false);
  assert.equal(overload(result.dialogueReview.afterAllocation), true);
  assert.equal(overload(result.dialogueReview.final), true);
  assert.ok(result.filmReadiness.findings.filter(item => item.code.startsWith('film_dialogue_')).every(item => item.severity === 'info'));
  assert.equal(result.filmReadiness.status, 'ready');
  assert.equal(result.status, 'proposal');
  assert.equal(calls.length, 1);
  assert.equal(result.dialogueReview.additionalBillableCalls, 0);
  assert.deepEqual(result.plan.dialogueReview, result.dialogueReview);
});

test('shared bounded repair redistributes known spare time without altering words, authority, action or total', async () => {
  const attempted = response([9, 3]);
  const cue = attempted.scenes[0].shots[0].dialogueCues[0];
  Object.assign(cue, { text: 'Illicit paraphrase', speakerCastAssignmentId: 'stranger', delivery: 'fast', speakerVisible: false });
  attempted.scenes[0].shots[0].estimatedActionDurationSeconds = 0;
  attempted.scenes[0].shots[0].wardrobeLookIds = ['foreign'];
  const { service, calls } = createService([response(), attempted]);
  const before = structuredClone(project);
  const result = await service.generatePlan(project);
  const shots = result.plan.scenes[0].shots;
  assert.deepEqual(shots.map(shot => shot.durationMs), [9000, 3000]);
  assert.equal(shots[0].dialogueCues[0].text, line);
  assert.equal(shots[0].dialogueCues[0].speakerCastAssignmentId, 'speaker');
  assert.equal(shots[0].dialogueCues[0].delivery, 'quiet');
  assert.equal(shots[0].dialogueCues[0].speakerVisible, true);
  assert.deepEqual(shots[0].wardrobeLookIds, ['look']);
  assert.equal(shots[0].estimatedActionDurationMs, 1000);
  assert.equal(result.dialogueReview.final.repairableCount, 0);
  assert.equal(result.dialogueReview.rounds[0].status, 'accepted');
  assert.ok(result.dialogueReview.rounds[0].changes.some(item => item.fieldPath === 'shot.durationMs'));
  assert.equal(calls.length, 2);
  assert.equal(calls[1].context.dialogueDirectionRepair.normalizedPlan.scenes[0].shots[0].durationMs, 4000);
  assert.equal(result.dialogueReview.afterAllocation.shots[0].shotId, result.dialogueReview.final.shots[0].shotId);
  assert.equal(result.workflow.stages.find(item => item.id === 'visual_repair').status, 'completed');
  assert.equal(result.workflow.stages.find(item => item.id === 'director_review').independentAiReview, false);
  assert.deepEqual(project, before);
});

test('unsatisfiable total, unbudgeted donors and timeouts retain a draft with unresolved choices', async () => {
  const initial = response();
  initial.scenes[0].shots[1].estimatedActionDurationSeconds = 0;
  const { service, calls } = createService([initial, response([9, 3])]);
  const result = await service.generatePlan(project);
  assert.deepEqual(result.plan.scenes[0].shots.map(shot => shot.durationMs), [4000, 8000]);
  assert.equal(result.dialogueReview.rounds[0].status, 'no_progress');
  assert.ok(result.dialogueReview.final.alternatives.includes('explicitly_revise_dialogue'));
  assert.equal(calls.length, 2);
  const timeout = Object.assign(new Error('timeout'), { name: 'AbortError' });
  const timed = createService([response(), timeout]);
  const retained = await timed.service.generatePlan(project);
  assert.equal(retained.dialogueReview.rounds[0].status, 'provider_timeout');
  assert.equal(retained.plan.scenes[0].shots[0].dialogueCues[0].text, line);
  assert.equal(timed.calls.length, 2);
});

test('direction repair is targeted, bounded by the existing ceiling and cannot manufacture different Shot structure', async () => {
  const initial = response([9, 3]);
  initial.scenes[0].shots[0].gaze = '';
  initial.scenes[0].shots[0].performanceCue = 'Sad';
  const directed = response([9, 3]);
  const { service, calls } = createService([initial, directed]);
  const result = await service.generatePlan(project);
  assert.equal(result.plan.scenes[0].shots[0].gaze, directed.scenes[0].shots[0].gaze);
  assert.equal(result.dialogueReview.final.repairableCount, 0);
  assert.equal(calls.length, 2);
  const reordered = response([9, 3]);
  reordered.scenes[0].shots.reverse();
  const blocked = createService([response(), reordered]);
  const unchanged = await blocked.service.generatePlan(project);
  assert.equal(unchanged.dialogueReview.rounds[0].status, 'no_change');
  assert.equal(unchanged.plan.scenes[0].shots[0].dialogueCues[0].text, line);
  assert.ok(blocked.calls.length <= 3);
});

test('later visual repair cannot undo resolved timing or dialogue', async () => {
  const initial = response();
  const timed = response([9, 3]);
  const visualReply = response([1, 11]);
  visualReply.scenes[0].shots[0].subjectAction = 'The fingers release the cup.';
  const visual = { evaluate(_project, plan) {
    const scene = plan.scenes[0]; const shot = scene.shots[0];
    const findings = shot.subjectAction === visualReply.scenes[0].shots[0].subjectAction ? [] : [{
      code: 'visual_action', severity: 'warning', sceneId: scene.id, shotId: shot.id,
      fieldPaths: ['shot.subjectAction'], repairable: true, summary: 'Make action visible', recommendation: 'Specify fingers'
    }];
    return { contractVersion: 'visual-test', status: 'ready', findingCount: findings.length, repairableCount: findings.length, findings };
  } };
  const { service, calls } = createService([initial, timed, visualReply], { visual });
  const result = await service.generatePlan(project);
  assert.equal(calls.length, 3);
  assert.equal(result.workflow.repairRoundCount, 2);
  assert.equal(result.plan.scenes[0].shots[0].durationMs, 9000);
  assert.equal(result.plan.scenes[0].shots[0].dialogueCues[0].text, line);
  assert.equal(result.plan.scenes[0].shots[0].subjectAction, visualReply.scenes[0].shots[0].subjectAction);
});

test('explicit Scene Direction preserves exact locked dialogue, duration, IDs and old media with no repair call', async () => {
  const seeded = createService([response([9, 3])], { rounds: 0 });
  const seed = await seeded.service.generatePlan(project);
  const scene = seed.plan.scenes[0];
  const shot = scene.shots[0];
  shot.approvedVideoAttemptId = 'old-take';
  shot.storyboardStatus = 'approved';
  const actorProject = { ...project, scenes: [scene], storyPlanVersions: [{ ...seed.plan, id: 'plan' }], activeStoryPlanVersionId: 'plan',
    authoringState: { fieldStates: { [`shot:${scene.id}:${shot.id}.dialogueCues`]: { locked: true } } } };
  const changed = response([2, 10]).scenes[0];
  changed.shots[0].dialogueCues[0].text = 'Changed exact words';
  const { service, calls } = createService([changed]);
  const result = await service.generateScene(actorProject, scene.id, { lockedFieldPaths: ['shot.dialogueCues'] });
  assert.deepEqual(result.scene.shots[0].dialogueCues, shot.dialogueCues);
  assert.equal(result.scene.shots[0].id, shot.id);
  assert.equal(result.scene.shots[0].durationMs, 9000);
  assert.equal(result.scene.shots[0].approvedVideoAttemptId, 'old-take');
  assert.equal(result.scene.shots[0].storyboardStatus, 'approved');
  assert.equal(calls.length, 1);
  assert.equal(result.dialogueReview.additionalBillableCalls, 0);
});

test('new recipes retain prior continuity authority and add language, performance and user-choice constraints', () => {
  for (const name of ['story-plan.v9.json', 'scene-direction.v8.json']) {
    const recipe = loadPromptRecipe(`cinematic/${name}`);
    assert.equal(recipe.limits.dialogueTimingReview, true);
    assert.match(recipe.instruction, /Thai and other unspaced scripts/);
    assert.match(recipe.instruction, /Eye contact is optional/);
    assert.match(recipe.instruction, /White Previs lead-in adds no speaking time/);
    assert.match(recipe.instruction, /never a required Take minimum/);
    assert.match(recipe.instruction, /cause|causal/);
    assert.match(recipe.instruction, /time-zero opening/);
    assert.doesNotMatch(recipe.instruction, /Prefer 4 seconds/);
  }
});
