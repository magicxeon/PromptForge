import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunityGalleryService } from '../server/domain/community/CommunityGalleryService.js';

const alice = { userId: 'usr_alice', username: 'user_alice', role: 'creator' };
const bob = { userId: 'usr_bob', username: 'user_bob', role: 'user' };

function memoryRepository(prefix) {
  const records = [];
  return {
    records,
    async create(input, actor) {
      const record = {
        ...structuredClone(input),
        id: `${prefix}_${records.length + 1}`,
        ownerUserId: actor.userId,
        ownerUsername: actor.username,
        status: 'active'
      };
      records.push(record);
      return structuredClone(record);
    },
    async findById(id) {
      return structuredClone(records.find(item => item.id === id) || null);
    },
    async findByOwner(ownerUserId) {
      return {
        items: structuredClone(records.filter(item => item.ownerUserId === ownerUserId))
      };
    },
    async listPublic() {
      return {
        items: structuredClone(records.filter(item => item.visibility === 'public')),
        nextCursor: null,
        hasMore: false
      };
    }
  };
}

function fixture() {
  const galleryRepository = memoryRepository('gal');
  const characterRepository = memoryRepository('char');
  const post = {
    id: 'post_alice',
    ownerUserId: alice.userId,
    ownerUsername: alice.username,
    status: 'published',
    title: 'Alice character',
    description: 'Reusable scene character',
    visibility: 'public',
    officialTags: ['fashion'],
    sceneTemplateSnapshot: {
      referenceSlotMapping: {
        face_reference: {
          sharePolicy: 'shared_as_reusable_reference',
          imageUrl: '/outputs/private-face.png'
        },
        outfit_reference: {
          sharePolicy: 'shared_as_reusable_reference',
          imageUrl: '/outputs/private-outfit.png'
        }
      },
      replaceableVariables: []
    }
  };
  return {
    galleryRepository,
    characterRepository,
    service: new CommunityGalleryService({
      galleryRepository,
      characterRepository,
      postRepository: {
        findById: async id => id === post.id ? structuredClone(post) : null
      },
      profileRepository: {
        findByHandle: async handle => handle === 'user-alice'
          ? { id: 'creator_alice', userId: alice.userId }
          : null
      },
      postAccessService: {},
      profileService: {
        ensureProfileForActor: async () => ({ id: 'creator_alice' })
      }
    })
  };
}

test('Community-09 curates a source post by pointer and rejects duplicates', async () => {
  const { service, galleryRepository } = fixture();
  await service.addGalleryItem({
    postId: 'post_alice',
    reusePolicy: 'use_as_template'
  }, alice);
  assert.equal(galleryRepository.records[0].sourceCommunityPostId, 'post_alice');
  assert.equal(Object.hasOwn(galleryRepository.records[0], 'imageBytes'), false);
  assert.equal(galleryRepository.records.length, 1);
  await assert.rejects(
    () => service.addGalleryItem({ postId: 'post_alice' }, alice),
    error => error.code === 'community_item_already_exists'
  );
});

test('Community-09 character handoff forces private face and outfit replacement', async () => {
  const { service } = fixture();
  const character = await service.createCharacter({
    postId: 'post_alice',
    displayName: 'Alice',
    faceReferencePolicy: 'private',
    outfitReferencePolicy: 'owner_only'
  }, alice);
  const handoff = await service.createCharacterHandoff(character.id, bob);
  assert.deepEqual(
    handoff.requiredUserReplacements.sort(),
    ['face_reference', 'outfit_reference']
  );
  assert.equal(
    handoff.sceneTemplateSnapshot.referenceSlotMapping.face_reference.imageUrl,
    undefined
  );
  assert.equal(JSON.stringify(handoff).includes('data:image/'), false);
});
