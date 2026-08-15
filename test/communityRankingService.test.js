import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommunityEngagementFixture } from './fixtures/communityEngagementFixture.js';

test('Community-12 ranking is deterministic, windowed and excludes owner engagement', async t => {
  const fixture = await createCommunityEngagementFixture();
  t.after(() => fixture.cleanup());
  const post = await fixture.postRepository.create({
    title: 'Ranked fashion template',
    visibility: 'public',
    status: 'published',
    postType: 'template',
    categoryCodes: ['content_type.fashion'],
    trendingCategoryCodes: ['content_type.fashion'],
    taxonomyReviewStatus: 'admin_confirmed',
    taxonomyConfidence: 1
  }, fixture.actors.alice);

  await fixture.engagementService.recordView(post.id, fixture.actors.bob);
  await fixture.engagementService.setReaction(post.id, 'like', true, fixture.actors.bob);
  await fixture.engagementService.setReaction(post.id, 'save', true, fixture.actors.bob);
  for (let index = 0; index < 4; index += 1) {
    await fixture.engagementService.createComment(
      post.id,
      `Bob comment ${index + 1}`,
      fixture.actors.bob
    );
  }
  await fixture.engagementService.setReaction(post.id, 'like', true, fixture.actors.alice);
  await fixture.engagementService.createComment(post.id, 'Owner note', fixture.actors.alice);
  await fixture.engagementService.recordSuccessfulRemix({
    postId: post.id,
    generatedJobId: 'job_bob_remix'
  }, fixture.actors.bob);

  const ranked = await fixture.rankingService.listRankedPosts({
    sort: 'top',
    period: 'week',
    officialTag: 'content_type.fashion'
  });
  assert.equal(ranked.items.length, 1);
  assert.equal(ranked.ranking.algorithmVersion, 'community_engagement_v1');
  assert.equal(ranked.ranking.period, 'week');
  assert.deepEqual(ranked.items[0].ranking.metrics, {
    uniqueViews: 1,
    activeLikes: 1,
    activeSaves: 1,
    eligibleActiveComments: 3,
    successfulRemixes: 1,
    activeComparisonVotes: 0
  });
  assert.equal(ranked.items[0].ranking.score, 30.6931);
  assert.equal(Object.hasOwn(ranked.items[0], 'ownerUserId'), false);

  for (const [period, expectedHours] of Object.entries({
    week: 168,
    month: 720,
    year: 8760
  })) {
    const result = await fixture.rankingService.listRankedPosts({
      sort: 'top',
      period,
      officialTag: 'content_type.fashion'
    });
    const hours = (
      Date.parse(result.ranking.windowEnd) - Date.parse(result.ranking.windowStart)
    ) / 3_600_000;
    assert.equal(hours, expectedHours);
  }

  const repeat = await fixture.rankingService.listRankedPosts({
    sort: 'top',
    period: 'week',
    officialTag: 'content_type.fashion'
  });
  assert.equal(repeat.items[0].ranking.score, ranked.items[0].ranking.score);
  assert.equal(repeat.ranking.windowStart, ranked.ranking.windowStart);

  fixture.advanceHours(169);
  const expired = await fixture.rankingService.listRankedPosts({
    sort: 'top',
    period: 'week',
    officialTag: 'content_type.fashion'
  });
  assert.deepEqual(expired.items[0].ranking.metrics, {
    uniqueViews: 0,
    activeLikes: 0,
    activeSaves: 0,
    eligibleActiveComments: 0,
    successfulRemixes: 0,
    activeComparisonVotes: 0
  });
});

test('Community-12 category ranking excludes low-confidence and moderated posts', async t => {
  const fixture = await createCommunityEngagementFixture();
  t.after(() => fixture.cleanup());
  const lowConfidence = await fixture.postRepository.create({
    title: 'Unconfirmed category',
    visibility: 'public',
    status: 'published',
    categoryCodes: ['content_type.fashion'],
    trendingCategoryCodes: ['content_type.fashion'],
    taxonomyReviewStatus: 'unclassified',
    taxonomyConfidence: 0.2
  }, fixture.actors.alice);
  const reported = await fixture.postRepository.create({
    title: 'Reported category post',
    visibility: 'public',
    status: 'reported',
    categoryCodes: ['content_type.fashion'],
    trendingCategoryCodes: ['content_type.fashion'],
    taxonomyReviewStatus: 'admin_confirmed',
    taxonomyConfidence: 1
  }, fixture.actors.alice);
  await fixture.engagementService.setReaction(lowConfidence.id, 'like', true, fixture.actors.bob);
  await fixture.engagementService.setReaction(reported.id, 'like', true, fixture.actors.bob);

  const result = await fixture.rankingService.listRankedPosts({
    sort: 'trending',
    period: 'month',
    officialTag: 'content_type.fashion'
  });
  assert.equal(result.items.length, 0);
  assert.equal(result.ranking.period, 'month');
});
