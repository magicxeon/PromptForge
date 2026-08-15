import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import test from 'node:test';
import { TemplatePoseProxyRepository } from '../server/repositories/template-pose-proxy/TemplatePoseProxyRepository.js';

test('TemplatePoseProxyRepository converges concurrent writes on one cache key', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-pose-proxy-'));
  const repository = new TemplatePoseProxyRepository({
    filePath: path.join(directory, 'poseProxies.json')
  });
  const base = {
    id: 'tpp_one',
    cacheKey: 'same-key',
    templateVersionId: 'tmplv_1',
    poseVariantId: 'default',
    status: 'pending'
  };
  const [first, second] = await Promise.all([
    repository.createIfAbsent(base),
    repository.createIfAbsent({ ...base, id: 'tpp_two' })
  ]);
  assert.equal(first.id, second.id);
  assert.equal([first.repositoryCreated, second.repositoryCreated].filter(Boolean).length, 1);
  assert.equal((await repository.readAll()).length, 1);
});

test('TemplatePoseProxyRepository resolves only active immutable version artifacts', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-pose-proxy-'));
  const repository = new TemplatePoseProxyRepository({
    filePath: path.join(directory, 'poseProxies.json')
  });
  await repository.createIfAbsent({
    id: 'tpp_active',
    cacheKey: 'active-key',
    templateVersionId: 'tmplv_1',
    poseVariantId: 'default',
    status: 'active',
    activatedAt: '2026-08-01T00:00:00.000Z'
  });
  assert.equal((await repository.findActiveForVersion('tmplv_1')).id, 'tpp_active');
  assert.equal(await repository.findActiveForVersion('tmplv_2'), null);
});
