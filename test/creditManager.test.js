import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CreditManager } from '../server/domain/credits/CreditManager.js';

test('serialized comparison charges create an auditable net job cost', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'credit-manager-'));
  const databaseFile = path.join(directory, 'database.json');
  await fs.writeFile(databaseFile, JSON.stringify({ users: { demo: { credits: 10, role: 'user' } } }));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const manager = new CreditManager({ databaseFile });
  await Promise.all([
    manager.deduct('demo', 2, { jobId: 'job_one', comparisonSetId: 'cmp_set_one' }),
    manager.deduct('demo', 3, { jobId: 'job_two', comparisonSetId: 'cmp_set_one' })
  ]);
  await manager.refund('demo', 2, { jobId: 'job_one', comparisonSetId: 'cmp_set_one' });
  const costs = await manager.getNetJobCosts(['job_one', 'job_two']);
  assert.equal((await manager.getUserInfo('demo')).credits, 7);
  assert.equal(costs.get('job_one'), 0);
  assert.equal(costs.get('job_two'), 3);
});

test('lost job refunds are idempotent', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'credit-manager-lost-job-'));
  const databaseFile = path.join(directory, 'database.json');
  await fs.writeFile(databaseFile, JSON.stringify({ users: { demo: { credits: 5, role: 'user' } } }));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const manager = new CreditManager({ databaseFile });
  await manager.deduct('demo', 2, { jobId: 'job_lost', comparisonSetId: 'cmp_set_one' });
  const first = await manager.refundLostJob('demo', 'job_lost', { comparisonSetId: 'cmp_set_one' });
  const second = await manager.refundLostJob('demo', 'job_lost', { comparisonSetId: 'cmp_set_one' });
  assert.equal(first.refunded, true);
  assert.equal(second.refunded, false);
  assert.equal((await manager.getUserInfo('demo')).credits, 5);
});
