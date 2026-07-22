import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { AuditLogRepository } from '../server/repositories/audit/AuditLogRepository.js';
import { CommunityCharacterRepository } from '../server/repositories/community/CommunityCharacterRepository.js';
import { CommunityGalleryRepository } from '../server/repositories/community/CommunityGalleryRepository.js';
import { ComparisonRepositoryAdapter } from '../server/repositories/comparisons/ComparisonRepositoryAdapter.js';
import { MockUserRepository } from '../server/repositories/identity/MockUserRepository.js';

async function createFixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'deferred-repos-'));
  const usersFile = path.join(directory, 'users.json');
  await fs.writeFile(usersFile, JSON.stringify([
    { id: 'usr_alice', username: 'user_alice', role: 'user', status: 'active' }
  ]), 'utf8');

  const userRepository = new MockUserRepository({ usersFile });
  return {
    directory,
    actor: { userId: 'usr_alice', username: 'user_alice', role: 'user' },
    auditRepo: new AuditLogRepository({ auditFile: path.join(directory, 'audit.json'), userRepository }),
    characterRepo: new CommunityCharacterRepository({
      characterFile: path.join(directory, 'characters.json'),
      userRepository,
      cursorSecret: 'test-character-cursor'
    }),
    comparisonRepo: new ComparisonRepositoryAdapter({
      comparisonsFile: path.join(directory, 'comparisons.json'),
      userRepository,
      cursorSecret: 'test-comparison-cursor'
    }),
    galleryRepo: new CommunityGalleryRepository({
      galleryFile: path.join(directory, 'gallery.json'),
      userRepository,
      cursorSecret: 'test-gallery-cursor'
    })
  };
}

test('deferred community repositories enforce ownership and strip embedded base64', async t => {
  const { directory, actor, characterRepo, galleryRepo } = await createFixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const privateGalleryItem = await galleryRepo.create({
    ownerUserId: 'usr_spoofed',
    sceneBuilderHandoffSnapshot: { face: 'data:image/png;base64,PRIVATE' }
  }, actor);
  assert.equal(privateGalleryItem.ownerUserId, 'usr_alice');
  assert.equal(privateGalleryItem.visibility, 'private');
  assert.equal(privateGalleryItem.sceneBuilderHandoffSnapshot.face, null);

  const publicGalleryItem = await galleryRepo.create({
    visibility: 'public',
    title: 'Public image',
    sceneBuilderHandoffSnapshot: { style: 'data:image/png;base64,PRIVATE' }
  }, actor);
  const publicGallery = await galleryRepo.listPublic();
  assert.equal(publicGallery.items.length, 1);
  assert.equal(publicGallery.items[0].id, publicGalleryItem.id);
  assert.equal(publicGallery.items[0].sceneBuilderHandoffSnapshot.style, null);

  const character = await characterRepo.create({
    displayName: 'Alice Character',
    visibility: 'public',
    sceneBuilderHandoffSnapshot: { reference: 'data:image/png;base64,PRIVATE' }
  }, actor);
  assert.equal(character.ownerUserId, 'usr_alice');
  assert.equal(character.sceneBuilderHandoffSnapshot.reference, null);

  const publicCharacters = await characterRepo.listPublic();
  assert.equal(publicCharacters.items.length, 1);
  assert.equal(publicCharacters.items[0].id, character.id);
});

test('deferred audit and comparison repositories protect system fields', async t => {
  const { directory, actor, auditRepo, comparisonRepo } = await createFixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const audit = await auditRepo.appendEvent({
    id: 'audit_spoofed',
    ownerUserId: 'usr_spoofed',
    action: 'test_action',
    targetType: 'post',
    targetId: 'post_1',
    beforeSnapshot: { image: 'data:image/png;base64,PRIVATE' }
  }, actor);
  assert.notEqual(audit.id, 'audit_spoofed');
  assert.equal(audit.ownerUserId, 'usr_alice');
  assert.equal(audit.beforeSnapshot.image, null);

  const comparison = await comparisonRepo.create({
    id: 'cmp_spoofed',
    ownerUserId: 'usr_spoofed',
    sourcePrompt: 'portrait'
  }, actor);
  assert.notEqual(comparison.id, 'cmp_spoofed');
  assert.equal(comparison.ownerUserId, 'usr_alice');
});
