import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CollectionRepository } from '../server/repositories/collections/CollectionRepository.js';
import { MockUserRepository } from '../server/repositories/identity/MockUserRepository.js';

async function createFixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'collection-repo-'));
  const usersFile = path.join(directory, 'users.json');
  const collectionsFile = path.join(directory, 'collections.json');

  await fs.writeFile(usersFile, JSON.stringify([
    { id: 'usr_alice', username: 'user_alice', status: 'active' },
    { id: 'usr_bob', username: 'user_bob', status: 'active' }
  ]), 'utf8');

  const userRepository = new MockUserRepository({ usersFile });
  const repository = new CollectionRepository({ collectionsFile, userRepository });
  return {
    directory,
    repository,
    alice: { userId: 'usr_alice', username: 'user_alice', role: 'user' },
    bob: { userId: 'usr_bob', username: 'user_bob', role: 'user' }
  };
}

test('CollectionRepository creates, lists, updates, and soft deletes collections', async t => {
  const { directory, repository, alice } = await createFixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const created = await repository.create({
    name: 'My Favorites',
    description: 'A test collection',
    setAsDefault: true
  }, alice);

  assert.equal(created.ownerUserId, 'usr_alice');
  assert.match(created.id, /^col_/);
  assert.equal(created.status, 'active');

  const page = await repository.findByOwner('usr_alice');
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].name, 'My Favorites');

  const updated = await repository.updateById(created.id, { name: 'Renamed Favorites' }, alice);
  assert.equal(updated.name, 'Renamed Favorites');

  const deleteResult = await repository.softDelete(created.id, alice);
  assert.equal(deleteResult.success, true);

  const emptyPage = await repository.findByOwner('usr_alice');
  assert.equal(emptyPage.items.length, 0);
});

test('CollectionRepository keeps protected fields immutable and defaults scoped per owner', async t => {
  const { directory, repository, alice, bob } = await createFixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const aliceCollection = await repository.create({
    name: 'Alice Default',
    ownerUserId: 'usr_bob',
    setAsDefault: true
  }, alice);
  const bobCollection = await repository.create({ name: 'Bob Default', setAsDefault: true }, bob);

  const updated = await repository.updateById(aliceCollection.id, {
    name: 'Alice Renamed',
    id: 'col_spoofed',
    ownerUserId: 'usr_bob',
    status: 'deleted',
    createdAt: '2000-01-01T00:00:00.000Z'
  }, alice);

  assert.equal(updated.id, aliceCollection.id);
  assert.equal(updated.ownerUserId, 'usr_alice');
  assert.equal(updated.status, 'active');
  assert.equal(updated.createdAt, aliceCollection.createdAt);

  const alicePage = await repository.findByOwner('usr_alice');
  const bobPage = await repository.findByOwner('usr_bob');
  assert.equal(alicePage.items.find(item => item.id === aliceCollection.id).isDefault, true);
  assert.equal(bobPage.items.find(item => item.id === bobCollection.id).isDefault, true);
});
