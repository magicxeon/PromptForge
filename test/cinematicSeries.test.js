import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CinematicProjectRepository } from '../server/repositories/cinematic/CinematicProjectRepository.js';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { registerCinematicRoutes } from '../server/app/routes/cinematicRoutes.js';

const actor = { userId: 'alice', username: 'alice', role: 'user' };
const other = { userId: 'bob', username: 'bob', role: 'user' };
const setup = { title: 'The station', storyBrief: 'A letter arrives.', creativeDirection: 'Warm station light.', durationSeconds: 30, platform: 'tiktok', castPlanningMode: 'solo' };
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-series-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const projectsFile = path.join(root, 'projects.json');
  const repository = new CinematicProjectRepository({ projectsFile });
  const service = new CinematicApplicationService({ repository });
  const project = await service.createProject(setup, actor);
  return { repository, service, project, projectsFile };
}

test('new Mini Series creates its Production Project root and Chapter 1 atomically', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-new-series-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const projectsFile = path.join(root, 'projects.json');
  const repository = new CinematicProjectRepository({ projectsFile });
  const service = new CinematicApplicationService({ repository });
  const chapter = await service.createProject({
    ...setup,
    title: 'Rain Letters',
    format: 'mini-series',
    aspectRatio: '16:9',
    durationSeconds: 120,
    storyPeriod: 'recent-past',
    storyBrief: '',
    creationIntent: 'draft'
  }, actor);
  const workspace = await service.getSeriesWorkspace(chapter.id, actor);
  const stored = JSON.parse(await fs.readFile(projectsFile, 'utf8'));

  assert.equal(workspace.productionProject.format, 'mini-series');
  assert.equal(workspace.productionProject.chapterCount, 1);
  assert.equal(workspace.productionProject.chapterWorkStarted, false);
  assert.equal(workspace.chapters[0].productionUnitId, chapter.id);
  assert.equal(workspace.chapters[0].storyBrief, '');
  assert.equal(chapter.aspectRatio, '16:9');
  assert.equal(chapter.durationTargetMs, 120_000);
  assert.equal(chapter.setup.storyPeriod, 'recent-past');
  assert.equal(chapter.setup.storyBrief, '');
  assert.equal(stored.projects.length, 1);
  assert.equal(stored.series.length, 1);
  assert.equal(stored.projects[0].seriesMembership.seriesId, stored.series[0].id);
});

test('Project rename saves modern root and Series atomically and survives library reload', async t => {
  const { service, repository, projectsFile } = await fixture(t);
  let root = await service.createProject({ ...setup, format: 'mini-series', title: 'Original name' }, actor);
  root = await repository.mutateForActor(root.id, actor, p => {
    p.chapterTitle = 'Keep Chapter title';
    p.chapterStory = 'Keep Chapter prose';
    p.generationAttempts = [{ id: 'take-kept' }];
    return p;
  });
  const before = await service.getSeriesWorkspace(root.id, actor);
  const input = { ...root.setup, title: undefined, projectName: 'Renamed story', expectedVersion: root.version };
  const saved = await service.updateSetup(root.id, input, actor);
  const after = await service.getSeriesWorkspace(root.id, actor);
  assert.equal(saved.title, 'Renamed story');
  assert.equal(after.series.title, saved.title);
  assert.equal(after.series.version, before.series.version + 1);
  assert.equal(after.productionProject.title, saved.title);
  assert.equal(saved.chapterTitle, 'Keep Chapter title');
  assert.equal(saved.chapterStory, 'Keep Chapter prose');
  assert.deepEqual(saved.generationAttempts, root.generationAttempts);
  assert.deepEqual(saved.storySourceVersions, root.storySourceVersions);
  const fresh = new CinematicProjectRepository({ projectsFile });
  assert.equal((await fresh.listForActor(actor)).items.find(item => item.projectId === root.id).title, saved.title);
  await assert.rejects(service.updateSetup(root.id, { ...input, projectName: 'Stale overwrite' }, actor), { code: 'cinematic_version_conflict' });
  await assert.rejects(service.updateSetup(root.id, { ...input, expectedVersion: saved.version }, other), { code: 'cinematic_project_not_found' });
  assert.equal((await service.getSeriesWorkspace(root.id, actor)).series.title, 'Renamed story');
});

test('Project rename projects previously saved modern names without rewriting stored legacy Series', async t => {
  const { service, repository } = await fixture(t);
  let root = await service.createProject({ ...setup, format: 'mini-series', title: 'Imported filename' }, actor);
  root = await repository.mutateForActor(root.id, actor, p => { p.title = 'Already saved name'; p.setup.title = p.title; return p; });
  const result = await service.getSeriesWorkspace(root.id, actor);
  assert.equal(result.series.title, 'Imported filename');
  assert.equal(result.productionProject.title, 'Already saved name');
  assert.equal((await repository.listForActor(actor)).items.find(item => item.projectId === root.id).title, 'Already saved name');
  assert.equal((await repository.readSeriesWorkspaceForActor(actor)).series.find(item => item.id === root.seriesMembership.seriesId).title, 'Imported filename');
});

test('Project rename keeps child and Season names isolated and supports explicit Series rename', async t => {
  const { service, repository } = await fixture(t);
  let root = await service.createProject({ ...setup, format: 'mini-series', title: 'Main story' }, actor);
  let workspace = await service.getSeriesWorkspace(root.id, actor);
  const added = await service.addSeriesChapter(workspace.series.id, { title: 'Second Chapter', copyCast: false,
    sourceProjectId: root.id, expectedProjectVersion: root.version, expectedVersion: workspace.series.version, seasonId: workspace.series.seasons[0].id }, actor);
  const child = added.project;
  await service.updateSetup(child.id, { ...child.setup, title: 'Child-only metadata', expectedVersion: child.version }, actor);
  workspace = await service.getSeriesWorkspace(root.id, actor);
  assert.equal(workspace.series.title, 'Main story');
  workspace = await service.updateSeries(workspace.series.id, { title: 'Season name', seasonId: workspace.series.seasons[0].id, expectedVersion: workspace.series.version }, actor);
  assert.equal((await repository.findForActor(root.id, actor)).title, 'Main story');
  workspace = await service.updateSeries(workspace.series.id, { title: 'Series rename', expectedVersion: workspace.series.version }, actor);
  root = await repository.findForActor(root.id, actor);
  assert.equal(root.title, 'Series rename');
  assert.equal(root.setup.title, 'Series rename');
  assert.equal(workspace.productionProject.title, 'Series rename');
  assert.equal((await repository.findForActor(child.id, actor)).chapterTitle, 'Second Chapter');
});

test('Project rename preserves standalone behavior', async t => {
  const { service, repository, project } = await fixture(t);
  const saved = await service.updateSetup(project.id, { ...project.setup, title: 'Standalone renamed', expectedVersion: project.version }, actor);
  assert.equal((await repository.listForActor(actor)).items[0].title, saved.title);
  assert.equal((await service.getSeriesWorkspace(project.id, actor)).series, null);
});

test('Prepare Story persists bounded AI operation context on the initial Story Source', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-prepared-story-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const repository = new CinematicProjectRepository({ projectsFile: path.join(root, 'projects.json') });
  const service = new CinematicApplicationService({ repository });
  const project = await service.createProject({
    ...setup,
    creationIntent: 'prepare-story',
    storyPreparation: {
      enhancementId: 'cineenh_new_project',
      provenance: { provider: 'openai', model: 'gpt-test', responseId: 'response-1' },
      billingStatus: 'qualification_no_charge'
    }
  }, actor);

  assert.equal(project.setup.storyPreparation, undefined);
  assert.equal(project.storySourceVersions[0].source, 'ai-enhancement');
  assert.deepEqual(project.storySourceVersions[0].operationContext, {
    enhancementId: 'cineenh_new_project',
    provenance: { provider: 'openai', model: 'gpt-test', responseId: 'response-1' },
    billingStatus: 'qualification_no_charge'
  });
});

test('invalid Prepare Story context is rejected before Project storage', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-invalid-prepared-story-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const projectsFile = path.join(root, 'projects.json');
  const repository = new CinematicProjectRepository({ projectsFile });
  const service = new CinematicApplicationService({ repository });

  assert.throws(() => service.createProject({
    ...setup,
    creationIntent: 'prepare-story',
    storyPreparation: {
      enhancementId: '',
      provenance: { provider: 'openai', model: 'gpt-test', responseId: null },
      billingStatus: 'qualification_no_charge'
    }
  }, actor), { code: 'cinematic_story_preparation_invalid' });
  await assert.rejects(fs.access(projectsFile));
});

test('standalone remains unchanged; explicit Series membership preserves story, scenes, attempts and URLs', async t => {
  const { service, repository, project, projectsFile } = await fixture(t);
  await repository.mutateForActor(project.id, actor, draft => {
    draft.scenes = [{ id: 'original-scene', shots: [{ id: 'original-shot', approvedVideoAttemptId: 'take' }] }];
    draft.generationAttempts = [{ id: 'take', status: 'approved', outputAsset: { publicUrl: '/original.mp4' } }];
  });
  const before = await service.getProject(project.id, actor);
  const standalone = await service.getSeriesWorkspace(project.id, actor);
  assert.equal(standalone.series, null);
  assert.equal(standalone.productionProject.id, project.id);
  assert.equal(standalone.productionProject.seasonsEnabled, false);
  assert.equal(standalone.chapters[0].chapterId, project.id);
  assert.equal(standalone.chapters[0].productionUnitId, project.id);
  assert.equal(JSON.parse(await fs.readFile(projectsFile, 'utf8')).series, undefined);
  const attached = await service.createSeries(project.id, { title: 'Station Stories', expectedProjectVersion: 1 }, actor);
  assert.equal(attached.project.id, project.id);
  assert.deepEqual(attached.project.scenes, before.scenes);
  assert.deepEqual(attached.project.setup, before.setup);
  assert.deepEqual(attached.project.generationAttempts, before.generationAttempts);
  assert.equal(attached.project.seriesMembership.chapterNumber, 1);
  assert.equal(attached.workspace.series.seasons[0].number, 1);
  assert.equal(attached.workspace.productionProject.id, attached.workspace.series.id);
  assert.equal(attached.workspace.chapters[0].productionProjectId, attached.workspace.series.id);
  await assert.rejects(service.createSeries(project.id, { title: 'Duplicate', expectedProjectVersion: 2 }, actor), { code: 'cinematic_series_already_assigned' });
});

test('Seasons and Chapters persist independently with pinned Cast snapshot and no inherited media', async t => {
  const { service, repository, project } = await fixture(t);
  await repository.mutateForActor(project.id, actor, draft => {
    draft.castAssignments = [{ id: 'cast-old', active: true, displayName: 'Nara', characterProfileId: 'char1', characterProfileVersionId: 'version1',
      looks: [{ id: 'look-old', version: 2, assetIds: ['asset1'], trustedGenerationId: 'image1' }] }];
    draft.generationAttempts = [{ id: 'old-job' }];
  });
  const attached = await service.createSeries(project.id, { title: 'Series', expectedProjectVersion: 1 }, actor);
  const seriesId = attached.workspace.series.id, seasonId = attached.workspace.series.seasons[0].id;
  const chapter = await service.addSeriesChapter(seriesId, { seasonId, title: 'Another letter', storyBrief: 'Nara reads a second letter.',
    sourceProjectId: project.id, expectedVersion: 1, expectedProjectVersion: 2, copyCast: true }, actor);
  assert.equal(chapter.project.seriesMembership.chapterNumber, 2);
  assert.equal(chapter.project.setup.creativeDirection, setup.creativeDirection);
  assert.equal(chapter.project.setup.storyBrief, setup.storyBrief);
  assert.equal(chapter.project.chapterTitle, 'Another letter');
  assert.equal(chapter.project.chapterStory, 'Nara reads a second letter.');
  for (const field of ['scenes', 'generationAttempts', 'timelineVersions', 'storyPlanVersions']) assert.deepEqual(chapter.project[field], []);
  assert.equal(chapter.project.castAssignments[0].characterProfileVersionId, 'version1');
  assert.notEqual(chapter.project.castAssignments[0].id, 'cast-old');
  assert.notEqual(chapter.project.castAssignments[0].looks[0].id, 'look-old');
  await repository.mutateForActor(chapter.project.id, actor, draft => { draft.castAssignments[0].displayName = 'Changed locally'; });
  assert.equal((await service.getProject(project.id, actor)).castAssignments[0].displayName, 'Nara');
  const second = await service.addSeriesSeason(seriesId, { title: 'Winter', expectedVersion: 2 }, actor);
  const fresh = await service.addSeriesChapter(seriesId, { seasonId: second.series.seasons[1].id, title: 'Winter opens', storyBrief: 'Snow at the station.',
    sourceProjectId: project.id, expectedVersion: 3, expectedProjectVersion: 2, copyCast: false }, actor);
  assert.equal(fresh.project.seriesMembership.chapterNumber, 1);
  assert.deepEqual(fresh.project.castAssignments, []);
  const reloaded = await service.getSeriesWorkspace(fresh.project.id, actor);
  assert.equal(reloaded.chapters.length, 3);
  assert.equal(reloaded.series.seasons[1].title, 'Winter');
  assert.equal(reloaded.chapters[0].projectId, project.id);
  assert.equal(JSON.stringify(reloaded).includes('trustedGenerationId'), false);
});

test('an empty Chapter can be added for manual writing without inheriting generated work', async t => {
  const { service, project } = await fixture(t);
  const attached = await service.createSeries(project.id, { title: 'Series', expectedProjectVersion: 1 }, actor);
  const result = await service.addSeriesChapter(attached.workspace.series.id, {
    seasonId: attached.workspace.series.seasons[0].id,
    title: 'Blank page',
    storyBrief: '',
    sourceProjectId: project.id,
    expectedVersion: 1,
    expectedProjectVersion: 2,
    copyCast: false
  }, actor);
  assert.equal(result.project.setup.storyBrief, setup.storyBrief);
  assert.equal(result.project.chapterTitle, 'Blank page');
  assert.equal(result.project.chapterStory, '');
  assert.equal(result.workspace.chapters.find(item => item.projectId === result.project.id).storyBrief, '');
  for (const field of ['scenes', 'generationAttempts', 'timelineVersions', 'storyPlanVersions']) {
    assert.deepEqual(result.project[field], []);
  }
});

test('manual Chapter updates stay separate from the Project Brief and return the canonical workspace', async t => {
  const { service, project } = await fixture(t);
  const result = await service.updateSeriesChapter(project.id, {
    expectedProjectVersion: project.version,
    title: 'The second platform',
    story: 'Nara chooses whether to open the letter.'
  }, actor);
  assert.equal(result.project.setup.storyBrief, setup.storyBrief);
  assert.equal(result.project.chapterTitle, 'The second platform');
  assert.equal(result.project.chapterStory, 'Nara chooses whether to open the letter.');
  assert.equal(result.workspace.productionProject.chapterWorkStarted, true);
  assert.equal(result.workspace.chapters[0].title, 'The second platform');
  assert.equal(result.workspace.chapters[0].storyBrief, 'Nara chooses whether to open the letter.');
  await assert.rejects(service.updateSeriesChapter(project.id, {
    expectedProjectVersion: project.version,
    title: 'Stale',
    story: ''
  }, actor), { code: 'cinematic_version_conflict' });
});

test('version conflicts, ownership and invalid input leave no partial or duplicate Series writes', async t => {
  const { service, project, projectsFile } = await fixture(t);
  const bob = await service.createProject({ ...setup, title: 'Bobs film' }, other);
  const attached = await service.createSeries(project.id, { title: 'Series', expectedProjectVersion: 1 }, actor);
  const id = attached.workspace.series.id;
  for (const operation of [() => service.getSeriesWorkspace(project.id, other), () => service.updateSeries(id, { title: 'Hacked', expectedVersion: 1 }, other)]) {
    await assert.rejects(operation(), error => error.statusCode === 404);
  }
  const before = await fs.readFile(projectsFile, 'utf8');
  await assert.rejects(service.addSeriesChapter(id, { sourceProjectId: bob.id, expectedProjectVersion: 1, expectedVersion: 1, seasonId: attached.workspace.series.seasons[0].id, title: 'New', storyBrief: 'New.', copyCast: true }, actor), { code: 'cinematic_project_not_found' });
  assert.throws(() => service.updateSeries(id, { title: '', expectedVersion: 1 }, actor), { code: 'cinematic_series_title_invalid' });
  assert.equal(await fs.readFile(projectsFile, 'utf8'), before);
  const outcomes = await Promise.allSettled([1, 2].map(() => service.addSeriesSeason(id, { title: 'Next', expectedVersion: 1 }, actor)));
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(result => result.status === 'rejected').reason.code, 'cinematic_version_conflict');
  assert.equal((await service.getProject(bob.id, other)).title, 'Bobs film');
});

test('Series routes bind actor context, return private summaries and preserve HTTP conflict status', async t => {
  const { service, project } = await fixture(t);
  const handlers = new Map();
  const app = Object.fromEntries(['get', 'post', 'patch', 'put', 'delete'].map(method => [method, (route, handler) => handlers.set(`${method} ${route}`, handler)]));
  registerCinematicRoutes(app, { cinematicService: service });
  async function invoke(method, route, input = {}) {
    const res = { statusCode: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; },
      status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handlers.get(`${method} ${route}`)({ actorContext: actor, params: { projectId: project.id }, ...input }, res);
    return res;
  }
  const created = await invoke('post', '/api/cinematic/projects/:projectId/series', { body: { title: 'Series', expectedProjectVersion: 1, username: 'bob' } });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.workspace.series.ownerUserId, 'alice');
  assert.equal((await invoke('get', '/api/cinematic/projects/:projectId/series', { actorContext: other })).statusCode, 404);
  assert.equal((await invoke('patch', '/api/cinematic/series/:seriesId', { params: { seriesId: created.body.workspace.series.id }, body: { title: 'Changed', expectedVersion: 999 } })).statusCode, 409);
  const chapter = await invoke('patch', '/api/cinematic/projects/:projectId/chapter', {
    body: { expectedProjectVersion: 2, title: 'Opening', story: 'A manual Chapter.' }
  });
  assert.equal(chapter.statusCode, 200);
  assert.equal(chapter.body.project.chapterStory, 'A manual Chapter.');
  assert.equal(chapter.body.project.setup.storyBrief, setup.storyBrief);
  const read = await invoke('get', '/api/cinematic/projects/:projectId/series');
  assert.equal(read.statusCode, 200);
  assert.match(read.headers['Cache-Control'], /private, no-store/);
  assert.equal(read.body.chapters[0].projectId, project.id);
});

test('Series commands present legacy Projects through canonical normalization without migrating stored media', async t => {
  const { service, project, projectsFile } = await fixture(t);
  const data = JSON.parse(await fs.readFile(projectsFile, 'utf8'));
  data.projects[0].status = 'storyboarding';
  delete data.projects[0].authoringState;
  delete data.projects[0].authoringContractVersion;
  await fs.writeFile(projectsFile, JSON.stringify(data));
  const result = await service.createSeries(project.id, { title: 'Legacy Series', expectedProjectVersion: 1 }, actor);
  assert.equal(result.project.status, 'planned');
  assert.equal(result.project.authoringContractVersion, 'cinematic-authoring-v1');
  assert.equal(result.workspace.chapters[0].status, 'planned');
  assert.equal(JSON.parse(await fs.readFile(projectsFile, 'utf8')).projects[0].status, 'storyboarding');
});

test('archived Chapter numbers stay reserved; unknown Season and stale source fail without creating a Chapter', async t => {
  const { service, repository, project } = await fixture(t);
  const first = await service.createSeries(project.id, { title: 'Series', expectedProjectVersion: 1 }, actor);
  const seriesId = first.workspace.series.id, seasonId = first.workspace.series.seasons[0].id;
  const input = { seasonId, title: 'Next', storyBrief: 'Another letter.', sourceProjectId: project.id, expectedProjectVersion: 2, expectedVersion: 1, copyCast: false };
  await assert.rejects(service.addSeriesChapter(seriesId, { ...input, seasonId: 'missing' }, actor), { code: 'cinematic_season_not_found' });
  await assert.rejects(service.addSeriesChapter(seriesId, { ...input, expectedProjectVersion: 1 }, actor), { code: 'cinematic_version_conflict' });
  const second = await service.addSeriesChapter(seriesId, input, actor);
  await service.archiveProject(second.project.id, second.project.version, actor);
  const third = await service.addSeriesChapter(seriesId, { ...input, expectedVersion: 2 }, actor);
  assert.equal(third.project.seriesMembership.chapterNumber, 3);
  assert.equal(third.workspace.chapters.length, 2);
  assert.ok(await repository.findForActor(second.project.id, actor));
  const renamed = await service.updateSeries(seriesId, { title: 'New Series title', expectedVersion: 3 }, actor);
  const season = await service.updateSeries(seriesId, { title: 'New Season title', seasonId, expectedVersion: renamed.series.version }, actor);
  assert.equal(season.series.title, 'New Series title');
  assert.equal(season.series.seasons[0].title, 'New Season title');
  assert.equal((await service.getProject(project.id, actor)).title, setup.title);
});

test('Series limit errors are atomic and do not add data', async t => {
  const { service, repository, project } = await fixture(t);
  const first = await service.createSeries(project.id, { title: 'Series', expectedProjectVersion: 1 }, actor);
  const id = first.workspace.series.id;
  await repository.mutateSeriesWorkspaceForActor(actor, data => {
    data.series[0].seasons = Array.from({ length: 24 }, (_, i) => ({ id: `s${i}`, number: i + 1, title: '' }));
  });
  await assert.rejects(service.addSeriesSeason(id, { title: '', expectedVersion: 1 }, actor), { code: 'cinematic_series_limit' });
  assert.equal((await service.getSeriesWorkspace(project.id, actor)).series.seasons.length, 24);
});
