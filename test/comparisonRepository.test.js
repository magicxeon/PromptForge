import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ComparisonRepository } from '../server/comparison/ComparisonRepository.js';

async function createRepository() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'comparison-repository-'));
  const repository = new ComparisonRepository({ comparisonsFile: path.join(directory, 'comparisons.json') });
  await repository.init();
  return { repository, directory };
}

function run(idempotencyKey = 'comparison_key_123') {
  return {
    idempotencyKey,
    status: 'queued',
    slots: [
      { id: 'one', jobId: null, status: 'queued' },
      { id: 'two', jobId: null, status: 'queued' }
    ],
    createdAt: Date.now()
  };
}

test('comparison repository persists an idempotent set and run', async t => {
  const { repository, directory } = await createRepository();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const first = await repository.createSetWithRun({
    username: 'user_demo', name: 'Test', description: '', idempotencyKey: 'comparison_key_123', run: run()
  });
  const replay = await repository.createSetWithRun({
    username: 'user_demo', name: 'Duplicate', description: '', idempotencyKey: 'comparison_key_123', run: run()
  });
  assert.equal(first.created, true);
  assert.equal(replay.created, false);
  assert.equal(replay.set.id, first.set.id);
  assert.equal((await repository.list('user_demo')).length, 1);
});

test('serialized slot updates do not overwrite sibling results', async t => {
  const { repository, directory } = await createRepository();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const created = await repository.createSetWithRun({
    username: 'user_demo', name: 'Concurrent', description: '', idempotencyKey: 'comparison_key_123', run: run()
  });
  await Promise.all([
    repository.updateRun(created.set.id, created.run.id, target => { target.slots[0].jobId = 'job_one'; }),
    repository.updateRun(created.set.id, created.run.id, target => { target.slots[1].jobId = 'job_two'; })
  ]);
  const set = await repository.get(created.set.id, 'user_demo');
  assert.deepEqual(set.runs[0].slots.map(slot => slot.jobId), ['job_one', 'job_two']);
});

test('history cleanup clears a comparison winner without deleting the set', async t => {
  const { repository, directory } = await createRepository();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const created = await repository.createSetWithRun({
    username: 'user_demo', name: 'Winner', description: '', idempotencyKey: 'comparison_key_123', run: run()
  });
  await repository.updateRun(created.set.id, created.run.id, target => {
    target.slots[0].jobId = 'job_winner';
    target.slots[0].status = 'completed';
    target.slots[0].result = { imageUrl: '/outputs/test.png' };
  });
  await repository.setWinner(created.set.id, 'user_demo', 'job_winner');
  await repository.removeHistoryJob('job_winner');
  const set = await repository.get(created.set.id, 'user_demo');
  assert.equal(set.winnerJobId, null);
  assert.equal(set.runs[0].slots[0].result, null);
});
