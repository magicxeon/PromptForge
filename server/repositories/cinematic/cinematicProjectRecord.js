import { createPrefixedId } from '../schemaVersioning.js';

export const CINEMATIC_AUTHORING_CONTRACT_VERSION = 'cinematic-authoring-v1';

export function createCinematicProjectRecord(input, actor) {
  const now = new Date().toISOString();
  const id = createPrefixedId('cineproj');
  const storySourceId = createPrefixedId('cinesrc');
  const project = normalizeCinematicAuthoringEnvelope({
    id,
    projectId: id,
    schemaVersion: 1,
    version: 1,
    ownerUserId: actor.userId,
    ownerUsername: actor.username,
    title: input.title,
    format: 'short-film',
    platformTargets: [input.platform],
    aspectRatio: '9:16',
    durationTargetMs: input.durationSeconds * 1000,
    activeStage: 'setup',
    status: 'draft',
    setup: structuredClone(input),
    storySourceVersions: [{
      id: storySourceId,
      version: 1,
      storyBrief: input.storyBrief,
      creativeDirection: input.creativeDirection,
      status: 'applied',
      source: 'manual',
      createdAt: now
    }],
    activeStorySourceVersionId: storySourceId,
    castAssignments: [],
    storyPlanVersions: [],
    scenes: [],
    generationAttempts: [],
    timelineVersions: [],
    commandReceipts: [],
    activeStoryPlanVersionId: null,
    activeTimelineVersionId: null,
    createdAt: now,
    updatedAt: now,
    archivedAt: null
  }, { newRecord: true });

  return project;
}


export function normalizeCinematicAuthoringEnvelope(project, { newRecord = false } = {}) {
  if (!project || typeof project !== 'object') return project;
  if (project.authoringContractVersion !== CINEMATIC_AUTHORING_CONTRACT_VERSION) {
    project.authoringContractVersion = CINEMATIC_AUTHORING_CONTRACT_VERSION;
  }
  if (!project.authoringState || typeof project.authoringState !== 'object' || Array.isArray(project.authoringState)) {
    project.authoringState = {
      inferenceMode: newRecord ? 'explicit' : 'legacy',
      fieldStates: {}
    };
  }
  if (!['explicit', 'legacy'].includes(project.authoringState.inferenceMode)) {
    project.authoringState.inferenceMode = newRecord ? 'explicit' : 'legacy';
  }
  if (!project.authoringState.fieldStates || typeof project.authoringState.fieldStates !== 'object'
    || Array.isArray(project.authoringState.fieldStates)) {
    project.authoringState.fieldStates = {};
  }
  return project;
}
