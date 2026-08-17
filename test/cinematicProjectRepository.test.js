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
