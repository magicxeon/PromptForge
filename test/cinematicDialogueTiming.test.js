import assert from 'node:assert/strict';
import test from 'node:test';
import { assessDialogueShot, assessDialoguePlan, estimateDialogueSpeech, normalizeDialogueReview } from '../server/domain/cinematic/CinematicDialogueTiming.js';

test('dialogueReview history is bounded, versioned and separate from current assessment', () => {
  const marker = { contractVersion: 'cinematic-dialogue-timing-v1' };
  assert.equal(normalizeDialogueReview({}, {}), undefined);
  assert.equal(normalizeDialogueReview({ contractVersion: 'future' }, {}), undefined);
  const large = normalizeDialogueReview({ ...marker, proposal: { text: 'x'.repeat(256001) } }, {});
  assert.equal(large.historyOmitted, true);
  assert.equal(large.proposal, undefined);
  assert.equal(large.final.measured, false);
  const malformed = normalizeDialogueReview({ ...marker, proposal: [], rounds: [null, [], {}, {}, {}] }, {});
  assert.equal(malformed.proposal, undefined);
  assert.equal(malformed.rounds.length, 2);
});

const thai = '\u0e17\u0e38\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48\u0e04\u0e38\u0e13\u0e21\u0e32\u0e17\u0e35\u0e48\u0e23\u0e49\u0e32\u0e19\u0e09\u0e31\u0e19\u0e08\u0e30\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e01\u0e32\u0e41\u0e1f\u0e04\u0e38\u0e13\u0e08\u0e19\u0e01\u0e27\u0e48\u0e32\u0e08\u0e30\u0e0a\u0e14\u0e43\u0e0a\u0e49\u0e04\u0e48\u0e32\u0e40\u0e2a\u0e35\u0e22\u0e2b\u0e32\u0e22\u0e04\u0e23\u0e1a';
function shot(text = 'Yes.', overrides = {}) {
  return { id: 'shot', durationMs: 4000, framing: 'medium two shot',
    performanceCue: 'Lips form the words; head turns as the listener reacts.',
    gaze: 'Toward the listener, then down to the phone.',
    dialogueCues: [{ text, delivery: 'quiet', startOffsetMs: 0, estimatedDurationMs: 100, speakerVisible: true }],
    ...overrides };
}
const codes = result => result.findings.map(item => item.code);

test('independent Thai estimate detects the sanitized four-second apology despite a two-second AI claim', () => {
  const value = shot(thai);
  Object.assign(value.dialogueCues[0], { startOffsetMs: 2000, estimatedDurationMs: 2000 });
  const before = structuredClone(value);
  const result = assessDialogueShot(value, { spokenLanguage: 'Thai' });
  assert.ok(codes(result).includes('film_dialogue_estimated_overload'));
  assert.ok(result.estimates[0].units.thai > 20);
  assert.ok(result.estimates[0].minimumMs > 2000);
  assert.equal(result.estimates[0].measured, false);
  assert.equal(result.estimates[0].aiEstimatedDurationMs, 2000);
  assert.ok(result.findings.every(item => item.severity === 'info' && item.advisory));
  assert.deepEqual(value, before);
});

test('short dialogue, empty Shots and non-spaced scripts remain usable without a provider minimum', () => {
  assert.deepEqual(codes(assessDialogueShot(shot(), { spokenLanguage: 'en' })), []);
  assert.deepEqual(codes(assessDialogueShot({ durationMs: 250, dialogueCues: [] })), []);
  const chinese = estimateDialogueSpeech('\u4f60\u597d\u4e16\u754c', { spokenLanguage: 'zh' });
  assert.equal(chinese.units.cjk, 4);
  assert.ok(chinese.minimumMs > 0);
  const mixed = estimateDialogueSpeech(`${thai} thank you`, { spokenLanguage: 'en' });
  assert.equal(mixed.units.spaced, 2);
  assert.ok(mixed.units.thai > 0);
});

test('uncalibrated fallback, breath, punctuation and slow delivery are explicit; hurried never accelerates speech', () => {
  const plain = estimateDialogueSpeech('Thank you for coming', { spokenLanguage: 'en' });
  const paused = estimateDialogueSpeech('Thank you, for coming.', { spokenLanguage: 'en', delivery: 'slow, breath, pause' });
  assert.ok(paused.minimumMs > plain.minimumMs);
  assert.equal(estimateDialogueSpeech('Thank you for coming', { spokenLanguage: 'en', delivery: 'hurried' }).minimumMs, plain.minimumMs);
  assert.equal(estimateDialogueSpeech('unsegmentedunknownlanguage', { spokenLanguage: 'unknown' }).confidence, 'low');
  assert.equal(estimateDialogueSpeech('a'.repeat(10001)).truncated, true);
});

test('turn-taking is checked by offsets, intentional overlap does not allow crossing the clip boundary', () => {
  const value = shot('Thank you for coming');
  value.dialogueCues.push({ text: 'You are welcome', startOffsetMs: 500, delivery: '', speakerVisible: true });
  assert.ok(codes(assessDialogueShot(value, { spokenLanguage: 'en' })).includes('film_dialogue_turn_overlap'));
  value.dialogueCues[1].delivery = 'intentional interruption and overlap';
  assert.ok(!codes(assessDialogueShot(value, { spokenLanguage: 'en' })).includes('film_dialogue_turn_overlap'));
  value.dialogueCues[1].startOffsetMs = 3900;
  assert.ok(codes(assessDialogueShot(value, { spokenLanguage: 'en' })).includes('film_dialogue_estimated_overload'));
});

test('simultaneous action is not blindly added to dialogue; performance must be visible', () => {
  assert.ok(!codes(assessDialogueShot(shot('Yes', { estimatedActionDurationMs: 3800 }), { spokenLanguage: 'en' })).includes('film_dialogue_action_overload'));
  const insert = shot('Yes', { framing: 'hand-only insert' });
  assert.ok(codes(assessDialogueShot(insert, { spokenLanguage: 'en' })).includes('film_dialogue_framing_conflict'));
  insert.dialogueCues[0].speakerVisible = false;
  insert.performanceCue = 'Fingers tighten. Hold off-screen dialogue for a listener reaction in the next Shot.';
  assert.deepEqual(codes(assessDialogueShot(insert, { spokenLanguage: 'en' })), []);
  const visible = shot('Yes', { gaze: '', performanceCue: 'Sad.' });
  assert.ok(codes(assessDialogueShot(visible, { spokenLanguage: 'en' })).includes('film_dialogue_visible_performance'));
  assert.ok(codes(assessDialogueShot(visible, { spokenLanguage: 'en' })).includes('film_dialogue_listener_coverage'));
});

test('plan assessment preserves positional/ID evidence and offers choices without claiming measured readiness', () => {
  const value = shot(thai, { durationMs: 1000 });
  const result = assessDialoguePlan({ spokenLanguage: 'th', scenes: [{ id: 'scene', shots: [value] }] });
  assert.equal(result.status, 'needs_review');
  assert.equal(result.findings[0].sceneId, 'scene');
  assert.equal(result.findings[0].shotIndex, 0);
  assert.ok(result.alternatives.includes('extend_project_runtime'));
});
