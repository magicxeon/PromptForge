import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CommunityCharacterRepository } from '../server/repositories/community/CommunityCharacterRepository.js';
import { CommunityGalleryRepository } from '../server/repositories/community/CommunityGalleryRepository.js';
import { MockUserRepository } from '../server/repositories/identity/MockUserRepository.js';

async function createFixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'community-09-contracts-'));
  const usersFile = path.join(directory, 'users.json');
  await fs.writeFile(usersFile, JSON.stringify([
    {
      id: 'usr_alice',
      username: 'user_alice',
      displayName: 'Alice',
      role: 'creator',
      status: 'active'
    },
    {
      id: 'usr_bob',
      username: 'user_bob',
      displayName: 'Bob',
      role: 'user',
      status: 'active'
    }
  ]), 'utf8');

  const userRepository = new MockUserRepository({ usersFile });
  return {
    directory,
    alice: {
      userId: 'usr_alice',
      username: 'user_alice',
      role: 'creator'
    },
    bob: {
      userId: 'usr_bob',
      username: 'user_bob',
      role: 'user'
    },
    galleryRepository: new CommunityGalleryRepository({
      galleryFile: path.join(directory, 'gallery.json'),
      userRepository,
      cursorSecret: 'community-09-gallery-test'
    }),
    characterRepository: new CommunityCharacterRepository({
      characterFile: path.join(directory, 'characters.json'),
      userRepository,
      cursorSecret: 'community-09-character-test'
    })
  };
}

test('Community-09 gallery is owner-curated and exposes only safe public summaries', async t => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.directory, { recursive: true, force: true }));

  await fixture.galleryRepository.create({
    title: 'Private draft',
    visibility: 'private',
    sourceGenerationResultId: 'job_private'
  }, fixture.alice);

  const publicItem = await fixture.galleryRepository.create({
    title: 'Public fashion image',
    visibility: 'public',
    reusePolicy: 'use_as_template',
    sourceGenerationResultId: 'job_public',
    imageAssetId: 'asset_public',
    thumbnailAssetId: 'asset_public_thumb',
    officialTags: ['content_type.fashion'],
    sceneBuilderHandoffSnapshot: {
      finalPromptSnapshot: 'private internal prompt',
      referenceSlotMapping: {
        face_reference: {
          value: 'data:image/png;base64,PRIVATE'
        }
      }
    }
  }, fixture.alice);

  const aliceItems = await fixture.galleryRepository.findByOwner('usr_alice');
  assert.equal(aliceItems.items.length, 2);
  assert.equal(
    aliceItems.items.find(item => item.id === publicItem.id)
      .sceneBuilderHandoffSnapshot.referenceSlotMapping.face_reference.value,
    null
  );

  const publicItems = await fixture.galleryRepository.listPublic();
  assert.deepEqual(publicItems.items.map(item => item.id), [publicItem.id]);
  assert.equal(publicItems.items[0].handoffAvailable, true);
  assert.equal(Object.hasOwn(publicItems.items[0], 'ownerUserId'), false);
  assert.equal(Object.hasOwn(publicItems.items[0], 'sceneBuilderHandoffSnapshot'), false);
  assert.equal(Object.hasOwn(publicItems.items[0], 'sourceGenerationResultId'), false);

  const publicDetail = await fixture.galleryRepository.findPublicById(publicItem.id);
  assert.equal(publicDetail.id, publicItem.id);
  assert.equal(Object.hasOwn(publicDetail, 'sceneBuilderHandoffSnapshot'), false);
});

test('Community-09 character contract normalizes types and protects private references', async t => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.directory, { recursive: true, force: true }));

  const character = await fixture.characterRepository.create({
    displayName: 'Alice Full Character',
    characterType: 'full_character',
    visibility: 'public',
    reusePolicy: 'use_as_character',
    sourceGenerationResultId: 'job_character',
    previewImageAssetId: 'asset_character_preview',
    faceReferencePolicy: 'owner_only',
    outfitReferencePolicy: 'public_reusable',
    sceneBuilderHandoffSnapshot: {
      referenceSlotMapping: {
        face_reference: {
          imageUrl: '/outputs/private-face.png'
        }
      }
    }
  }, fixture.alice);

  const publicCharacters = await fixture.characterRepository.listPublic();
  assert.equal(publicCharacters.items.length, 1);
  assert.equal(publicCharacters.items[0].id, character.id);
  assert.equal(publicCharacters.items[0].characterType, 'full_character');
  assert.equal(publicCharacters.items[0].faceReferencePolicy, 'replace_required');
  assert.equal(publicCharacters.items[0].outfitReferencePolicy, 'public_reusable');
  assert.equal(publicCharacters.items[0].handoffAvailable, true);
  assert.equal(Object.hasOwn(publicCharacters.items[0], 'ownerUserId'), false);
  assert.equal(Object.hasOwn(publicCharacters.items[0], 'sceneBuilderHandoffSnapshot'), false);
  assert.equal(Object.hasOwn(publicCharacters.items[0], 'sourceGenerationResultId'), false);

  const publicCharacter = await fixture.characterRepository.findPublicById(character.id);
  assert.equal(publicCharacter.id, character.id);
  assert.equal(Object.hasOwn(publicCharacter, 'sceneBuilderHandoffSnapshot'), false);

  const fallbackCharacter = await fixture.characterRepository.create({
    displayName: 'Fallback Character',
    characterType: 'legacy_character_sheet'
  }, fixture.bob);
  assert.equal(fallbackCharacter.characterType, 'full_character');
  assert.equal(fallbackCharacter.ownerUserId, 'usr_bob');
});
