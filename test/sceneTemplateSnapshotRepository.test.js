import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { SceneTemplateSnapshotRepository } from '../server/repositories/scene-templates/SceneTemplateSnapshotRepository.js';
import { MockUserRepository } from '../server/repositories/identity/MockUserRepository.js';

async function createFixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'stpl-repo-'));
  const usersFile = path.join(directory, 'users.json');
  const snapshotsFile = path.join(directory, 'snapshots.json');

  await fs.writeFile(usersFile, JSON.stringify([
    { id: 'usr_alice', username: 'user_alice', status: 'active' }
  ]), 'utf8');

  const userRepository = new MockUserRepository({ usersFile });
  const repository = new SceneTemplateSnapshotRepository({ snapshotsFile, userRepository });
  return { directory, repository, alice: { userId: 'usr_alice', username: 'user_alice' } };
}

test('SceneTemplateSnapshotRepository creates snapshots and strips embedded base64', async t => {
  const { directory, repository, alice } = await createFixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const created = await repository.create({
    id: 'stpl_spoofed',
    ownerUserId: 'usr_other',
    status: 'deleted',
    authoringMode: 'guided',
    finalPromptSnapshot: 'A beautiful portrait',
    referenceSlotMapping: {
      face_reference: { imageUrl: 'data:image/png;base64,PRIVATE' }
    }
  }, alice);

  assert.match(created.id, /^stpl_/);
  assert.notEqual(created.id, 'stpl_spoofed');
  assert.equal(created.ownerUserId, 'usr_alice');
  assert.equal(created.status, 'active');
  assert.equal(created.referenceSlotMapping.face_reference.imageUrl, null);

  const page = await repository.findByOwner('usr_alice');
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].finalPromptSnapshot, 'A beautiful portrait');
});

test('SceneTemplateSnapshotRepository rejects unsupported authoring modes', async t => {
  const { directory, repository, alice } = await createFixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  await assert.rejects(
    repository.create({ authoringMode: 'unsafe-mode' }, alice),
    error => error.code === 'invalid_authoring_mode'
  );
});
