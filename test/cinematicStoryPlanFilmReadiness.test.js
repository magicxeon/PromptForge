import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeStoryPlanSource,
  buildFilmScriptPreview,
  evaluateStoryPlanFilmReadiness,
  filmReadinessNotEvaluated
} from '../server/domain/cinematic/StoryPlanFilmReadiness.js';

function project(overrides = {}) {
  return {
    id: 'cineproj_cafe', durationTargetMs: 10_000,
    setup: {
      storyBrief: 'Nara closes the family cafe. She hears her father and chooses to reopen tomorrow.',
      creativeDirection: 'A restrained photorealistic drama inside the cafe.',
      storyRoleSlots: [{ id: 'role_nara', objective: 'Choose whether the cafe has a future.' }]
    },
    castAssignments: [{ id: 'cast_nara', active: true }],
    ...overrides
  };
}

function readyPlan() {
  return {
    beats: [{ id: 'beat_1', title: 'Choice', cause: 'The old message plays.', consequence: 'Nara turns the light on.' }],
    scenes: [{
      id: 'scene_1', title: 'Cafe close', entryState: 'The cafe is dark.', exitState: 'The counter light is on.',
      transitionIntent: 'cut on the switch click', castAssignmentIds: ['cast_nara'], shots: [{
        id: 'shot_1', title: 'The switch', durationMs: 10_000,
        visibleMoment: 'Nara rests her fingers on the light switch.', subjectAction: 'She turns the switch on.',
        emotionalTarget: 'Quietly resolved', performanceCue: 'One exhale and a small release in her shoulders.',
        continuityEntry: 'Right hand on the switch; cafe dark.', continuityExit: 'Right hand lowers; warm counter light on.',
        transitionToNext: 'end', prompt: 'Nara at the switch', blocking: '', performance: '',
        dialogueCues: [{ speakerCastAssignmentId: 'cast_nara', offscreenVoiceRole: '', text: 'พรุ่งนี้เราเปิดร้าน', delivery: 'quiet', startOffsetMs: 4000, estimatedDurationMs: 2500, speakerVisible: true }],
        audioCues: [{ kind: 'ambience', source: 'rain', description: 'Soft rain', startOffsetMs: 0, durationMs: 10_000 }]
      }]
    }]
  };
}

test('preflight diagnoses duplicate, truncation and cafe-versus-station conflict before provider dispatch', () => {
  const complete = 'Nara closes her family cafe and hears her father say “Open it again tomorrow.”';
  const result = analyzeStoryPlanSource(project({
    setup: {
      storyBrief: `${complete} ${complete.slice(0, 58)}`,
      creativeDirection: 'Tracks stay camera-left on the empty station platform.',
      storyRoleSlots: [{ id: 'role_nara', objective: 'Leave the train platform.' }]
    }
  }));
  assert.equal(result.status, 'blocked');
  assert.ok(result.diagnostics.some(item => item.code === 'story_source_duplicate'));
  assert.ok(result.diagnostics.some(item => item.code === 'story_source_likely_truncated'));
  assert.ok(result.diagnostics.some(item => item.code === 'story_source_location_conflict'));
});

test('explicit Story Brief authority uses deterministic complete passage and resolves stale Creative Direction blockers', () => {
  const complete = 'Nara closes her family cafe and hears her father say “Open it again tomorrow.”';
  const result = analyzeStoryPlanSource(project({
    setup: {
      storyBrief: `${complete} ${complete.slice(0, 58)}`,
      creativeDirection: 'Tracks stay camera-left on the empty station platform.',
      storyRoleSlots: []
    }
  }), { sourceResolution: 'story_brief' });
  assert.equal(result.status, 'ready');
  assert.equal(result.resolvedStoryBrief, complete);
  assert.equal(result.resolvedCreativeDirection, '');
});

test('Film Readiness preserves a drawable timed Shot and warns when it exceeds the portable video baseline', () => {
  const plan = readyPlan();
  const readiness = evaluateStoryPlanFilmReadiness(project(), plan);
  assert.equal(readiness.status, 'ready_with_warnings');
  assert.ok(readiness.findings.some(item => item.code === 'film_shot_portable_duration_review'));
  const script = buildFilmScriptPreview(plan);
  assert.deepEqual(script.map(item => [item.startMs, item.endMs]), [[0, 10_000]]);
  assert.equal(script[0].dialogue[0].text, 'พรุ่งนี้เราเปิดร้าน');
  assert.equal(script[0].visual, 'Nara rests her fingers on the light switch.');
});

test('Film Readiness blocks missing visible authority and overflowing dialogue', () => {
  const plan = readyPlan();
  plan.scenes[0].shots[0].visibleMoment = '';
  plan.scenes[0].shots[0].dialogueCues[0].estimatedDurationMs = 7000;
  const readiness = evaluateStoryPlanFilmReadiness(project(), plan);
  assert.equal(readiness.status, 'not_ready');
  assert.ok(readiness.findings.some(item => item.code === 'film_shot_visible_moment_required'));
  assert.ok(readiness.findings.some(item => item.code === 'film_dialogue_timing_overflow'));
});

test('legacy readiness is explicit and never presented as ready', () => {
  assert.equal(filmReadinessNotEvaluated().status, 'not_evaluated');
});
