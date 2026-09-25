import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CinematicProjectRepository } from '../server/repositories/cinematic/CinematicProjectRepository.js';

const alice = { userId: 'usr_alice', username: 'user_alice', role: 'user' };
const bob = { userId: 'usr_bob', username: 'user_bob', role: 'user' };

async function fixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-repository-'));
  const projectsFile = path.join(directory, 'projects.json');
  const repository = new CinematicProjectRepository({ projectsFile, cursorSecret: 'fixture-secret' });
  return { directory, repository };
}

test('CinematicProjectRepository creates actor-owned projects and paginates summaries', async t => {
  const { directory, repository } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const setup = {
    title: 'Platform Letter', platform: 'tiktok', durationSeconds: 30,
    storyBrief: 'Two people meet at a station.', creativeDirection: '',
    genre: 'drama', audienceFeeling: 'moved', pacing: 'balanced',
    endingIntent: 'resolved', mode: 'simple'
  };
  const first = await repository.create(setup, alice);
  await repository.create({ ...setup, title: 'Second Film' }, alice);
  await repository.create({ ...setup, title: 'Bob Film' }, bob);

  assert.equal(first.ownerUserId, 'usr_alice');
  assert.equal(first.storySourceVersions.length, 1);
  assert.equal(first.activeStorySourceVersionId, first.storySourceVersions[0].id);
  const page = await repository.listForActor(alice, { limit: 1 });
  assert.equal(page.items.length, 1);
  assert.equal(page.hasMore, true);
  assert.ok(page.nextCursor);
  assert.equal((await repository.listForActor(bob)).items.length, 1);
});

test('CinematicProjectRepository adds a non-destructive authoring envelope to new and legacy Projects', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-repository-authoring-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const projectsFile = path.join(directory, 'projects.json');
  const repository = new CinematicProjectRepository({ projectsFile });
  const created = await repository.create({
    title: 'Authoring envelope', platform: 'tiktok', durationSeconds: 20,
    storyBrief: 'A visible choice.', creativeDirection: '', genre: 'drama',
    audienceFeeling: 'moved', pacing: 'balanced', endingIntent: 'resolved',
    mode: 'simple', castPlanningMode: 'solo', storyRoleSlots: []
  }, alice);
  assert.equal(created.authoringContractVersion, 'cinematic-authoring-v1');
  assert.equal(created.authoringState.inferenceMode, 'explicit');
  const stored = JSON.parse(await fs.readFile(projectsFile, 'utf8'));
  delete stored.projects[0].authoringContractVersion;
  delete stored.projects[0].authoringState;
  await fs.writeFile(projectsFile, JSON.stringify(stored));
  const legacy = await repository.findForActor(created.id, alice);
  assert.equal(legacy.authoringContractVersion, 'cinematic-authoring-v1');
  assert.equal(legacy.authoringState.inferenceMode, 'legacy');
  assert.equal(legacy.setup.storyBrief, 'A visible choice.');
});

test('CinematicProjectRepository serializes mutations and hides cross-actor records', async t => {
  const { directory, repository } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = await repository.create({
    title: 'Film', platform: 'reels', durationSeconds: 20, storyBrief: 'A choice.',
    creativeDirection: '', genre: 'drama', audienceFeeling: 'curious',
    pacing: 'slow', endingIntent: 'twist', mode: 'advanced'
  }, alice);

  assert.equal(await repository.findForActor(project.id, bob), null);
  await assert.rejects(
    repository.mutateForActor(project.id, bob, () => undefined),
    error => error.code === 'cinematic_project_not_found' && error.statusCode === 404
  );
});

test('CinematicProjectRepository normalizes null Storyboard source pointers from legacy writes', async t => {
  const { directory, repository } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(repository.projectsFile, JSON.stringify({
    schemaVersion: 1,
    projects: [{
      id: 'cineproj_legacy_null', ownerUserId: alice.userId, status: 'planned',
      scenes: [{
        id: 'scene_a',
        shots: [{ id: 'shot_a', approvedStoryboardSource: null, approvedStoryboardAttemptId: null }]
      }]
    }]
  }), 'utf8');

  const loaded = await repository.findForActor('cineproj_legacy_null', alice);
  assert.equal(Object.hasOwn(loaded.scenes[0].shots[0], 'approvedStoryboardSource'), false);
  assert.equal(Object.hasOwn(loaded.scenes[0].shots[0], 'approvedStoryboardAttemptId'), false);

  await repository.mutateForActor('cineproj_legacy_null', alice, project => project);
  const persisted = JSON.parse(await fs.readFile(repository.projectsFile, 'utf8'));
  assert.equal(Object.hasOwn(persisted.projects[0].scenes[0].shots[0], 'approvedStoryboardSource'), false);
  assert.equal(Object.hasOwn(persisted.projects[0].scenes[0].shots[0], 'approvedStoryboardAttemptId'), false);
});

test('CinematicProjectRepository groups Chapters into one resumable Project summary with real clip progress', async t => {
  const { directory, repository } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const base = {
    ownerUserId: alice.userId, ownerUsername: alice.username, schemaVersion: 1, version: 1,
    format: 'short-film', durationTargetMs: 60_000, status: 'producing',
    setup: {}, storyPlanVersions: [], generationAttempts: [], timelineVersions: [],
    commandReceipts: [], castAssignments: [], createdAt: '2026-09-18T00:00:00.000Z', archivedAt: null
  };
  await fs.writeFile(repository.projectsFile, JSON.stringify({
    schemaVersion: 1,
    series: [{
      id: 'series_rain', ownerUserId: alice.userId, title: 'Rain Stories', version: 1,
      seasons: [{ id: 'season_1', number: 1, title: '' }],
      createdAt: '2026-09-18T00:00:00.000Z', updatedAt: '2026-09-19T02:00:00.000Z'
    }],
    projects: [
      {
        ...base, id: 'chapter_1', projectId: 'chapter_1', title: 'First rain', activeStage: 'produce',
        updatedAt: '2026-09-19T01:00:00.000Z',
        seriesMembership: { seriesId: 'series_rain', seasonId: 'season_1', chapterNumber: 1 },
        scenes: [{ id: 'scene_1', shots: [{ id: 'shot_1', approvedVideoAttemptId: 'take_1', approvedStoryboardSource: {
          thumbnailUrl: '/outputs/thumbnails/rain.webp'
        } }] }],
        generationAttempts: [{
          id: 'take_1', reviewDecision: 'approved', status: 'approved', downstreamSourceStatus: 'current'
        }]
      },
      {
        ...base, id: 'chapter_2', projectId: 'chapter_2', title: 'Second rain', activeStage: 'storyboard',
        updatedAt: '2026-09-19T03:00:00.000Z',
        seriesMembership: { seriesId: 'series_rain', seasonId: 'season_1', chapterNumber: 2 },
        scenes: [{ id: 'scene_2', shots: [{ id: 'shot_2' }] }]
      }
    ]
  }), 'utf8');

  const page = await repository.listForActor(alice);
  assert.equal(page.items.length, 1);
  assert.deepEqual(page.items[0].progress, { approvedClipCount: 1, totalClipCount: 2 });
  assert.equal(page.items[0].productionProjectId, 'series_rain');
  assert.equal(page.items[0].projectId, 'chapter_1');
  assert.equal(page.items[0].title, 'Rain Stories');
  assert.equal(page.items[0].chapterTitle, 'Second rain');
  assert.deepEqual(page.items[0].resumeContext, {
    productionProjectId: 'series_rain', chapterId: 'chapter_2',
    productionUnitId: 'chapter_2', stage: 'storyboard'
  });
  assert.equal(page.items[0].thumbnailUrl, '/outputs/thumbnails/rain.webp');
});
