import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileCinematicStoryboardBatchAttempts } from '../scripts/reconcile-cinematic-storyboard-batches.js';

test('reconciles legacy Storyboard batch lineage without replacing approved sources', () => {
  const projects = {
    schemaVersion: 1,
    projects: [{
      id: 'cineproj_1', ownerUserId: 'usr_1', version: 4, generationAttempts: [],
      scenes: [{ id: 'scene_1', shots: [
        { id: 'shot_1', version: 1 },
        { id: 'shot_2', version: 2, approvedStoryboardSource: { sourceJobId: 'job_approved' } }
      ] }]
    }]
  };
  const groups = [{
    id: 'ggrp_1', groupType: 'heterogeneous_batch', actorUserId: 'usr_1',
    generationSurface: 'cinematic', createdAt: '2026-08-30T00:00:00.000Z',
    metadata: { projectId: 'cineproj_1', operation: 'cinematic_storyboard_generate_all' },
    children: [
      { jobId: 'job_1', status: 'completed', result: { imageUrl: '/outputs/job_1.jpg' } },
      { jobId: 'job_2', status: 'completed', result: { imageUrl: '/outputs/job_2.jpg' } }
    ]
  }];
  const credits = { ledgerEntries: [
    { operationType: 'reserve', relatedJobId: 'job_1', metadata: { batchId: 'ggrp_1', sceneId: 'scene_1', shotId: 'shot_1' } },
    { operationType: 'reserve', relatedJobId: 'job_2', metadata: { batchId: 'ggrp_1', sceneId: 'scene_1', shotId: 'shot_2' } }
  ] };

  assert.deepEqual(reconcileCinematicStoryboardBatchAttempts(projects, groups, credits), {
    projectsChanged: 1, attemptsAdded: 1
  });
  assert.equal(projects.projects[0].generationAttempts[0].generationJobId, 'job_1');
  assert.equal(projects.projects[0].scenes[0].shots[0].storyboardStatus, 'review');
  assert.equal(projects.projects[0].scenes[0].shots[1].approvedStoryboardSource.sourceJobId, 'job_approved');
  assert.deepEqual(reconcileCinematicStoryboardBatchAttempts(projects, groups, credits), {
    projectsChanged: 0, attemptsAdded: 0
  });
});
