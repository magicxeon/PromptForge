import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VideoProviderTaskRepository } from '../server/repositories/generation/VideoProviderTaskRepository.js';
import { VideoProviderTaskService } from '../server/domain/generation/VideoProviderTaskService.js';
import { VideoGenerationApplicationService } from '../server/domain/generation/VideoGenerationApplicationService.js';
import { recoveryState, projectVideoRecovery } from '../server/domain/generation/VideoTaskRecovery.js';
import { videoRecoveryPolicy } from '../server/config/videoRecoveryPolicy.js';

const actor = { userId: 'usr_recovery', username: 'user_recovery' };
const started = Date.parse('2026-09-13T00:00:00Z');
async function fixture(t, overrides = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'bounded-video-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const repository = new VideoProviderTaskRepository({ tasksFile: path.join(directory, 'tasks.json') });
  let now = started;
  let polls = 0;
  let copies = 0;
  const adapter = { poll: async id => { assert.equal(id, 'same-provider-task'); polls++; return { providerStatus: 'provider_processing' }; }, submit: () => assert.fail('must not resubmit') };
  const mediaPersister = { persistVideoOutput: async () => { copies++; return { publicUrl: '/outputs/retained.mp4' }; } };
  const service = new VideoProviderTaskService({ repository, adapter, mediaPersister, clock: () => now });
  const task = await repository.createAccepted({ id: 'video_recovery', ownerUserId: actor.userId,
    ownerUsername: actor.username, idempotencyKey: 'recovery:fixture', providerId: 'modelark', modelId: 'test-model',
    status: 'provider_processing', providerTaskId: 'same-provider-task', createdAt: new Date(started).toISOString(),
    submittedAt: new Date(started).toISOString(), reservationId: 'reservation_original', billingStatus: 'reserved', ...overrides });
  return { repository, service, adapter, mediaPersister, task, advance: ms => { now += ms; }, now: () => now, polls: () => polls, copies: () => copies };
}

test('healthy polling persists deadline and backoff across restart; equality stops without touching billing', async t => {
  const f = await fixture(t);
  const first = await f.service.pollTask(f.task.id);
  assert.equal(first.recovery.errorCount, 0);
  const restarted = new VideoProviderTaskService({ repository: new VideoProviderTaskRepository({ tasksFile: f.repository.tasksFile }), adapter: f.adapter, clock: f.now });
  assert.equal((await restarted.resumeRecoverable()).length, 0);
  await restarted.pollTask(f.task.id);
  assert.equal(f.polls(), 1);
  f.advance(videoRecoveryPolicy.stages.provider.maxElapsedMs);
  const stopped = await restarted.pollTask(f.task.id);
  assert.equal(stopped.status, 'reconciliation_required');
  assert.equal(stopped.providerError.code, 'video_recovery_deadline_elapsed');
  assert.equal(stopped.recovery.deadlineAt, first.recovery.deadlineAt);
  assert.equal(stopped.billingStatus, 'reserved');
  assert.equal(stopped.reservationId, 'reservation_original');
  assert.equal(f.polls(), 1);
});

test('transient errors consume durable retry budget with exponential capped backoff', async t => {
  const f = await fixture(t);
  f.adapter.poll = async () => { throw Object.assign(new Error('private'), { retryable: true, code: 'timeout' }); };
  let row;
  for (let index = 1; index <= 8; index++) {
    row = await f.service.pollTask(f.task.id);
    assert.equal(row.recovery.errorCount, index);
    assert.equal(Date.parse(row.recovery.nextCheckAt) - f.now(), Math.min(300_000, 5_000 * 2 ** (index - 1)));
    if (index < 8) {
      await f.service.pollTask(f.task.id);
      assert.equal((await f.repository.find(f.task.id)).recovery.errorCount, index);
      f.advance(Date.parse(row.recovery.nextCheckAt) - f.now());
    }
  }
  assert.equal(row.providerError.code, 'video_recovery_retry_exhausted');
  assert.equal(row.status, 'reconciliation_required');
  assert.doesNotMatch(JSON.stringify(row), /private/);
});

test('legacy timestamps, missing IDs and invalid evidence never renew recovery or resubmit', async t => {
  const f = await fixture(t, { providerTaskId: null, status: 'provider_submitting' });
  const stopped = await f.service.pollTask(f.task.id);
  assert.equal(stopped.providerError.code, 'video_provider_submission_state_unknown');
  assert.equal(projectVideoRecovery(stopped, f.now()).recheckAllowed, false);
  const old = { ...f.task, providerTaskId: 'same-provider-task', submittedAt: '2020-01-01T00:00:00Z', updatedAt: new Date().toISOString() };
  assert.equal(projectVideoRecovery(old, f.now()).status, 'reconciliation_required');
  assert.equal(projectVideoRecovery({ ...old, submittedAt: 'bad' }, f.now()).providerError.code, 'video_recovery_evidence_invalid');
  const state = recoveryState(old, f.now());
  assert.equal(state.startedAt, '2020-01-01T00:00:00.000Z');
  assert.equal(projectVideoRecovery({ ...old, status: 'unknown_internal_state' }, f.now()).automaticMonitoring, false);
});

test('concurrent startup/detail calls coalesce the provider poll and media copy across instances', async t => {
  const f = await fixture(t);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let polls = 0;
  f.adapter.poll = async () => { polls++; await gate; return { providerStatus: 'provider_succeeded', output: {}, usage: { outputSeconds: 4 } }; };
  const restarted = new VideoProviderTaskService({ repository: new VideoProviderTaskRepository({ tasksFile: f.repository.tasksFile }), adapter: f.adapter, mediaPersister: f.mediaPersister, clock: f.now });
  const detail = f.service.pollTask(f.task.id);
  const startup = restarted.resumeRecoverable();
  release();
  const [done] = await Promise.all([detail, startup]);
  assert.equal(done.status, 'completed');
  assert.equal(polls, 1);
  assert.equal(f.copies(), 1);
});

test('media retry retains output and uses its own immutable deadline and budget', async t => {
  const f = await fixture(t);
  f.adapter.poll = async () => ({ providerStatus: 'provider_succeeded', output: {}, usage: { outputSeconds: 4 } });
  f.mediaPersister.persistVideoOutput = async () => { throw Object.assign(new Error('poster'), { retryable: true, outputAsset: { publicUrl: '/outputs/partial.mp4' } }); };
  const first = await f.service.pollTask(f.task.id);
  assert.equal(first.status, 'media_retry_pending');
  assert.equal(first.recovery.stage, 'media');
  f.advance(10_000);
  const second = await f.service.pollTask(f.task.id);
  assert.equal(second.recovery.startedAt, first.recovery.startedAt);
  assert.equal(second.recovery.errorCount, 2);
  f.advance(videoRecoveryPolicy.stages.media.maxElapsedMs);
  const stopped = await f.service.pollTask(f.task.id);
  assert.equal(stopped.status, 'reconciliation_required');
  assert.equal(stopped.outputAsset.publicUrl, '/outputs/partial.mp4');
  assert.equal(stopped.providerUsage.outputSeconds, 4);
});

test('explicit same-task recheck is count/cooldown bounded and never restarts automatic monitoring', async t => {
  const f = await fixture(t);
  f.advance(videoRecoveryPolicy.stages.provider.maxElapsedMs);
  const first = await f.service.pollTask(f.task.id);
  for (let index = 1; index <= 3; index++) {
    const row = await f.service.pollTask(f.task.id, { recheck: true });
    assert.equal(row.status, 'reconciliation_required');
    assert.equal(row.recovery.explicitCheckCount, index);
    assert.equal(row.recovery.deadlineAt, first.recovery.deadlineAt);
    await assert.rejects(f.service.pollTask(f.task.id, { recheck: true }), { code: 'video_status_recheck_unavailable' });
    f.advance(60_000);
  }
  await assert.rejects(f.service.pollTask(f.task.id, { recheck: true }), { code: 'video_status_recheck_unavailable' });
  await f.service.pollTask(f.task.id);
  assert.equal(f.polls(), 3);
});

test('authorized late success uses existing settlement; refunded output stays review-required', async t => {
  for (const billingStatus of ['reserved', 'refunded']) {
    const f = await fixture(t, { billingStatus });
    f.advance(videoRecoveryPolicy.stages.provider.maxElapsedMs);
    await f.service.pollTask(f.task.id);
    let captures = 0;
    const application = new VideoGenerationApplicationService({ taskRepository: f.repository,
      providerTaskService: f.service, creditService: { captureForJob: async () => { captures++; }, refundForJob: () => assert.fail('no refund') } });
    await assert.rejects(application.getAndPoll(f.task.id, { userId: 'other' }, { recheck: true }), { code: 'video_task_not_found' });
    f.adapter.poll = async () => ({ providerStatus: 'provider_succeeded', output: {}, usage: { outputSeconds: 4 } });
    const row = await application.getAndPoll(f.task.id, actor, { recheck: true });
    assert.equal(row.status, billingStatus === 'reserved' ? 'completed' : 'reconciliation_required');
    assert.equal(row.outputAsset.publicUrl, '/outputs/retained.mp4');
    assert.equal(captures, billingStatus === 'reserved' ? 1 : 0);
    await application.getAndPoll(f.task.id, actor);
    assert.equal(captures, billingStatus === 'reserved' ? 1 : 0);
    assert.equal(row.recheckAllowed, false);
  }
});

test('actor activity counts past 24 recent records and projects expired work without writing', async t => {
  const f = await fixture(t);
  for (let i = 0; i < 30; i++) await f.repository.createAccepted({ ...f.task, id: `done_${i}`, idempotencyKey: `done:${i}`, status: 'completed' });
  await f.repository.createAccepted({ ...f.task, id: 'other', idempotencyKey: 'other:task', ownerUserId: 'other' });
  const before = await fs.readFile(f.repository.tasksFile, 'utf8');
  const page = await f.repository.listActivityForActor(actor, { limit: 2, project: row => projectVideoRecovery(row, f.now()) });
  assert.equal(page.activeCount, 1);
  assert.equal(page.items[0].id, f.task.id);
  assert.equal(page.hasMore, true);
  f.advance(videoRecoveryPolicy.stages.provider.maxElapsedMs);
  const expired = await f.repository.listActivityForActor(actor, { limit: 2, project: row => projectVideoRecovery(row, f.now()) });
  assert.equal(expired.activeCount, 0);
  assert.equal(expired.reviewRequiredCount, 1);
  assert.equal(expired.items[0].status, 'reconciliation_required');
  assert.equal(await fs.readFile(f.repository.tasksFile, 'utf8'), before);
});

test('late stale provider responses cannot overwrite a newer terminal decision', async t => {
  const f = await fixture(t);
  let release, entered;
  const startedPoll = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  f.adapter.poll = async () => { entered(); await gate; return { providerStatus: 'provider_succeeded', output: {}, usage: { outputSeconds: 4 } }; };
  const pending = f.service.pollTask(f.task.id);
  await startedPoll;
  await f.repository.update(f.task.id, draft => { draft.status = 'cancelled'; draft.recovery.checkId = 'newer-decision'; });
  release();
  const result = await pending;
  assert.equal(result.status, 'cancelled');
  assert.equal(f.copies(), 0);
  assert.equal(result.billingStatus, 'reserved');
});

test('concurrent application detail and startup recovery settle a single completion once', async t => {
  const f = await fixture(t);
  f.adapter.poll = async () => ({ providerStatus: 'provider_succeeded', output: {}, usage: { outputSeconds: 4 } });
  let captures = 0;
  const application = new VideoGenerationApplicationService({ taskRepository: f.repository, providerTaskService: f.service,
    creditService: { captureForJob: async () => { captures++; await new Promise(resolve => setTimeout(resolve, 20)); } } });
  await Promise.all([application.getAndPoll(f.task.id, actor), application.resumeRecoverable(), application.getAndPoll(f.task.id, actor)]);
  assert.equal(captures, 1);
  assert.equal(f.copies(), 1);
  assert.equal((await f.repository.find(f.task.id)).billingStatus, 'captured');
});

test('startup selection is bounded and skips backed-off rows without starving older eligible work', async t => {
  const f = await fixture(t);
  for (let i = 0; i < 28; i++) await f.repository.createAccepted({ ...f.task, id: `active_${i}`, idempotencyKey: `active:${i}`,
    recovery: { nextCheckAt: new Date(started + 60_000).toISOString() } });
  const eligible = await f.repository.listRecoverable({ limit: 24, now: started });
  assert.deepEqual(eligible.map(row => row.id), [f.task.id]);
  assert.equal((await f.repository.listRecoverable({ limit: 24, now: started + 60_000 })).length, 24);
});

test('persisted provider policy survives configuration changes and healthy checks spend no error budget', async t => {
  const f = await fixture(t);
  const first = await f.service.pollTask(f.task.id);
  f.service.recoveryPolicy = { ...videoRecoveryPolicy, version: 'changed', stages: {
    ...videoRecoveryPolicy.stages, provider: { ...videoRecoveryPolicy.stages.provider, maxElapsedMs: 1 }
  } };
  f.advance(5_000);
  const second = await f.service.pollTask(f.task.id);
  assert.equal(second.recovery.policyVersion, first.recovery.policyVersion);
  assert.equal(second.recovery.deadlineAt, first.recovery.deadlineAt);
  assert.equal(second.recovery.errorCount, 0);
  assert.equal(second.status, 'provider_processing');
});

test('automatic and explicit recovery share a bounded global provider concurrency limit', async t => {
  const f = await fixture(t);
  let release, entered;
  const gate = new Promise(resolve => { release = resolve; });
  const allEntered = new Promise(resolve => { entered = resolve; });
  let concurrent = 0;
  f.adapter.poll = async () => { concurrent++; if (concurrent === 4) entered(); await gate; return { providerStatus: 'provider_processing' }; };
  for (let i = 0; i < 5; i++) await f.repository.createAccepted({ ...f.task, id: `parallel_${i}`, idempotencyKey: `parallel:${i}` });
  const running = Array.from({ length: 4 }, (_, i) => f.service.pollTask(`parallel_${i}`));
  await allEntered;
  const deferred = await f.service.pollTask('parallel_4');
  assert.equal(deferred.status, 'provider_processing');
  assert.equal(concurrent, 4);
  release();
  await Promise.all(running);
  await f.service.pollTask('parallel_4');
  assert.equal(concurrent, 5);
});
