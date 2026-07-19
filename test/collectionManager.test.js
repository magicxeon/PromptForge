import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CollectionManager, CollectionError } from '../server/domain/collections/CollectionManager.js';

async function createFixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'model-prompt-forge-collections-'));
  const collectionsFile = path.join(directory, 'collections.json');
  const historyFile = path.join(directory, 'history.json');
  await fs.writeFile(historyFile, JSON.stringify([
    { id: 'job_100_a', imageUrl: '/outputs/job_100_a.png' },
    { id: 'job_200_b', imageUrl: '/outputs/job_200_b.png' }
  ]));
  const manager = new CollectionManager({ collectionsFile, historyFile });
  await manager.init();
  return {
    directory,
    manager,
    cleanup: () => fs.rm(directory, { recursive: true, force: true })
  };
}

test('creates, updates, and persists a default collection', async t => {
  const fixture = await createFixture();
  t.after(fixture.cleanup);
  const created = await fixture.manager.create({
    name: 'Story Cast',
    description: 'Related characters',
    setAsDefault: true
  });
  assert.equal(created.isDefault, true);
  const listed = await fixture.manager.list();
  assert.equal(listed.defaultCollectionId, created.id);
  assert.equal(listed.collections[0].name, 'Story Cast');
});

test('validates required fields and unknown history IDs', async t => {
  const fixture = await createFixture();
  t.after(fixture.cleanup);
  await assert.rejects(
    fixture.manager.create({ name: '   ' }),
    error => error instanceof CollectionError && error.code === 'invalid_field'
  );
  const collection = await fixture.manager.create({ name: 'Valid' });
  await assert.rejects(
    fixture.manager.addImages(collection.id, ['job_999_missing']),
    error => error instanceof CollectionError && error.status === 404
  );
});

test('membership is idempotent and cover falls back after removal', async t => {
  const fixture = await createFixture();
  t.after(fixture.cleanup);
  const collection = await fixture.manager.create({ name: 'Cast' });
  await fixture.manager.addImages(collection.id, ['job_100_a', 'job_100_a', 'job_200_b']);
  let detail = await fixture.manager.get(collection.id);
  assert.deepEqual(detail.collection.jobIds, ['job_100_a', 'job_200_b']);
  assert.equal(detail.collection.coverJobId, 'job_100_a');
  await fixture.manager.removeImage(collection.id, 'job_100_a');
  detail = await fixture.manager.get(collection.id);
  assert.equal(detail.collection.coverJobId, 'job_200_b');
});

test('serialized concurrent mutations do not lose membership updates', async t => {
  const fixture = await createFixture();
  t.after(fixture.cleanup);
  const collection = await fixture.manager.create({ name: 'Concurrent' });
  await Promise.all([
    fixture.manager.addImages(collection.id, ['job_100_a']),
    fixture.manager.addImages(collection.id, ['job_200_b'])
  ]);
  const detail = await fixture.manager.get(collection.id);
  assert.deepEqual(new Set(detail.collection.jobIds), new Set(['job_100_a', 'job_200_b']));
});

test('history cleanup removes memberships and repairs cover', async t => {
  const fixture = await createFixture();
  t.after(fixture.cleanup);
  const collection = await fixture.manager.create({ name: 'Cleanup', setAsDefault: true });
  await fixture.manager.addImages(collection.id, ['job_100_a', 'job_200_b']);
  await fixture.manager.removeJobEverywhere('job_100_a');
  const detail = await fixture.manager.get(collection.id);
  assert.deepEqual(detail.collection.jobIds, ['job_200_b']);
  assert.equal(detail.collection.coverJobId, 'job_200_b');
});
