import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';
import {
  assertActorContext,
  createPage,
  normalizeListQuery,
  RepositoryContractError
} from '../repositoryContracts.js';
import { paginateRepositoryRecords } from '../RepositoryCursor.js';
import { createCinematicProjectRecord, normalizeCinematicAuthoringEnvelope } from './cinematicProjectRecord.js';

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
    const projects = data.projects.filter(project => (
      project.ownerUserId === actor.userId && project.status !== 'archived'
    ));
    const records = toProjectLibraryRecords(
      projects,
      (data.series || []).filter(series => series.ownerUserId === actor.userId)
    );
    const page = paginateRepositoryRecords(
      records,
      normalizedQuery,
      JSON.stringify({ ownerUserId: actor.userId, sort: normalizedQuery.sort }),
      this.cursorSecret
    );
    return createPage(page.items.map(record => record.summary), page);
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
    const project = createCinematicProjectRecord(input, actor);
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
      const draft = normalizeLegacyProject(structuredClone(data.projects[index]));
      const result = await operation(draft);
      draft.updatedAt = new Date().toISOString();
      data.projects[index] = draft;
      return structuredClone(result === undefined ? draft : result);
    });
  }

  async readSeriesWorkspaceForActor(actorContext) {
    const actor = assertActorContext(actorContext);
    const data = await this.#read();
    return structuredClone({
      projects: data.projects.filter(project => project.ownerUserId === actor.userId),
      series: (data.series || []).filter(series => series.ownerUserId === actor.userId)
    });
  }

  async mutateSeriesWorkspaceForActor(actorContext, operation) {
    const actor = assertActorContext(actorContext);
    return mutateJsonFile(this.projectsFile, FALLBACK, async data => {
      assertStore(data);
      const owned = structuredClone({
        projects: data.projects.filter(project => project.ownerUserId === actor.userId),
        series: (data.series || []).filter(series => series.ownerUserId === actor.userId)
      });
      const result = await operation(owned);
      if ([...owned.projects, ...owned.series].some(record => record.ownerUserId !== actor.userId)) {
        throw new RepositoryContractError('cinematic_owner_invalid', 'Invalid workspace owner.', 403);
      }
      data.projects = [...owned.projects, ...data.projects.filter(project => project.ownerUserId !== actor.userId)];
      data.series = [...owned.series, ...(data.series || []).filter(series => series.ownerUserId !== actor.userId)];
      return structuredClone(result);
    });
  }

  async #read() {
    const data = await readJsonFile(this.projectsFile, FALLBACK);
    assertStore(data);
    data.projects.forEach(normalizeLegacyProject);
    return data;
  }
}

export function normalizeLegacyProject(project) {
  normalizeCinematicAuthoringEnvelope(project);
  if (project?.status === 'storyboarding') project.status = 'planned';
  if (project?.status === 'planned' && project.storyPlanVersions?.length) {
    const activePlan = project.storyPlanVersions.find(version => version.id === project.activeStoryPlanVersionId);
    if (!activePlan || activePlan.status !== 'approved' || activePlan.storySourceVersionId !== project.activeStorySourceVersionId) {
      project.status = 'planning';
    }
  }
  for (const scene of project?.scenes || []) {
    for (const shot of scene.shots || []) {
      if (shot.approvedStoryboardSource === null) delete shot.approvedStoryboardSource;
      if (shot.approvedStoryboardAttemptId === null) delete shot.approvedStoryboardAttemptId;
      if (!shot.shotDocument && (shot.prompt || shot.purpose)) {
        shot.source ||= 'legacy';
        shot.shotDocumentVersion ||= 1;
      }
    }
  }
  return project;
}

function assertStore(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.projects)) {
    throw new TypeError('Cinematic data must contain a projects array.');
  }
}

export function toProjectSummary(project) {
  return {
    projectId: project.id,
    ownerUserId: project.ownerUserId,
    title: project.title,
    activeStage: project.activeStage,
    durationSeconds: Math.round(project.durationTargetMs / 1000),
    status: project.status,
    updatedAt: project.updatedAt,
    ...(project.seriesMembership ? { seriesMembership: structuredClone(project.seriesMembership) } : {})
  };
}

export function toProjectLibraryRecords(projects, series) {
  const seriesById = new Map(series.map(item => [item.id, item]));
  const grouped = new Map();
  const standalone = [];

  for (const project of projects) {
    const seriesId = project.seriesMembership?.seriesId;
    if (!seriesId || !seriesById.has(seriesId)) {
      standalone.push(toProjectLibraryRecord([project], null));
      continue;
    }
    const chapters = grouped.get(seriesId) || [];
    chapters.push(project);
    grouped.set(seriesId, chapters);
  }

  const groupedRecords = [...grouped.entries()].map(([seriesId, chapters]) => (
    toProjectLibraryRecord(chapters, seriesById.get(seriesId))
  ));
  return [...standalone, ...groupedRecords];
}

function toProjectLibraryRecord(chapters, series) {
  const ordered = [...chapters].sort((left, right) => (
    (Date.parse(right.updatedAt || '') || 0) - (Date.parse(left.updatedAt || '') || 0)
  ));
  const resumeProject = ordered[0];
  const briefProject = [...chapters].sort((left, right) => (
    (left.seriesMembership?.chapterNumber || Number.MAX_SAFE_INTEGER)
      - (right.seriesMembership?.chapterNumber || Number.MAX_SAFE_INTEGER)
    || (Date.parse(left.createdAt || '') || 0) - (Date.parse(right.createdAt || '') || 0)
  ))[0] || resumeProject;
  const productionProjectId = series?.id || resumeProject.id;
  const progress = clipProgress(chapters);
  const summary = {
    ...toProjectSummary(briefProject),
    productionProjectId,
    chapterId: resumeProject.id,
    productionUnitId: resumeProject.id,
    chapterTitle: resumeProject.title,
    chapterCount: chapters.length,
    title: series?.title || resumeProject.title,
    thumbnailUrl: safeProjectThumbnail(chapters),
    progress,
    resumeContext: {
      productionProjectId,
      chapterId: resumeProject.id,
      productionUnitId: resumeProject.id,
      stage: resumeProject.activeStage
    }
  };
  const updatedAt = ordered.reduce((latest, chapter) => (
    Date.parse(chapter.updatedAt || '') > Date.parse(latest || '') ? chapter.updatedAt : latest
  ), series?.updatedAt || resumeProject.updatedAt);
  summary.updatedAt = updatedAt;
  return {
    id: productionProjectId,
    createdAt: series?.createdAt || resumeProject.createdAt,
    updatedAt,
    summary
  };
}

function clipProgress(projects) {
  let approvedClipCount = 0;
  let totalClipCount = 0;
  for (const project of projects) {
    const attempts = new Map((project.generationAttempts || []).map(item => [item.id, item]));
    for (const scene of project.scenes || []) {
      for (const shot of scene.shots || []) {
        totalClipCount += 1;
        const attempt = attempts.get(shot.approvedVideoAttemptId);
        if (attempt && attempt.reviewDecision === 'approved'
          && ['approved', 'completed'].includes(attempt.status)
          && attempt.downstreamSourceStatus !== 'source_changed') {
          approvedClipCount += 1;
        }
      }
    }
  }
  return { approvedClipCount, totalClipCount };
}

function safeProjectThumbnail(projects) {
  for (const project of projects) {
    for (const scene of project.scenes || []) {
      for (const shot of scene.shots || []) {
        const candidate = shot.approvedStoryboardSource?.thumbnailUrl
          || shot.approvedStoryboardSource?.imageUrl;
        if (typeof candidate === 'string' && /^\/(?:api|outputs)\//.test(candidate)) return candidate;
      }
    }
  }
  return null;
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
