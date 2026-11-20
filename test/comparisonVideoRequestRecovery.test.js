import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ComparisonOrchestrator } from '../server/domain/comparisons/ComparisonOrchestrator.js';
import { ComparisonRepository } from '../server/repositories/comparisons/ComparisonRepository.js';
import { VideoGenerationApplicationService } from '../server/domain/generation/VideoGenerationApplicationService.js';
import { VideoProviderTaskRepository } from '../server/repositories/generation/VideoProviderTaskRepository.js';
import { registerComparisonRoutes } from '../server/app/routes/comparisonRoutes.js';
import { registerVideoGenerationRoutes } from '../server/app/routes/videoGenerationRoutes.js';

const actor = { userId: 'owner', username: 'shared-name' };
const key = 'request_key_123';
const forbidden = () => { throw new Error('Recovery attempted a side effect'); };
const sideEffects = new Proxy({}, { get: () => forbidden });

async function fixture(t, { sets = [], tasks = [] } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-comparison-video-recovery-'));
  const comparisonsFile = path.join(dir, 'comparisons.json'), tasksFile = path.join(dir, 'tasks.json');
  await fs.writeFile(comparisonsFile, JSON.stringify({ version: 1, sets }));
  await fs.writeFile(tasksFile, JSON.stringify({ schemaVersion: 1, tasks }));
  const files = [comparisonsFile, tasksFile];
  const before = await Promise.all(files.map(file => fs.readFile(file)));
  const stats = await Promise.all(files.map(file => fs.stat(file)));
  const repository = new ComparisonRepository({ comparisonsFile });
  repository.mutate = forbidden;
  const taskRepository = new VideoProviderTaskRepository({ tasksFile });
  taskRepository.update = forbidden;
  taskRepository.createAccepted = forbidden;
  const comparison = new ComparisonOrchestrator({ repository, providerRegistry: {},
    generationApplicationService: {}, creditReservation: sideEffects });
  const video = new VideoGenerationApplicationService({ taskRepository, creditService: sideEffects, providerTaskService: sideEffects });
  t.after(async () => {
    try {
      assert.deepEqual(await Promise.all(files.map(file => fs.readFile(file))), before);
      assert.deepEqual((await Promise.all(files.map(file => fs.stat(file)))).map(s => s.mtimeMs), stats.map(s => s.mtimeMs));
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
  });
  return { comparison, video, repository, taskRepository, dir };
}

const set = (ownerUserId = actor.userId) => ({ id: 'set_1', ownerUserId, username: actor.username,
  sourcePrompt: 'private', runs: [{ id: 'run_1', idempotencyKey: key, sourcePrompt: 'private' }] });
const task = (ownerUserId = actor.userId) => ({ id: 'task_1', ownerUserId, idempotencyKey: key, prompt: 'private', status: 'provider_queued' });

test('Comparison and Video return only owned durable IDs without writes, polling or Credit calls', async t => {
  const { comparison, video } = await fixture(t, { sets: [set()], tasks: [task()] });
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(await comparison.getRequestStatus(key, actor), { state: 'found', requestId: key, setId: 'set_1', runId: 'run_1' });
    assert.deepEqual(await video.getRequestStatus(key, actor), { state: 'found', requestId: key, taskId: 'task_1' });
  }
  assert.deepEqual(comparison.getPolicy(), { minimumSlots: 2, maximumSlots: 4 });
});

test('unknown, foreign and username-only legacy mappings are indistinguishable', async t => {
  const { comparison, video } = await fixture(t, { sets: [set('foreign'), set(null)], tasks: [task('foreign'), task(null)] });
  for (const service of [comparison, video]) for (const requestId of [key, 'missing_key']) {
    assert.deepEqual(await service.getRequestStatus(requestId, actor), { state: 'unknown', requestId });
  }
});

test('incomplete mappings and ambiguous Comparison mappings require reconciliation', async t => {
  const incomplete = set(); incomplete.runs[0].id = null;
  const { comparison, video } = await fixture(t, { sets: [incomplete], tasks: [{ ...task(), id: null }] });
  for (const service of [comparison, video]) assert.deepEqual(await service.getRequestStatus(key, actor), { state: 'reconciliation_required', requestId: key });
  const ambiguous = await fixture(t, { sets: [set(), { ...set(), id: 'set_2' }] });
  assert.equal((await ambiguous.comparison.getRequestStatus(key, actor)).state, 'reconciliation_required');
});

test('actor and bounded request validation precede repository access; missing stores stay missing', async t => {
  const f = await fixture(t);
  f.repository.comparisonsFile = path.join(f.dir, 'missing-comparisons.json');
  f.taskRepository.tasksFile = path.join(f.dir, 'missing-tasks.json');
  for (const service of [f.comparison, f.video]) {
    assert.deepEqual(await service.getRequestStatus(key, actor), { state: 'unknown', requestId: key });
    await assert.rejects(service.getRequestStatus(key, null), { statusCode: 401 });
    for (const invalid of ['', '../secret', 'x'.repeat(201), null, ['request_key']]) {
      await assert.rejects(service.getRequestStatus(invalid, actor), { statusCode: 400 });
    }
  }
  await assert.rejects(fs.access(f.repository.comparisonsFile), { code: 'ENOENT' });
  await assert.rejects(fs.access(f.taskRepository.tasksFile), { code: 'ENOENT' });
});

test('request routes use authenticated actor, private no-store and preserve feature gates', async t => {
  const { comparison, video } = await fixture(t, { sets: [set()], tasks: [task()] });
  const handlers = new Map();
  const app = { get: (url, handler) => handlers.set(url, handler), post() {}, patch() {}, delete() {} };
  registerComparisonRoutes(app, { comparisonOrchestrator: comparison });
  let enabled = true;
  registerVideoGenerationRoutes(app, { videoGenerationService: video, communityFeaturePolicyService: {
    async assertEnabled() { if (!enabled) throw Object.assign(new Error('Feature unavailable'), { statusCode: 403 }); }
  } });
  const invoke = async (url, context = actor) => {
    const res = { statusCode: 200, headers: {}, set(k, v) { this.headers[k] = v; return this; },
      status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handlers.get(url)({ params: { requestId: key }, actorContext: context, query: { userId: 'foreign' } }, res);
    assert.equal(res.headers['Cache-Control'], 'private, no-store');
    return res;
  };
  for (const url of ['/api/comparisons/requests/:requestId', '/api/generation/video/requests/:requestId']) {
    assert.equal((await invoke(url)).body.state, 'found');
    assert.equal((await invoke(url, { userId: 'foreign', username: actor.username })).body.state, 'unknown');
    assert.equal((await invoke(url, null)).statusCode, 401);
  }
  assert.deepEqual((await invoke('/api/comparisons/policy')).body, { minimumSlots: 2, maximumSlots: 4 });
  enabled = false;
  assert.equal((await invoke('/api/generation/video/requests/:requestId')).statusCode, 403);
  enabled = true;
  video.getRequestStatus = async () => { throw new Error('private/path/secret'); };
  const failed = await invoke('/api/generation/video/requests/:requestId');
  assert.equal(failed.statusCode, 503);
  assert.doesNotMatch(JSON.stringify(failed.body), /private\/path/);
});
