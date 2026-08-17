import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';
import {
  assertActorContext,
  createPage,
  normalizeListQuery,
  RepositoryContractError
} from '../repositoryContracts.js';
import { paginateRepositoryRecords } from '../RepositoryCursor.js';
import { createPrefixedId } from '../schemaVersioning.js';

const FALLBACK = { schemaVersion: 1, projects: [] };

export class CinematicProjectRepository {
  constructor({
    projectsFile = resolveDataFile('cinematicProjects'),
    cursorSecret = process.env.CINEMATIC_CURSOR_SECRET || 'local-cinematic-cursor'
  } = {}) {
    this.projectsFile = projectsFile;
    this.cursorSecret = cursorSecret;
  }

  async listForActor(actorContext, query = {}) {
    const actor = assertActorContext(actorContext);
    const normalizedQuery = normalizeListQuery(query, { defaultLimit: 12, maxLimit: 50 });
    const data = await this.#read();
    const records = data.projects.filter(project => (
      project.ownerUserId === actor.userId && project.status !== 'archived'
    ));
    const page = paginateRepositoryRecords(
      records,
      normalizedQuery,
      JSON.stringify({ ownerUserId: actor.userId, sort: normalizedQuery.sort }),
      this.cursorSecret
    );
    return createPage(page.items.map(toProjectSummary), page);
  }

  async findForActor(projectId, actorContext) {
    const actor = assertActorContext(actorContext);
    const data = await this.#read();
    const project = data.projects.find(item => item.id === projectId && item.ownerUserId === actor.userId);
    return project ? structuredClone(project) : null;
  }

  async searchOperational(query = {}) {
    const normalizedQuery = normalizeListQuery(query, { defaultLimit: 20, maxLimit: 100 });
    const search = String(query.search || '').trim().toLowerCase();
    const status = String(query.status || '').trim();
    const data = await this.#read();
    const records = data.projects.filter(project => (
      (!status || project.status === status)
      && (!search || operationalTokens(project).some(token => token.includes(search)))
    ));
    const page = paginateRepositoryRecords(
      records,
      normalizedQuery,
      JSON.stringify({ search, status, sort: normalizedQuery.sort }),
      this.cursorSecret
    );
    return createPage(page.items.map(toOperationalSummary), page);
  }

  async findOperational(projectId) {
    const data = await this.#read();
    const project = data.projects.find(item => item.id === projectId);
    return project ? structuredClone(project) : null;
  }

  async create(input, actorContext) {
    const actor = assertActorContext(actorContext);
    const now = new Date().toISOString();
    const id = createPrefixedId('cineproj');
    const storySourceId = createPrefixedId('cinesrc');
    const project = {
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
    };

    return mutateJsonFile(this.projectsFile, FALLBACK, data => {
      assertStore(data);
      data.projects.unshift(project);
      return structuredClone(project);
    });
  }

  async mutateForActor(projectId, actorContext, operation) {
    const actor = assertActorContext(actorContext);
    return mutateJsonFile(this.projectsFile, FALLBACK, async data => {
      assertStore(data);
      const index = data.projects.findIndex(item => item.id === projectId && item.ownerUserId === actor.userId);
      if (index === -1) {
        throw new RepositoryContractError('cinematic_project_not_found', 'Cinematic Project not found.', 404);
      }
      const draft = structuredClone(data.projects[index]);
      const result = await operation(draft);
      draft.updatedAt = new Date().toISOString();
      data.projects[index] = draft;
      return structuredClone(result === undefined ? draft : result);
    });
  }

  async #read() {
    const data = await readJsonFile(this.projectsFile, FALLBACK);
    assertStore(data);
    return data;
  }
}

function assertStore(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.projects)) {
    throw new TypeError('Cinematic data must contain a projects array.');
  }
}

function toProjectSummary(project) {
  return {
    projectId: project.id,
    ownerUserId: project.ownerUserId,
    title: project.title,
    activeStage: project.activeStage,
    durationSeconds: Math.round(project.durationTargetMs / 1000),
    status: project.status,
    updatedAt: project.updatedAt
  };
}

function toOperationalSummary(project) {
  return {
    ...toProjectSummary(project),
    ownerUsername: project.ownerUsername,
    sceneCount: project.scenes?.length || 0,
    shotCount: (project.scenes || []).reduce((total, scene) => total + (scene.shots?.length || 0), 0),
    attemptCount: project.generationAttempts?.length || 0,
    staleAttemptCount: (project.generationAttempts || []).filter(attempt => attempt.downstreamSourceStatus === 'source_changed').length
  };
}

function operationalTokens(project) {
  const tokens = [project.id, project.ownerUserId, project.ownerUsername, project.title];
  for (const scene of project.scenes || []) {
    tokens.push(scene.id);
    for (const shot of scene.shots || []) tokens.push(shot.id, shot.approvedStoryboardSource?.assetId, shot.approvedStoryboardSource?.sourceJobId);
  }
  for (const attempt of project.generationAttempts || []) {
    tokens.push(attempt.id, attempt.generationJobId, attempt.providerTaskId, attempt.quoteId, attempt.reservationId, attempt.settlementId);
  }
  return tokens.filter(Boolean).map(token => String(token).toLowerCase());
}

export const cinematicProjectRepository = new CinematicProjectRepository();
