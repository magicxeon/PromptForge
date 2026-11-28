import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAuthoringContinuity, continuitySourceKey, markChapterContinuityChanges } from '../server/domain/cinematic/CinematicAuthoringContinuity.js';
import { cinematicWorkflowPolicy } from '../server/config/cinematicRewampConfiguration.js';

test('changed opening queues the previous and all later written, unfinished episodes once', () => {
  const episodes = ['prev','changed','done','next','empty'].map(id => ({id,version:1,chapterStory:id,scenes:[]}));
  episodes[2].scenes = [{shots:[{completed:true}]}];
  episodes[4].chapterStory = '';
  markChapterContinuityChanges(episodes,[{project:episodes[1],previousStory:'before edit'}],'now');
  assert.deepEqual(episodes.map(item=>!!item.continuityReviewRequired),[true,false,false,true,false]);
  assert.deepEqual(episodes.map(item=>item.version),[2,1,1,2,1]);
  const opening = 'x'.repeat(cinematicWorkflowPolicy.authoring.continuityExcerptCharacters);
  episodes[1].chapterStory = opening+'new ending';
  markChapterContinuityChanges(episodes,[{project:episodes[1],previousStory:opening+'old ending'}],'later');
  assert.deepEqual(episodes.map(item=>item.version),[2,1,1,3,1]);
});

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
