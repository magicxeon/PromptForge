import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicTimelineCompiler } from '../server/domain/cinematic/CinematicTimelineCompiler.js';
import { createSingleCharacterCinematicProject } from './fixtures/cinematic/cinematicProjectFixtures.js';

test('Cinematic Timeline compiles a deterministic fingerprint from current approved video sources', () => {
  const project = createSingleCharacterCinematicProject();
  const compiler = new CinematicTimelineCompiler();
  const input = {
    entries: [{ shotId: 'shot_cafe_opening', trimInMs: 250, trimOutMs: 5750, transition: 'cut' }]
  };
  const first = compiler.compile(input, project, { createId: prefix => `${prefix}_one` });
  const second = compiler.compile(input, project, { createId: prefix => `${prefix}_two` });
  assert.equal(first.timelineFingerprint, second.timelineFingerprint);
  assert.equal(first.exportEligible, true);
  assert.equal(first.durationMs, 5500);
  assert.equal(first.entries[0].videoSourceFingerprint.length, 64);
});

test('Cinematic Timeline reports only the changed source entry as stale', () => {
  const project = createSingleCharacterCinematicProject();
  project.generationAttempts[1].downstreamSourceStatus = 'source_changed';
  const timeline = new CinematicTimelineCompiler().compile({
    entries: [{ shotId: 'shot_cafe_opening', trimInMs: 0, trimOutMs: 6000, transition: 'cut' }]
  }, project);
  assert.equal(timeline.exportEligible, false);
  assert.equal(timeline.entries[0].downstreamSourceStatus, 'source_changed');
});

test('Cinematic Timeline rejects trim and transition bounds outside the approved source', () => {
  const project = createSingleCharacterCinematicProject();
  const compiler = new CinematicTimelineCompiler();
  assert.throws(
    () => compiler.compile({ entries: [{
      shotId: 'shot_cafe_opening', trimInMs: 0, trimOutMs: 7000, transition: 'cut'
    }] }, project),
    error => error.code === 'cinematic_timeline_trim_invalid'
  );
  assert.throws(
    () => compiler.compile({ entries: [{
      shotId: 'shot_cafe_opening', trimInMs: 0, trimOutMs: 1000,
      transition: 'dissolve', transitionDurationMs: 1000
    }] }, project),
    error => error.code === 'cinematic_timeline_transition_invalid'
  );
});
