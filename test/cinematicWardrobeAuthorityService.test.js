import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicWardrobeAuthorityService } from '../server/domain/assets/CinematicWardrobeAuthorityService.js';

const alice = { userId: 'usr_alice', username: 'alice', role: 'user' };

test('CinematicWardrobeAuthorityService accepts a Character default without media Assets', async () => {
  const service = new CinematicWardrobeAuthorityService({
    assetRepository: { findByIdForOwner: async () => { throw new Error('must not read Assets'); } }
  });
  assert.deepEqual(await service.authorizeLook({ mode: 'character_default' }, alice), {
    mode: 'character_default', assets: []
  });
});

test('CinematicWardrobeAuthorityService snapshots only owned available uploaded Assets', async () => {
  const service = new CinematicWardrobeAuthorityService({
    assetRepository: {
      findByIdForOwner: async (id, ownerUserId) => ownerUserId === alice.userId && id === 'asset_front'
        ? { id, assetType: 'image', contentHash: 'hash_front', status: 'active' }
        : null
    }
  });
  assert.deepEqual(await service.authorizeLook({ mode: 'uploaded', assetIds: ['asset_front'] }, alice), {
    mode: 'uploaded',
    assets: [{ id: 'asset_front', assetType: 'image', contentHash: 'hash_front' }]
  });
  await assert.rejects(
    service.authorizeLook({ mode: 'uploaded', assetIds: ['asset_other_owner'] }, alice),
    error => error.code === 'cinematic_wardrobe_asset_forbidden'
  );
});

test('CinematicWardrobeAuthorityService rejects empty, deleted and excessive uploaded references', async () => {
  const service = new CinematicWardrobeAuthorityService({
    assetRepository: {
      findByIdForOwner: async id => ({ id, assetType: 'image', contentHash: null, status: 'deleted' })
    }
  });
  await assert.rejects(
    service.authorizeLook({ mode: 'uploaded', assetIds: [] }, alice),
    error => error.code === 'cinematic_wardrobe_assets_required'
  );
  await assert.rejects(
    service.authorizeLook({ mode: 'uploaded', assetIds: ['asset_deleted'] }, alice),
    error => error.code === 'cinematic_wardrobe_asset_forbidden'
  );
  await assert.rejects(
    service.authorizeLook({ mode: 'uploaded', assetIds: ['1', '2', '3', '4', '5'] }, alice),
    error => error.code === 'cinematic_wardrobe_assets_required'
  );
});
