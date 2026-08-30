import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CREDITS_DATA_DIR, resolveDataFile } from '../server/config/paths.js';
import { mutateJsonFile, readJsonFile } from '../server/repositories/json/jsonFileStore.js';
import { createPrefixedId } from '../server/repositories/schemaVersioning.js';

const PROJECTS_FALLBACK = { schemaVersion: 1, projects: [] };

export function reconcileCinematicStoryboardBatchAttempts(projectDatabase, groups, creditDatabase) {
  const lineageByJobId = new Map((creditDatabase.ledgerEntries || [])
    .filter(entry => entry.operationType === 'reserve' && entry.relatedJobId && entry.metadata?.batchId)
    .map(entry => [entry.relatedJobId, entry.metadata]));
  let projectsChanged = 0;
  let attemptsAdded = 0;

  for (const group of groups || []) {
    if (group.groupType !== 'heterogeneous_batch'
      || group.generationSurface !== 'cinematic'
      || group.metadata?.operation !== 'cinematic_storyboard_generate_all') continue;
    const project = projectDatabase.projects?.find(item => (
      item.id === group.metadata?.projectId && item.ownerUserId === group.actorUserId
    ));
    if (!project) continue;
    project.generationAttempts ||= [];
    let changed = false;
    for (const child of group.children || []) {
      if (project.generationAttempts.some(attempt => attempt.generationJobId === child.jobId)) continue;
      const lineage = lineageByJobId.get(child.jobId) || child;
      if (!lineage.sceneId || !lineage.shotId || lineage.batchId && lineage.batchId !== group.id) continue;
      const scene = project.scenes?.find(item => item.id === lineage.sceneId);
      const shot = scene?.shots?.find(item => item.id === lineage.shotId);
      if (!scene || !shot || shot.approvedStoryboardSource) continue;
      project.generationAttempts.push({
        id: createPrefixedId('cineattempt'),
        operation: 'cinematic_storyboard_still',
        batchId: group.id,
        sceneId: scene.id,
        shotId: shot.id,
        attemptNumber: project.generationAttempts.filter(item => (
          item.shotId === shot.id && item.operation === 'cinematic_storyboard_still'
        )).length + 1,
        parentAttemptId: shot.approvedStoryboardAttemptId || null,
        generationJobId: child.jobId,
        quoteId: child.estimateId || null,
        outputAssetIds: [],
        status: child.status || 'queued',
        reviewDecision: 'pending',
        createdAt: group.createdAt || new Date().toISOString()
      });
      shot.storyboardStatus = child.status === 'completed'
        ? 'review'
        : child.status === 'failed' ? 'warning' : 'generating';
      attemptsAdded += 1;
      changed = true;
    }
    if (changed) {
      project.version = Number(project.version || 1) + 1;
      project.updatedAt = new Date().toISOString();
      projectsChanged += 1;
    }
  }
  return { projectsChanged, attemptsAdded };
}

async function main() {
  const groups = await readJsonFile(resolveDataFile('generationGroups'), []);
  const credits = await readJsonFile(path.resolve(CREDITS_DATA_DIR, 'database.json'), {});
  let result = { projectsChanged: 0, attemptsAdded: 0 };
  await mutateJsonFile(resolveDataFile('cinematicProjects'), PROJECTS_FALLBACK, projects => {
    result = reconcileCinematicStoryboardBatchAttempts(projects, groups, credits);
    return result;
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
