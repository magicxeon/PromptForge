import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommunityEngagementFixture } from './fixtures/communityEngagementFixture.js';

async function createPublicPosts(fixture, count = 5) {
  const posts = [];
  for (let index = 0; index < count; index += 1) {
    posts.push(await fixture.postRepository.create({
      title: `Pagination post ${index + 1}`,
      visibility: 'public',
      status: 'published',
      postType: index % 2 === 0 ? 'image' : 'template',
      categoryCodes: ['content_type.fashion'],
      trendingCategoryCodes: ['content_type.fashion'],
      taxonomyReviewStatus: 'admin_confirmed',
      taxonomyConfidence: 1
    }, fixture.actors.alice));
  }
  return posts;
}

test('Community ranked feed paginates without duplicate posts and freezes its ranking window', async t => {
  const fixture = await createCommunityEngagementFixture();
  t.after(() => fixture.cleanup());
  await createPublicPosts(fixture, 5);

  const first = await fixture.rankingService.listRankedPosts({
    sort: 'latest',
    period: 'week',
    limit: 2
  });
  assert.equal(first.items.length, 2);
  assert.equal(first.hasMore, true);
  assert.ok(first.nextCursor);

  fixture.advanceHours(2);
  const second = await fixture.rankingService.listRankedPosts({
    sort: 'latest',
    period: 'week',
    limit: 2,
    cursor: first.nextCursor
  });
  assert.equal(second.items.length, 2);
  assert.equal(second.hasMore, true);
  assert.ok(second.nextCursor);
  assert.equal(second.ranking.windowEnd, first.ranking.windowEnd);
  assert.deepEqual(
    new Set([...first.items, ...second.items].map(item => item.id)).size,
    4
  );

  const third = await fixture.rankingService.listRankedPosts({
    sort: 'latest',
    period: 'week',
    limit: 2,
    cursor: second.nextCursor
  });
  assert.equal(third.items.length, 1);
  assert.equal(third.hasMore, false);
  assert.equal(third.nextCursor, null);
  assert.equal(new Set([...first.items, ...second.items, ...third.items].map(item => item.id)).size, 5);
});

test('Community ranked cursor is deterministic and cannot cross filter scope', async t => {
  const fixture = await createCommunityEngagementFixture();
  t.after(() => fixture.cleanup());
  await createPublicPosts(fixture, 4);

  const query = { sort: 'top', period: 'month', limit: 2 };
  const first = await fixture.rankingService.listRankedPosts(query);
  const repeated = await fixture.rankingService.listRankedPosts(query);
  assert.deepEqual(
    repeated.items.map(item => item.id),
    first.items.map(item => item.id)
  );

  await assert.rejects(
    fixture.rankingService.listRankedPosts({
      ...query,
      officialTag: 'content_type.fashion',
      cursor: first.nextCursor
    }),
    error => error.code === 'invalid_repository_cursor' && error.statusCode === 400
  );
});
