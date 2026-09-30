import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAuthoringContinuity, continuitySourceKey } from '../server/domain/cinematic/CinematicAuthoringContinuity.js';
import { cinematicWorkflowPolicy } from '../server/config/cinematicRewampConfiguration.js';

test('continuity uses bounded authored endings, not truncated openings or invented knowledge', () => {
  const items = [{ id: 'before', version: 1, story: `${'Opening. '.repeat(2000)}LAST_EVENT`, exitState: 'The letter is unopened.' },
    { id: 'current', version: 1, story: 'She waits.' }, { id: 'after', version: 1, story: 'NEXT_OPENING. The letter is opened.' }];
  const result = buildAuthoringContinuity(items, 'current');
  assert.equal(result.previous.excerpt.length, cinematicWorkflowPolicy.authoring.continuityExcerptCharacters);
  assert.ok(result.previous.excerpt.endsWith('LAST_EVENT'));
  assert.match(result.next.excerpt, /^NEXT_OPENING/);
  assert.equal(result.previous.exitState, 'The letter is unopened.');
  assert.match(result.rule, /not knowledge already held/);
  assert.notEqual(continuitySourceKey(items), continuitySourceKey([...items].reverse()));
  assert.equal(buildAuthoringContinuity(items, 'missing').next, null);
  assert.equal(buildAuthoringContinuity(items, 'before').previous, null);
});
