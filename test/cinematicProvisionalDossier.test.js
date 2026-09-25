import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { CinematicProjectRepository } from '../server/repositories/cinematic/CinematicProjectRepository.js';

const actor = { userId: 'dossier-owner', username: 'dossier-owner', role: 'user' };

test('Rewamp Story planning uses stable provisional text dossiers without requiring a final Look', async t => {
  const previous = process.env.CINEMATIC_REWAMP_ENABLED;
  process.env.CINEMATIC_REWAMP_ENABLED = 'true';
  t.after(() => {
    if (previous === undefined) delete process.env.CINEMATIC_REWAMP_ENABLED;
    else process.env.CINEMATIC_REWAMP_ENABLED = previous;
  });
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-dossier-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const repository = new CinematicProjectRepository({ projectsFile: path.join(root, 'projects.json') });
  let planningProject = null;
  const service = new CinematicApplicationService({
    repository,
    characterAuthorizationService: {
      validateGenerationContext: async () => ({
        displayNameSnapshot: 'Mali', authorizedCharacterFaceReferenceUrl: '/mali.png',
        identityPack: { status: 'identity_pack_ready', characterType: 'human', outfitBehavior: 'locked', identityPolicyVersion: 'v1' },
        attribution: { ownerUserId: actor.userId, ownerUsername: actor.username }
      })
    },
    storyPlanService: {
      generatePlan(project) { planningProject = structuredClone(project); return { source: 'generated' }; }
    }
  });
  const project = await service.createProject({
    title: 'One chapter', storyBrief: 'Two strangers meet during a storm.', creativeDirection: '',
    durationSeconds: 60, platform: 'tiktok', castPlanningMode: 'solo'
  }, actor);

  await service.generateStoryPlan(project.id, { mode: 'generate' }, actor);

  assert.equal(planningProject.castAssignments.length, 1);
  assert.equal(planningProject.castAssignments[0].sourceType, 'dossier');
  assert.equal(planningProject.castAssignments[0].storyRoleSlotId, planningProject.setup.storyRoleSlots[0].id);
  assert.equal(planningProject.castAssignments[0].looks.length, 0);
  assert.equal(planningProject.castAssignments[0].identityReady, false);
  const dossierId = planningProject.castAssignments[0].id;
  await repository.mutateForActor(project.id, actor, draft => {
    draft.castAssignments = structuredClone(planningProject.castAssignments);
  });
  const bound = await service.upsertCastAssignment(project.id, {
    expectedVersion: project.version,
    assignmentId: 'temporary-client-id',
    sourceType: 'character',
    characterProfileId: 'character-mali',
    characterProfileVersionId: 'character-mali-v1',
    displayName: 'Mali',
    storyRoleSlotId: planningProject.setup.storyRoleSlots[0].id,
    storyRole: 'Lead', storyImportance: 'protagonist'
  }, actor);
  assert.equal(bound.castAssignments.length, 1);
  assert.equal(bound.castAssignments[0].id, dossierId);
  assert.equal(bound.castAssignments[0].sourceType, 'character');
  assert.equal(bound.castAssignments[0].identityReady, true);
  const repeated = await service.generateStoryPlan(project.id, { mode: 'generate' }, actor);
  assert.deepEqual(repeated, { source: 'generated' });
  assert.equal(planningProject.castAssignments[0].id.startsWith('cinedossier_'), true);
});
