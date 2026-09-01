import assert from 'node:assert/strict';
import { promises as fs } from 'fs';
import os from 'node:os';
import path from 'path';
import sharp from 'sharp';
import test from 'node:test';
import { ReferenceAssetService } from '../server/domain/assets/ReferenceAssetService.js';
import { resolveReferenceForProvider } from '../server/domain/generation/referenceUtils.js';

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+4f0YVQAAAABJRU5ErkJggg==';

test('registered references are persisted as actor-owned assets and resolved without Base64 transport', async t => {
  const outputsDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-reference-assets-'));
  t.after(() => fs.rm(outputsDirectory, { recursive: true, force: true }));
  const actor = {
    userId: `usr_reference_test_${Date.now()}`,
    username: 'reference_test'
  };
  let savedAsset = null;
  const repository = {
    async create(input) {
      savedAsset = {
        id: 'ast_reference_test',
        ownerUserId: actor.userId,
        ...input
      };
      return savedAsset;
    },
    async findByPublicUrlForOwner(publicUrl, ownerUserId) {
      return savedAsset?.publicUrl === publicUrl && savedAsset.ownerUserId === ownerUserId
        ? savedAsset
        : null;
    }
  };
  const service = new ReferenceAssetService({ repository, outputsDirectory });
  const reference = await service.storeReference({
    dataUrl: PNG_DATA_URL,
    role: 'style_reference',
    sourceMode: 'test'
  }, actor);

  assert.equal(reference.referenceId, 'ast_reference_test');
  assert.match(reference.imageUrl, /^\/outputs\/references\//);
  assert.equal(reference.width, 1);
  assert.equal(reference.height, 1);
  assert.equal(reference.imageUrl.includes('base64'), false);

  const resolved = await resolveReferenceForProvider(reference.imageUrl, actor.username, {
    ownerUserId: actor.userId,
    assetRepository: repository,
    outputsDirectory
  });
  assert.match(resolved, /^data:image\/png;base64,/);

  const blocked = await resolveReferenceForProvider(reference.imageUrl, 'other_user', {
    ownerUserId: 'usr_other',
    assetRepository: repository,
    outputsDirectory
  });
  assert.equal(blocked, null);
});

test('registered reference upload rejects bytes that are not an image', async () => {
  const service = new ReferenceAssetService({
    repository: { create: async input => ({ id: 'unused', ...input }) }
  });
  await assert.rejects(
    service.storeReference({
      dataUrl: 'data:image/png;base64,bm90LWFuLWltYWdl',
      role: 'face_reference'
    }, { userId: 'usr_invalid', username: 'invalid' }),
    error => error.code === 'invalid_reference'
  );
});

test('registered reference upload rejects unknown reference roles before writing a file', async () => {
  let repositoryCalled = false;
  const service = new ReferenceAssetService({
    repository: {
      create: async input => {
        repositoryCalled = true;
        return { id: 'unused', ...input };
      }
    }
  });
  await assert.rejects(
    service.storeReference({
      dataUrl: PNG_DATA_URL,
      role: 'untrusted_reference_role'
    }, { userId: 'usr_invalid_role', username: 'invalid_role' }),
    error => error.code === 'invalid_reference_role'
  );
  assert.equal(repositoryCalled, false);
});

test('owned wardrobe piece Assets are normalized into one reusable composite reference', async t => {
  const outputsDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-reference-composite-'));
  t.after(() => fs.rm(outputsDirectory, { recursive: true, force: true }));
  const actor = { userId: 'usr_composite_owner', username: 'composite_owner' };
  const records = new Map();
  let sequence = 0;
  const repository = {
    async create(input) {
      const record = {
        id: `ast_composite_${++sequence}`,
        ownerUserId: actor.userId,
        status: 'active',
        ...input
      };
      records.set(record.id, record);
      return record;
    },
    async findByIdForOwner(id, ownerUserId) {
      const record = records.get(id);
      return record?.ownerUserId === ownerUserId ? record : null;
    }
  };
  const service = new ReferenceAssetService({ repository, outputsDirectory });
  const validPng = await sharp({
    create: { width: 8, height: 8, channels: 4, background: '#336699' }
  }).png().toBuffer();
  const validPngDataUrl = `data:image/png;base64,${validPng.toString('base64')}`;
  const upper = await service.storeReference({
    dataUrl: validPngDataUrl, role: 'outfit_front', sourceMode: 'character-look-upper'
  }, actor);
  const lower = await service.storeReference({
    dataUrl: validPngDataUrl, role: 'outfit_front', sourceMode: 'character-look-lower'
  }, actor);

  const composite = await service.composeReference({
    sourceAssetIds: [upper.referenceId, lower.referenceId],
    role: 'outfit_front'
  }, actor);
  const record = records.get(composite.referenceId);

  assert.equal(composite.width, 1024);
  assert.equal(composite.height, 1024);
  assert.equal(record.assetType, 'generation_reference_derivative');
  assert.equal(record.metadata.compositeKind, 'wardrobe_piece_contact_sheet');
  assert.deepEqual(record.metadata.sourceAssetIds, [upper.referenceId, lower.referenceId]);
  assert.equal((await fs.stat(path.join(outputsDirectory, record.storageKey))).isFile(), true);
});

test('composite reference rejects an Asset outside the active actor scope', async () => {
  const service = new ReferenceAssetService({
    repository: { findByIdForOwner: async () => null }
  });
  await assert.rejects(
    service.composeReference({
      sourceAssetIds: ['ast_other_1', 'ast_other_2'],
      role: 'outfit_front'
    }, { userId: 'usr_owner', username: 'owner' }),
    error => error.code === 'reference_asset_not_authorized' && error.statusCode === 403
  );
});
