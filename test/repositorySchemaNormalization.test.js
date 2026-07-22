import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { MockUserRepository } from '../server/repositories/identity/MockUserRepository.js';
import { CommunityPostRepository } from '../server/repositories/community/CommunityPostRepository.js';
import { GenerationResultRepository } from '../server/repositories/generation/GenerationResultRepository.js';
import {
  normalizeGenerationHistoryRecord,
  normalizeOwnedRepositoryRecord
} from '../server/repositories/recordNormalizer.js';

async function createUsersFixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'repository-schema-'));
  const usersFile = path.join(directory, 'users.json');
  await fs.writeFile(usersFile, JSON.stringify([
    { id: 'usr_demo', username: 'user_demo', status: 'active' },
    { id: 'usr_alice', username: 'user_alice', status: 'active' }
  ]), 'utf8');
  return { directory, usersFile };
}

test('legacy generation records normalize owner, Demo User fallback, and timestamps without retaining base64 snapshots', async t => {
  const { directory, usersFile } = await createUsersFixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const users = new MockUserRepository({ usersFile });
  const record = await normalizeGenerationHistoryRecord({
    id: 'job_legacy',
    username: 'user_alice',
    timestamp: 1784444068830,
    sceneTemplateSnapshot: { image: 'data:image/png;base64,PRIVATE' }
  }, users);

  assert.equal(record.ownerUserId, 'usr_alice');
  assert.equal(record.ownerUsername, 'user_alice');
  assert.match(record.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(record.sceneTemplateSnapshot.image, null);

  const noOwnerRecord = await normalizeGenerationHistoryRecord({
    id: 'job_unowned',
    timestamp: 1784444068830
  }, users);
  assert.equal(noOwnerRecord.ownerUserId, 'usr_demo');
  assert.equal(noOwnerRecord.ownerUsername, 'user_demo');

  const genericRecord = await normalizeOwnedRepositoryRecord({
    id: 'ast_legacy',
    timestamp: 1784444068830,
    metadata: { image: 'data:image/png;base64,PRIVATE' }
  }, users);
  assert.equal(genericRecord.ownerUserId, 'usr_demo');
  assert.equal(genericRecord.metadata.image, null);
});

test('community repository writes normalized public records and hides hidden records from public lists', async t => {
  const { directory, usersFile } = await createUsersFixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const postsFile = path.join(directory, 'posts.json');
  const users = new MockUserRepository({ usersFile });
  const repository = new CommunityPostRepository({ postsFile, userRepository: users, cursorSecret: 'test-secret' });
  const actor = { userId: 'usr_alice', username: 'user_alice' };

  const published = await repository.create({
    title: 'Public post',
    ownerUserId: 'usr_demo',
    id: 'post_spoofed',
    sceneTemplateSnapshot: { reference: 'data:image/png;base64,PRIVATE' }
  }, actor);
  await repository.create({ title: 'Hidden post', visibility: 'public', status: 'hidden' }, actor);

  assert.equal(published.ownerUserId, 'usr_alice');
  assert.notEqual(published.id, 'post_spoofed');
  assert.equal(published.schemaVersion, 1);
  assert.equal(published.status, 'published');
  assert.match(published.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(published.sceneTemplateSnapshot.reference, null);
  const publicPage = await repository.listPublic({}, { userId: 'usr_demo' });
  assert.deepEqual(publicPage.items.map(item => item.title), ['Public post']);
});

test('generation result repository provides a normalized owner-scoped read facade', async () => {
  const historyStore = {
    async getById(id) {
      return id === 'job_1' ? { id, username: 'user_alice', timestamp: 1784444068830 } : null;
    },
    async listPage() {
      return { items: [{ id: 'job_1', username: 'user_alice', timestamp: 1784444068830 }], nextCursor: null, hasMore: false };
    }
  };
  const users = {
    async findById(id) { return id === 'usr_alice' ? { id, username: 'user_alice' } : null; },
    async findByUsername(username) { return username === 'user_alice' ? { id: 'usr_alice', username } : null; }
  };
  const repository = new GenerationResultRepository({ historyStore, userRepository: users });
  const result = await repository.findByIdForOwner('job_1', 'usr_alice');
  assert.equal(result.ownerUserId, 'usr_alice');
  const page = await repository.findByOwner('usr_alice');
  assert.equal(page.items[0].id, 'job_1');
});
