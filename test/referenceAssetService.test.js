import assert from 'node:assert/strict';
import { promises as fs } from 'fs';
import os from 'node:os';
import path from 'path';
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
