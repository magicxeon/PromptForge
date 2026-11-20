import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GenerationApplicationService } from '../server/domain/generation/GenerationApplicationService.js';
import { CreditApplicationService } from '../server/domain/credits/CreditApplicationService.js';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';
import { GenerationGroupRepository } from '../server/repositories/generation/GenerationGroupRepository.js';
import { registerGenerationRoutes } from '../server/app/routes/generationRoutes.js';

const actor = { userId: 'owner', username: 'owner-name', isMockActor: true };
const requestId = 'request_1';
const reservation = (overrides = {}) => ({ userId: actor.userId, requestId, jobId: 'job_1', ...overrides });
const groupRecord = (overrides = {}) => ({ id: 'group_1', requestId, actorUserId: actor.userId,
  requestedOutputCount: 2, childJobIds: ['job_1', 'job_2'], children: [], ...overrides });

async function fixture(t, { reservations = [], groups = [], jobs = ['job_1', 'job_2'] } = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-request-recovery-'));
  const databaseFile = path.join(directory, 'credits.json');
  const groupsFile = path.join(directory, 'groups.json');
  // Legacy shape deliberately proves recovery never invokes migration.
  await fs.writeFile(databaseFile, JSON.stringify({ users: { legacy: { credits: 12 } }, reservations }));
  await fs.writeFile(groupsFile, JSON.stringify(groups));
  const before = await Promise.all([fs.readFile(databaseFile), fs.readFile(groupsFile)]);
  const beforeStats = await Promise.all([fs.stat(databaseFile), fs.stat(groupsFile)]);
  const accountRepository = new CreditAccountRepository({ databaseFile, userRepository: {} });
  const generationGroupRepository = new GenerationGroupRepository({ groupsFile });
  let sideEffects = 0;
  const forbidden = () => { sideEffects++; throw new Error('Recovery attempted a mutation or provider call'); };
  accountRepository.readRaw = forbidden;
  accountRepository.reserveCredits = forbidden;
  accountRepository.migrateLegacyDataIfNeeded = forbidden;
  generationGroupRepository.update = forbidden;
  generationGroupRepository.create = forbidden;
  const service = new GenerationApplicationService({
    creditService: new CreditApplicationService({ accountRepository,
      reservationService: { validateAndReserveForRequest: forbidden, refundForJob: forbidden, captureForJob: forbidden } }),
    generationGroupRepository, providerRegistry: { resolveSelection: forbidden, assertRuntimeAvailable: forbidden },
    queueManager: { createJobId: forbidden, enqueue: forbidden,
      getJobStatusForUser: async (id, username, context) => {
        assert.equal(context.userId, actor.userId);
        assert.equal(context.isMockActor, false, 'Recovery requires stable ownership even for mock actors');
        assert.equal(username, actor.username);
        return jobs.includes(id) ? { id, status: 'queued' } : null;
      } }
  });
  t.after(async () => {
    assert.equal(sideEffects, 0);
    const after = await Promise.all([fs.readFile(databaseFile), fs.readFile(groupsFile)]);
    assert.deepEqual(after, before, 'No Credit or group bytes changed');
    const afterStats = await Promise.all([fs.stat(databaseFile), fs.stat(groupsFile)]);
    assert.deepEqual(afterStats.map(item => item.mtimeMs), beforeStats.map(item => item.mtimeMs));
  });
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return { service, accountRepository, databaseFile };
}

test('owned single request resolves only to observable owner job, without writes or paid calls', async t => {
  const { service, accountRepository } = await fixture(t, { reservations: [reservation({ pricingSnapshot: { secret: 'private' } })] });
  assert.deepEqual(await service.getImageRequestStatus(requestId, actor),
    { state: 'found', requestId, jobId: 'job_1', groupId: null });
  assert.deepEqual(await accountRepository.findImageRequestMappings({ userId: actor.userId, requestId }),
    [{ userId: actor.userId, requestId, jobId: 'job_1', groupId: null, grouped: false }]);
});

test('unknown and foreign requests are indistinguishable and do not expose other operations', async t => {
  const reservations = [reservation({ userId: 'foreign' }),
    ...['speech_generation', 'cinematic_text', 'look_sheet_enhancement'].map(kind => reservation({ metadata: { kind } })),
    reservation({ metadata: { planKind: 'comparison' } })];
  const { service } = await fixture(t, { reservations, groups: [groupRecord({ actorUserId: 'foreign' })] });
  assert.deepEqual(await service.getImageRequestStatus(requestId, actor), { state: 'unknown', requestId });
  assert.deepEqual(await service.getImageRequestStatus('missing', actor), { state: 'unknown', requestId: 'missing' });
});

test('reservation gaps, unavailable owner jobs and ambiguous mappings require reconciliation', async t => {
  for (const reservations of [[reservation({ jobId: null })], [reservation({ jobId: 'missing' })],
    [reservation(), reservation()],
    [reservation({ requestId: `${requestId}:output:0`, metadata: { planKind: 'generation_group', planId: 'missing_group' } })],
    [reservation(), reservation({ requestId: `${requestId}:output:0`, metadata: { planKind: 'generation_group', planId: 'group_1' } })]]) {
    const { service } = await fixture(t, { reservations });
    assert.deepEqual(await service.getImageRequestStatus(requestId, actor), { state: 'reconciliation_required', requestId });
  }
});

test('owned group lookup precedes Credits and returns bounded IDs; orphan and invalid groups reconcile', async t => {
  const { service } = await fixture(t, { groups: [groupRecord()] });
  service.creditService.findImageRequestMappings = () => { throw new Error('Group mapping should be used first'); };
  assert.deepEqual(await service.getImageRequestStatus(requestId, actor),
    { state: 'found', requestId, jobId: 'job_1', groupId: 'group_1', childJobIds: ['job_1', 'job_2'] });
  for (const group of [groupRecord(), groupRecord({ childJobIds: ['job_1', 'job_1'] }), groupRecord({ requestedOutputCount: 3 })]) {
    const { service: orphan } = await fixture(t, { groups: [group], jobs: [] });
    assert.equal((await orphan.getImageRequestStatus(requestId, actor)).state, 'reconciliation_required');
  }
});

test('missing Credit file stays missing; actor and bounded ID validation run before lookup', async t => {
  const { service, accountRepository, databaseFile } = await fixture(t);
  accountRepository.databaseFile = `${databaseFile}.missing`;
  assert.deepEqual(await accountRepository.findImageRequestMappings({ userId: actor.userId, requestId }), []);
  await assert.rejects(fs.access(accountRepository.databaseFile), { code: 'ENOENT' });
  await assert.rejects(service.getImageRequestStatus(requestId, null), { code: 'actor_required' });
  for (const invalid of ['', '../secret', 'x'.repeat(161), null]) {
    await assert.rejects(service.getImageRequestStatus(invalid, actor), { code: 'generation_request_id_invalid' });
  }
});

test('HTTP lookup uses actorContext, is private no-store, and sanitizes failures', async t => {
  const { service } = await fixture(t, { reservations: [reservation()] });
  const handlers = new Map();
  registerGenerationRoutes({ get: (url, handler) => handlers.set(url, handler), post: () => {} },
    { generationApplicationService: service });
  const handler = handlers.get('/api/generation/requests/:requestId');
  const invoke = async (context, id = requestId) => {
    const response = { statusCode: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; },
      status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ params: { requestId: id }, actorContext: context, query: { username: 'foreign' } }, response);
    assert.equal(response.headers['Cache-Control'], 'private, no-store');
    return response;
  };
  assert.equal((await invoke(actor)).body.state, 'found');
  assert.equal((await invoke(null)).statusCode, 401);
  assert.equal((await invoke(actor, '../secret')).statusCode, 400);
  service.getImageRequestStatus = () => { throw new Error('private storage path'); };
  const failed = await invoke(actor);
  assert.equal(failed.statusCode, 503);
  assert.equal(failed.body.error.code, 'generation_request_lookup_unavailable');
  assert.ok(!JSON.stringify(failed.body).includes('private storage path'));
});
