import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  PromptRefinementAuditRepository
} from '../server/repositories/generation/PromptRefinementAuditRepository.js';

test('prompt refinement audit writes a private JSON record named by job ID', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-prompt-audit-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const repository = new PromptRefinementAuditRepository({ directory, maxFiles: 10 });

  const filePath = await repository.write('job_test_123', {
    status: 'refined',
    beforePrompt: 'before',
    afterPrompt: 'after'
  });
  const record = JSON.parse(await fs.readFile(filePath, 'utf8'));

  assert.equal(path.basename(filePath), 'job_test_123.json');
  assert.equal(record.jobId, 'job_test_123');
  assert.equal(record.beforePrompt, 'before');
  assert.equal(record.afterPrompt, 'after');
});

test('prompt refinement audit rejects unsafe job IDs', async () => {
  const repository = new PromptRefinementAuditRepository({
    directory: path.join(os.tmpdir(), 'mpf-prompt-audit-safe')
  });
  assert.equal(await repository.write('../escape', { status: 'refined' }), null);
});
