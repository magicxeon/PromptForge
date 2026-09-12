import { createPrefixedId } from '../../repositories/schemaVersioning.js';
import { RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { createCinematicProjectRecord } from '../../repositories/cinematic/cinematicProjectRecord.js';
import { normalizeLegacyProject, toProjectSummary } from '../../repositories/cinematic/CinematicProjectRepository.js';

export class CinematicSeriesService {
  constructor({ repository, normalizeSetup }) { Object.assign(this, { repository, normalizeSetup }); }

  async getWorkspace(projectId, actor) {
    const data = await this.repository.readSeriesWorkspaceForActor(actor);
    const project = findProject(data, projectId);
    return project.seriesMembership ? workspace(data, findSeries(data, project.seriesMembership.seriesId)) : { series: null, chapters: [] };
  }

  createFromProject(projectId, input, actor) {
    const title = validTitle(input.title);
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const project = findProject(data, projectId);
      assertVersion(project, input.expectedProjectVersion);
      if (project.seriesMembership) fail('cinematic_series_already_assigned', 'This Chapter already belongs to a Series.', 409);
      if (data.series.length >= 50) fail('cinematic_series_limit', 'The Series limit has been reached.');
      const now = new Date().toISOString();
      const series = { id: createPrefixedId('cineseries'), ownerUserId: actor.userId, title, version: 1,
        seasons: [{ id: createPrefixedId('cineseason'), number: 1, title: '' }], createdAt: now, updatedAt: now };
      data.series.unshift(series);
      project.seriesMembership = { seriesId: series.id, seasonId: series.seasons[0].id, chapterNumber: 1 };
      project.version += 1; project.updatedAt = now;
      return { project, workspace: workspace(data, series) };
    });
  }

  update(seriesId, input, actor) {
    const title = validTitle(input.title);
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const series = findSeries(data, seriesId);
      assertVersion(series, input.expectedVersion);
      if (input.seasonId) findSeason(series, input.seasonId).title = title;
      else series.title = title;
      touch(series);
      return workspace(data, series);
    });
  }

  addSeason(seriesId, input, actor) {
    const title = input.title === '' || input.title === undefined ? '' : validTitle(input.title);
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const series = findSeries(data, seriesId);
      assertVersion(series, input.expectedVersion);
      if (series.seasons.length >= 24) fail('cinematic_series_limit', 'A Series supports at most 24 Seasons.');
      series.seasons.push({ id: createPrefixedId('cineseason'), number: Math.max(0, ...series.seasons.map(item => item.number)) + 1, title });
      touch(series);
      return workspace(data, series);
    });
  }

  addChapter(seriesId, input, actor) {
    validTitle(input.title);
    if (typeof input.copyCast !== 'boolean') fail('cinematic_series_input_invalid', 'Choose whether to copy Cast and Looks.');
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const series = findSeries(data, seriesId);
      assertVersion(series, input.expectedVersion);
      const season = findSeason(series, input.seasonId);
      const source = findProject(data, input.sourceProjectId);
      assertVersion(source, input.expectedProjectVersion);
      if (source.seriesMembership?.seriesId !== series.id) fail('cinematic_project_not_found', 'Source Chapter not found.', 404);
      const chapters = data.projects.filter(project => project.seriesMembership?.seriesId === series.id);
      if (chapters.length >= 120) fail('cinematic_series_limit', 'A Series supports at most 120 Chapters.');
      const setup = this.normalizeSetup({ ...source.setup, title: input.title, storyBrief: input.storyBrief });
      const project = createCinematicProjectRecord(setup, actor);
      project.seriesMembership = { seriesId, seasonId: season.id,
        chapterNumber: Math.max(0, ...chapters.filter(item => item.seriesMembership.seasonId === season.id).map(item => item.seriesMembership.chapterNumber)) + 1 };
      project.chapterOrigin = { projectId: source.id, projectVersion: source.version, copiedCast: input.copyCast };
      if (input.copyCast) {
        // Fresh local binding IDs; source Character/Asset version authority stays pinned.
        project.castAssignments = (source.castAssignments || []).filter(item => item.active !== false).map(item => ({
          ...structuredClone(item), id: createPrefixedId('cinecast'), updatedAt: project.createdAt,
          looks: (item.looks || []).map(look => ({ ...structuredClone(look), id: createPrefixedId('cinelook') }))
        }));
      }
      data.projects.unshift(project);
      touch(series);
      return { project, workspace: workspace(data, series) };
    });
  }
}

function workspace(data, series) {
  const seasons = new Map(series.seasons.map(item => [item.id, item.number]));
  return { series, chapters: data.projects.filter(project => project.status !== 'archived' && project.seriesMembership?.seriesId === series.id)
    .sort((a, b) => (seasons.get(a.seriesMembership.seasonId) - seasons.get(b.seriesMembership.seasonId))
      || a.seriesMembership.chapterNumber - b.seriesMembership.chapterNumber).map(project => toProjectSummary(normalizeLegacyProject(structuredClone(project)))) };
}
function findProject(data, id) {
  const project = data.projects.find(item => item.id === id && item.status !== 'archived');
  if (!project) fail('cinematic_project_not_found', 'Cinematic Project not found.', 404);
  return project;
}
function findSeries(data, id) {
  const series = data.series.find(item => item.id === id);
  if (!series) fail('cinematic_series_not_found', 'Series not found.', 404);
  return series;
}
function findSeason(series, id) {
  const season = series.seasons.find(item => item.id === id);
  if (!season) fail('cinematic_season_not_found', 'Season not found.', 404);
  return season;
}
function validTitle(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) fail('cinematic_series_title_invalid', 'A title of 1 to 120 characters is required.');
  return value.trim();
}
function assertVersion(record, expected) {
  if (!Number.isInteger(expected) || expected !== record.version) fail('cinematic_version_conflict', 'This workspace changed. Refresh and try again.', 409);
}
function touch(series) { series.version += 1; series.updatedAt = new Date().toISOString(); }
function fail(code, message, statusCode = 400) { throw new RepositoryContractError(code, message, statusCode); }
