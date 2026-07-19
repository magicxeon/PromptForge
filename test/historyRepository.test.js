import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { HistoryCursorError, HistoryRepository } from '../server/repositories/generation/HistoryRepository.js';

async function createRepository() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'history-repository-'));
  const historyFile = path.join(directory, 'history.json');
  const history = Array.from({ length: 7 }, (_, index) => ({
    id: `job_${String(index).padStart(2, '0')}`,
    timestamp: index < 2 ? 100 : 100 - index,
    imageUrl: `/outputs/job_${index}.png`
  }));
  await fs.writeFile(historyFile, JSON.stringify(history), 'utf8');
  return {
    directory,
    repository: new HistoryRepository({ historyFile, cursorSecret: 'test-secret' })
  };
}

test('history cursor pagination is stable and has no duplicate records', async t => {
  const { directory, repository } = await createRepository();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const first = await repository.listPage({ limit: 3 });
  const second = await repository.listPage({ limit: 3, cursor: first.nextCursor });
  const ids = [...first.items, ...second.items].map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(first.items.length, 3);
  assert.equal(second.items.length, 3);
  assert.equal(first.hasMore, true);
});

test('history cursor is scoped to the active collection', async t => {
  const { directory, repository } = await createRepository();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const first = await repository.listPage({ limit: 2, collectionId: 'collection-a' });
  await assert.rejects(
    repository.listPage({ limit: 2, collectionId: 'collection-b', cursor: first.nextCursor }),
    HistoryCursorError
  );
});

test('history collection pagination filters before applying its limit', async t => {
  const { directory, repository } = await createRepository();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const page = await repository.listPage({
    limit: 2,
    collectionId: 'collection-a',
    allowedJobIds: new Set(['job_01', 'job_04', 'job_06'])
  });
  assert.deepEqual(page.items.map(item => item.id), ['job_01', 'job_04']);
  assert.equal(page.hasMore, true);
});
