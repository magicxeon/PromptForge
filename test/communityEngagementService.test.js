import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommunityEngagementFixture } from './fixtures/communityEngagementFixture.js';

test('Community-12 reactions, views and comments are idempotent and rebuildable', async t => {
  const fixture = await createCommunityEngagementFixture();
  t.after(() => fixture.cleanup());
  const post = await fixture.postRepository.create({
    title: 'Public fashion image',
    visibility: 'public',
    status: 'published',
    postType: 'image'
  }, fixture.actors.alice);

  const concurrentViews = await Promise.all([
    fixture.engagementService.recordView(post.id, fixture.actors.bob),
    fixture.engagementService.recordView(post.id, fixture.actors.bob)
  ]);
  assert.equal(concurrentViews.filter(result => result.counted).length, 1);

  const firstLike = await fixture.engagementService.setReaction(
    post.id,
    'like',
    true,
    fixture.actors.bob
  );
  const duplicateLike = await fixture.engagementService.setReaction(
    post.id,
    'like',
    true,
    fixture.actors.bob
  );
  await fixture.engagementService.setReaction(post.id, 'save', true, fixture.actors.bob);
  assert.equal(firstLike.changed, true);
  assert.equal(duplicateLike.changed, false);

  const created = await fixture.engagementService.createComment(
    post.id,
    '<b>Useful template</b>',
    fixture.actors.bob
  );
  assert.equal(created.comment.body, '<b>Useful template</b>');
  assert.equal(Object.hasOwn(created.comment, 'actorUserId'), false);

  const comments = await fixture.engagementService.listComments(post.id, {}, fixture.actors.alice);
  assert.equal(comments.items.length, 1);
  assert.equal(comments.items[0].body, '<b>Useful template</b>');
  assert.equal(Object.hasOwn(comments.items[0], 'actorUserId'), false);

  const detail = await fixture.engagementService.getEngagement(post.id, fixture.actors.bob);
  assert.deepEqual(detail.viewerState, {
    liked: true,
    saved: true,
    comparisonVoteSlotId: null
  });
  assert.deepEqual(
    {
      views: detail.summary.viewCount,
      likes: detail.summary.likeCount,
      saves: detail.summary.saveCount,
      comments: detail.summary.commentCount
    },
    { views: 1, likes: 1, saves: 1, comments: 1 }
  );

  await fixture.engagementService.removeComment(
    post.id,
    created.comment.id,
    fixture.actors.bob
  );
  const rebuilt = await fixture.engagementService.reconcile(post.id);
  assert.equal(rebuilt.commentCount, 0);
  assert.ok((await fixture.aggregateRepository.listByPost(post.id)).length >= 1);

  const privatePost = await fixture.postRepository.create({
    title: 'Private post',
    visibility: 'private',
    status: 'published'
  }, fixture.actors.alice);
  await assert.rejects(
    () => fixture.engagementService.setReaction(
      privatePost.id,
      'like',
      true,
      fixture.actors.bob
    ),
    error => error.code === 'community_engagement_target_unavailable'
  );
  await assert.rejects(
    () => fixture.engagementService.createComment(post.id, 'x'.repeat(1001), fixture.actors.bob),
    error => error.code === 'community_comment_too_long'
  );
});

test('Community-12 comparison voting keeps one active slot and blocks owner voting', async t => {
  const fixture = await createCommunityEngagementFixture();
  t.after(() => fixture.cleanup());
  const post = await fixture.postRepository.create({
    title: 'Model comparison',
    visibility: 'public',
    status: 'published',
    postType: 'comparison',
    sourceComparisonSetId: 'cmp_1',
    workflowSnapshot: {
      comparison: {
        slots: [{ slotId: 'slot_a' }, { slotId: 'slot_b' }]
      }
    }
  }, fixture.actors.alice);

  const added = await fixture.engagementService.setComparisonVote(
    post.id,
    'slot_a',
    fixture.actors.bob
  );
  const changed = await fixture.engagementService.setComparisonVote(
    post.id,
    'slot_b',
    fixture.actors.bob
  );
  const duplicate = await fixture.engagementService.setComparisonVote(
    post.id,
    'slot_b',
    fixture.actors.bob
  );
  assert.equal(added.changed, true);
  assert.equal(changed.changed, true);
  assert.equal(changed.comparisonSlotId, 'slot_b');
  assert.equal(duplicate.changed, false);
  assert.equal(changed.summary.comparisonVoteCount, 1);

  await assert.rejects(
    () => fixture.engagementService.setComparisonVote(post.id, 'slot_a', fixture.actors.alice),
    error => error.code === 'comparison_owner_vote_forbidden'
  );
  await assert.rejects(
    () => fixture.engagementService.setComparisonVote(post.id, 'missing', fixture.actors.bob),
    error => error.code === 'comparison_vote_slot_invalid'
  );

  const removed = await fixture.engagementService.removeComparisonVote(post.id, fixture.actors.bob);
  assert.equal(removed.changed, true);
  assert.equal(removed.summary.comparisonVoteCount, 0);
});

test('Community-12 serialized JSON mutations preserve sibling reactions', async t => {
  const fixture = await createCommunityEngagementFixture();
  t.after(() => fixture.cleanup());
  const post = await fixture.postRepository.create({
    title: 'Concurrent reactions',
    visibility: 'public',
    status: 'published'
  }, fixture.actors.alice);

  await Promise.all([
    fixture.engagementService.setReaction(post.id, 'like', true, fixture.actors.bob),
    fixture.engagementService.setReaction(post.id, 'save', true, fixture.actors.bob),
    fixture.engagementService.setReaction(post.id, 'like', true, fixture.actors.admin)
  ]);

  const summary = await fixture.engagementService.reconcile(post.id);
  assert.equal(summary.likeCount, 2);
  assert.equal(summary.saveCount, 1);
  assert.equal((await fixture.reactionRepository.listActiveByPost(post.id)).length, 3);
});
