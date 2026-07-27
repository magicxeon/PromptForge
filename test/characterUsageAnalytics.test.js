import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CharacterUsageRepository } from '../server/repositories/character-profiles/CharacterUsageRepository.js';

test('Character usage events are idempotent and aggregate successful outputs', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-character-usage-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const repository = new CharacterUsageRepository({ usageFile: path.join(dir, 'usage.json') });
  const base = {
    characterProfileId: 'charprof_1',
    characterProfileVersionId: 'charver_1',
    consumerUserId: 'usr_viewer',
    sourceType: 'fashion_blueprint',
    generationJobId: 'job_1',
    successfulOutputCount: 1,
    useCase: 'fashion',
    idempotencyKey: 'character-usage:job_1:charprof_1'
  };
  await repository.createIdempotent(base);
  await repository.createIdempotent(base);
  await repository.createIdempotent({
    ...base,
    generationJobId: 'job_2',
    useCase: 'scene_story',
    idempotencyKey: 'character-usage:job_2:charprof_1'
  });
  const stats = await repository.aggregate('charprof_1');
  assert.equal(stats.totalOutputs, 2);
  assert.equal(stats.byUseCase.fashion, 1);
  assert.equal(stats.byUseCase.sceneStory, 1);
});
