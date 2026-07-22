import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { AssetRepository } from '../server/repositories/assets/AssetRepository.js';
import { MockUserRepository } from '../server/repositories/identity/MockUserRepository.js';

async function createFixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'asset-repo-'));
  const usersFile = path.join(directory, 'users.json');
  const assetsFile = path.join(directory, 'assets.json');

  await fs.writeFile(usersFile, JSON.stringify([
    { id: 'usr_alice', username: 'user_alice', status: 'active' },
    { id: 'usr_bob', username: 'user_bob', status: 'active' }
  ]), 'utf8');

  const userRepository = new MockUserRepository({ usersFile });
  const repository = new AssetRepository({ assetsFile, userRepository });
  return { directory, repository, alice: { userId: 'usr_alice', username: 'user_alice' } };
}

test('AssetRepository creates asset records with prefixes and enforces owner lookup', async t => {
  const { directory, repository, alice } = await createFixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const created = await repository.create({
    storageKey: 'outputs/job_123.png',
    assetType: 'generated_image'
  }, alice);

  assert.match(created.id, /^ast_/);
  assert.equal(created.ownerUserId, 'usr_alice');
  assert.equal(created.storageKey, 'outputs/job_123.png');

  const asset = await repository.findByIdForOwner(created.id, 'usr_alice');
  assert.equal(asset.id, created.id);

  const notFound = await repository.findByIdForOwner(created.id, 'usr_bob');
  assert.equal(notFound, null);
});

test('AssetRepository ignores protected input fields and supports cursor pagination', async t => {
  const { directory, repository, alice } = await createFixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const first = await repository.create({
    id: 'ast_spoofed',
    ownerUserId: 'usr_bob',
    status: 'deleted',
    createdAt: '2000-01-01T00:00:00.000Z',
    storageKey: 'outputs/first.png'
  }, alice);
  await repository.create({ storageKey: 'outputs/second.png' }, alice);

  assert.notEqual(first.id, 'ast_spoofed');
  assert.equal(first.ownerUserId, 'usr_alice');
  assert.equal(first.status, 'active');
  assert.notEqual(first.createdAt, '2000-01-01T00:00:00.000Z');

  const firstPage = await repository.findByOwner('usr_alice', { limit: 1 });
  assert.equal(firstPage.items.length, 1);
  assert.equal(firstPage.hasMore, true);
  assert.ok(firstPage.nextCursor);

  const secondPage = await repository.findByOwner('usr_alice', { limit: 1, cursor: firstPage.nextCursor });
  assert.equal(secondPage.items.length, 1);
  assert.notEqual(secondPage.items[0].id, firstPage.items[0].id);

  await assert.rejects(
    repository.create({ storageKey: '../private.png' }, alice),
    error => error.code === 'invalid_storage_key'
  );
});
