import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertActorContext,
  createPage,
  normalizeListQuery,
  RepositoryContractError
} from '../server/repositories/repositoryContracts.js';
import {
  decodeRepositoryCursor,
  encodeRepositoryCursor,
  paginateRepositoryRecords
} from '../server/repositories/RepositoryCursor.js';

test('repository contracts normalize list queries and return cloned page items', () => {
  const query = normalizeListQuery({ limit: '500', sort: 'unknown', filters: { mode: 'scene' } });
  assert.equal(query.limit, 50);
  assert.equal(query.sort, 'newest');
  assert.deepEqual(query.filters, { mode: 'scene' });

  const source = [{ id: 'post_1' }];
  const page = createPage(source, { hasMore: true, totalApprox: 2 });
  source[0].id = 'mutated';
  assert.equal(page.items[0].id, 'post_1');
  assert.equal(page.totalApprox, 2);
});

test('repository contracts require actor context and protect cursor scope', () => {
  assert.throws(() => assertActorContext(null), RepositoryContractError);
  const actor = assertActorContext({ userId: 'usr_demo', username: 'user_demo' });
  assert.equal(actor.userId, 'usr_demo');

  const cursor = encodeRepositoryCursor({ id: 'post_1', createdAt: '2026-07-20T00:00:00.000Z' }, 'public-posts', 'test-secret');
  assert.equal(decodeRepositoryCursor(cursor, 'public-posts', 'test-secret').id, 'post_1');
  assert.throws(() => decodeRepositoryCursor(cursor, 'another-scope', 'test-secret'));
});

test('repository cursor pagination returns stable non-overlapping pages', () => {
  const records = [
    { id: 'rec_3', createdAt: '2026-07-22T03:00:00.000Z' },
    { id: 'rec_2', createdAt: '2026-07-22T02:00:00.000Z' },
    { id: 'rec_1', createdAt: '2026-07-22T01:00:00.000Z' }
  ];
  const query = normalizeListQuery({ limit: 2 });
  const first = paginateRepositoryRecords(records, query, 'records', 'test-secret');
  assert.deepEqual(first.items.map(item => item.id), ['rec_3', 'rec_2']);
  assert.ok(first.nextCursor);

  const second = paginateRepositoryRecords(
    records,
    { ...query, cursor: first.nextCursor },
    'records',
    'test-secret'
  );
  assert.deepEqual(second.items.map(item => item.id), ['rec_1']);
});
