import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import {
  processDeterministicImage
} from '../server/domain/reference-processing/processors/deterministicImageProcessor.js';

test('Sharp normalization creates and reuses an actor-owned bounded derivative', async t => {
  const outputsDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'mpf-reference-processing-')
  );
  t.after(() => fs.rm(outputsDirectory, { recursive: true, force: true }));
  await sharp({
    create: {
      width: 2400,
      height: 3000,
      channels: 3,
      background: '#ffffff'
    }
  }).jpeg().toFile(path.join(outputsDirectory, 'source.jpg'));

  let derivative = null;
  let createCount = 0;
  const repository = {
    async findDerivativeForOwner(query) {
      return derivative?.ownerUserId === query.ownerUserId
        && derivative.metadata.inputFingerprint === query.inputFingerprint
        ? derivative
        : null;
    },
    async create(input, actorContext) {
      createCount += 1;
      derivative = {
        ...input,
        id: 'ast_derivative',
        ownerUserId: actorContext.userId
      };
      return derivative;
    }
  };
  const options = {
    asset: {
      id: 'ast_source',
      storageKey: 'source.jpg',
      publicUrl: '/outputs/source.jpg',
      mimeType: 'image/jpeg'
    },
    actorContext: { userId: 'usr_owner', username: 'owner' },
    repository,
    outputsDirectory,
    policyVersion: 'rpp-test'
  };

  const first = await processDeterministicImage(options);
  const second = await processDeterministicImage(options);

  assert.equal(createCount, 1);
  assert.equal(first.derivativeAssetId, 'ast_derivative');
  assert.equal(second.derivativeAssetId, 'ast_derivative');
  assert.equal(derivative.ownerUserId, 'usr_owner');
  assert.equal(derivative.metadata.sourceAssetId, 'ast_source');
  assert.equal(derivative.metadata.policyVersion, 'rpp-test');
  assert.ok(Math.max(derivative.width, derivative.height) <= 2048);
});
