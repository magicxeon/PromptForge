import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { VideoProviderTaskRepository } from '../server/repositories/generation/VideoProviderTaskRepository.js';
import { VideoGenerationApplicationService } from '../server/domain/generation/VideoGenerationApplicationService.js';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { createSingleCharacterCinematicProject } from './fixtures/cinematic/cinematicProjectFixtures.js';

test('previous takes: bounded owner summaries restore output without changing project selection or writing data', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-takes-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const tasks = new VideoProviderTaskRepository({ tasksFile: path.join(dir, 'tasks.json') });
  const actor = { userId: 'owner', username: 'owner' };
  await tasks.createAccepted({ id: 'videotask_old', ownerUserId: actor.userId, idempotencyKey: 'old', status: 'completed', billingStatus: 'captured', outputAsset: { publicUrl: '/outputs/old.mp4' } });
  await tasks.createAccepted({ id: 'videotask_private', ownerUserId: 'other', idempotencyKey: 'other', status: 'completed', outputAsset: { publicUrl: '/outputs/private.mp4' } });
  const project = createSingleCharacterCinematicProject();
  project.generationAttempts = [
    { id: 'attempt_old', shotId: 'removed-shot', generationJobId: 'videotask_old', status: 'provider_queued' },
    { id: 'attempt_approved', shotId: project.scenes[0].shots[0].id, generationJobId: 'videotask_old', status: 'approved' },
    { id: 'attempt_other', shotId: 'removed-shot', generationJobId: 'videotask_private', status: 'pending' }
  ];
  const before = structuredClone(project);
  const service = new CinematicApplicationService({ repository: { findForActor: async () => structuredClone(project) },
    videoGenerationService: new VideoGenerationApplicationService({ taskRepository: tasks }) });
  const result = await service.getProject(project.id, actor);
  assert.equal(result.generationAttempts[0].status, 'completed');
  assert.equal(result.generationAttempts[0].outputAsset.publicUrl, '/outputs/old.mp4');
  assert.equal(result.generationAttempts[1].status, 'approved');
  assert.equal(result.generationAttempts[2].outputAsset, undefined);
  assert.deepEqual(project, before);
  assert.equal((await tasks.findManyForActor(['videotask_private'], actor)).length, 0);
});
