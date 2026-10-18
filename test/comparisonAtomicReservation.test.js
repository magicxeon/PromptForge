import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import syncFs, { readFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
// Install filesystem confinement before any application imports. This test
// never qualifies default workspace repositories, even if a constructor changes.
const tempParent = await fs.realpath(os.tmpdir()), fixtureRoots = new Set();
const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
const inside = (target, root) => target === root || target.startsWith(root + path.sep);
const writable = target => assert.ok([...fixtureRoots].some(root => inside(path.resolve(String(target)), root)),
  'Atomic Comparison write escaped its owned temporary fixture.');
const createTemp = fs.mkdtemp.bind(fs);
fs.mkdtemp = async prefix => {
  assert.equal(path.dirname(path.resolve(prefix)), tempParent);
  assert.equal(path.basename(prefix), 'mpf-comparison-atomic-');
  const root = await createTemp(prefix); fixtureRoots.add(root); return root;
};
for (const method of ['mkdir', 'writeFile', 'appendFile', 'rm', 'unlink', 'rename', 'copyFile', 'truncate']) {
  for (const [owner, name] of [[syncFs, method], [syncFs, method + 'Sync'], [fs, method]]) {
    const original = owner[name]; if (typeof original !== 'function') continue;
    owner[name] = function (...args) {
      writable(args[0]); if (['rename', 'copyFile'].includes(method)) writable(args[1]);
      return Reflect.apply(original, this, args);
    };
  }
}
for (const [owner, name] of [[syncFs, 'readFile'], [syncFs, 'readFileSync'], [fs, 'readFile']]) {
  const original = owner[name];
  owner[name] = function (...args) {
    if (typeof args[0] === 'string' || args[0] instanceof URL) {
      const resolved = path.resolve(args[0] instanceof URL ? fileURLToPath(args[0]) : args[0]);
      for (const forbidden of ['server/data', 'client/outputs', '.env', '.env.local'])
        assert.ok(!inside(resolved, path.join(sourceRoot, forbidden)), 'Actual runtime or environment read denied.');
    }
    return Reflect.apply(original, this, args);
  };
}
syncBuiltinESMExports();
// Eager availability-policy constructors must resolve fixture paths too.
const bootstrapRoot = await fs.mkdtemp(path.join(tempParent, 'mpf-comparison-atomic-'));
const { setupDevelopmentFixture } = await import('../scripts/authentication/setup-development.mjs');
await setupDevelopmentFixture(bootstrapRoot);
const { initializeAuthRuntime } = await import('../server/config/authPolicy.js');
initializeAuthRuntime({ AUTH_DEV_BYPASS_ENABLED: 'true', NODE_ENV: 'development' }, bootstrapRoot);
test.after(async () => {
  assert.equal(path.dirname(await fs.realpath(bootstrapRoot)), tempParent);
  assert.equal((await fs.lstat(bootstrapRoot)).isSymbolicLink(), false);
  await fs.rm(bootstrapRoot, { recursive: true });
});
const { CreditReservationService } = await import('../server/domain/credits/CreditReservationService.js');
const { CreditAccountRepository } = await import('../server/repositories/credits/CreditAccountRepository.js');
const { GenerationApplicationService } = await import('../server/domain/generation/GenerationApplicationService.js');
const { ComparisonOrchestrator } = await import('../server/domain/comparisons/ComparisonOrchestrator.js');
const { ComparisonRepository } = await import('../server/repositories/comparisons/ComparisonRepository.js');
const { compileGenerationContext } = await import('../server/domain/generation/generationRequestService.js');

async function fixture(work, { balance = 200, count = 2, failEnqueue = 0, failPersistence = 0 } = {}) {
  const parent = await fs.realpath(os.tmpdir()), root = await fs.mkdtemp(path.join(parent, 'mpf-comparison-atomic-'));
  try {
    const actor = { userId: 'fixture_actor', username: 'fixture_actor', role: 'user' };
    const databaseFile = path.join(root, 'credits.json'), comparisonsFile = path.join(root, 'comparisons.json');
    const model = { id: 'fixture-model', displayName: { en: 'Fixture model' }, capabilities: { imageGeneration: true, resolutions: ['1K'] } };
    const provider = { id: 'fixture-provider' }, calls = [], jobs = new Map(); let jobSequence = 0, enqueueSequence = 0;
    const registry = { getConfigVersion: () => 1, resolveSelection: () => ({ provider, model }), validateRequest() {},
      assertRuntimeAvailable() {}, shouldStream: () => false };
    const payload = { mode: 'normal', aspectRatio: '1:1', imageResolution: '1K', idempotencyKey: 'fixture_comparison_once',
      slots: Array.from({ length: count }, (_, i) => ({ id: `slot_${i}`, provider: provider.id, model: model.id })) };
    const { context } = compileGenerationContext(payload, actor);
    const estimates = payload.slots.map((slot, i) => ({ estimateId: `est_${i}`, userId: actor.userId,
      estimatedCredits: 50, pricingPolicyVersion: 'fixture-v1', expiresAt: new Date(Date.now()+60000).toISOString(),
      routing: { requestedProviderId: provider.id, requestedModelId: model.id, routingMode: 'advanced', qualityTier: 'standard' },
      pricingInputs: { resolution: '1K', aspectRatio: context.aspectRatio, quality: null, referenceCount: 0, outputCount: 1,
        generationMode: 'normal', templateUseSessionId: null }, breakdown: {} }));
    await fs.writeFile(databaseFile, JSON.stringify({ schemaVersion: 2, accounts: [{ userId: actor.userId, username: actor.username,
      status: 'active', availableCredits: balance, reservedCredits: 0 }], estimates, reservations: [], ledgerEntries: [] }));
    const accountRepo = new CreditAccountRepository({ databaseFile, userRepository: { findById: async () => actor } });
    const credits = new CreditReservationService({ accountRepo, pricingPolicyService: {} });
    const repository = new ComparisonRepository({ comparisonsFile, historyFile: path.join(root, 'history.json') });
    const queue = { subscribeLifecycle: () => () => {}, createJobId: () => `job_fixture_${jobSequence++}`, getJobStatus: id => jobs.get(id) || null,
      enqueue(providerId, modelId, prompt, options) {
        const wallet = JSON.parse(readFileSync(databaseFile, 'utf8'));
        assert.equal(wallet.reservations.length, count, 'All slot reservations precede the first enqueue.');
        const run = JSON.parse(readFileSync(comparisonsFile, 'utf8')).sets[0].runs[0];
        assert.ok(run.slots.every(slot => slot.jobId && slot.reservationId), 'All durable slot bindings precede dispatch.');
        if (++enqueueSequence === failEnqueue) throw new Error('Injected pre-acceptance enqueue failure.');
        calls.push(options); jobs.set(options.jobId, { status: 'queued' }); return options.jobId;
      } };
    const generation = new GenerationApplicationService({ providerRegistry: registry, queueManager: queue, creditService: credits,
      promptRefinementService: {} });
    generation.compilePromptForExecution = async () => ({ prompt: 'Private deterministic fixture prompt', metadata: null, audit: null });
    const orchestrator = new ComparisonOrchestrator({ providerRegistry: registry, generationApplicationService: generation,
      creditReservation: credits, repository, creditManager: { getNetJobCosts: async () => new Map() } });
    orchestrator.processReferencesForSlots = async () => {}; // This focused test supplies zero references.
    const slots = orchestrator.validator.validateSlots(payload.slots, context).map((slot, i) => ({ ...slot,
      estimateId: estimates[i].estimateId, estimatedCredit: estimates[i].estimatedCredits, estimateExpiresAt: estimates[i].expiresAt }));
    const quote = orchestrator.validator.createEstimate(slots, context, actor.userId);
    Object.assign(payload, { estimateToken: quote.estimateToken, estimateExpiresAt: quote.expiresAt,
      creditEstimates: slots.map(slot => ({ slotId: slot.id, estimateId: slot.estimateId, estimatedCredit: slot.estimatedCredit, estimateExpiresAt: slot.estimateExpiresAt })) });
    if (failPersistence) {
      let updates = 0; const update = repository.updateRun.bind(repository);
      repository.updateRun = (...args) => { if (++updates === failPersistence) throw new Error('Injected binding persistence failure.'); return update(...args); };
    }
    await work({ actor, payload, orchestrator, credits, accountRepo, repository, calls, jobs, estimates, registry, generation });
  } finally {
    assert.equal(path.dirname(await fs.realpath(root)), parent); assert.equal((await fs.lstat(root)).isSymbolicLink(), false);
    await fs.rm(root, { recursive: true });
  }
}

test('Comparison total affordability is atomic: wallet60, two50 quotes, zero enqueue and zero debit', async () => {
  await fixture(async ({ orchestrator, payload, actor, accountRepo, calls }) => {
    await assert.rejects(orchestrator.create(payload, actor), { code: 'credit_insufficient' });
    const data = await accountRepo.readRaw(); assert.equal(calls.length, 0); assert.equal(data.reservations.length, 0);
    assert.equal(data.ledgerEntries.length, 0); assert.equal(data.accounts[0].availableCredits, 60);
    assert.equal(data.accounts[0].reservedCredits, 0);
  }, { balance: 60 });
});

test('Comparison second locked quote mismatch denies all reservations and dispatch', async () => {
  await fixture(async ({ orchestrator, payload, actor, accountRepo, credits, estimates, calls }) => {
    credits.estimateCache.set(estimates[1].estimateId, { ...estimates[1], pricingInputs: { ...estimates[1].pricingInputs, quality: 'tampered' } });
    await assert.rejects(orchestrator.create(payload, actor), { code: 'credit_estimate_stale' });
    const data = await accountRepo.readRaw(); assert.equal(calls.length, 0); assert.equal(data.reservations.length, 0);
    assert.equal(data.accounts[0].availableCredits, 200);
  });
});

test('Comparison second provider preflight failure produces zero reservation/dispatch', async () => {
  await fixture(async ({ orchestrator, payload, actor, accountRepo, registry, calls }) => {
    let validations = 0; registry.assertRuntimeAvailable = () => { if (++validations === 2) throw new Error('Unqualified second runtime.'); };
    await assert.rejects(orchestrator.create(payload, actor), /Unqualified second runtime/);
    assert.equal(calls.length, 0); assert.equal((await accountRepo.readRaw()).reservations.length, 0);
  });
});

test('Comparison replay preserves original jobs/reservations and independent capture/refund', async () => {
  await fixture(async ({ orchestrator, payload, actor, accountRepo, calls, credits }) => {
    const created = await orchestrator.create(payload, actor);
    const replay = await orchestrator.create(payload, actor);
    assert.equal(replay.idempotentReplay, true); assert.equal(replay.runId, created.runId); assert.equal(calls.length, 2);
    let data = await accountRepo.readRaw(); assert.equal(data.reservations.length, 2); assert.equal(data.accounts[0].reservedCredits, 100);
    for (const reservation of data.reservations) {
      assert.equal(reservation.metadata.comparisonSetId, created.setId);
      assert.equal(reservation.metadata.comparisonRunId, created.runId);
    }
    for (const entry of data.ledgerEntries.filter(item => item.operationType === 'reserve')) {
      assert.equal(entry.reasonCode, 'comparison_plan_reserved');
      assert.equal(entry.metadata.comparisonSetId, created.setId);
      assert.equal(entry.metadata.comparisonRunId, created.runId);
    }
    const [success, failed] = data.reservations;
    await credits.captureForJob({ userId: actor.userId, reservationId: success.reservationId, jobId: success.jobId });
    await credits.refundForJob({ userId: actor.userId, reservationId: failed.reservationId, jobId: failed.jobId, reasonCode: 'provider_error' });
    await credits.captureForJob({ userId: actor.userId, reservationId: success.reservationId, jobId: success.jobId });
    await credits.refundForJob({ userId: actor.userId, reservationId: failed.reservationId, jobId: failed.jobId, reasonCode: 'provider_error' });
    data = await accountRepo.readRaw(); assert.equal(data.accounts[0].availableCredits, 150); assert.equal(data.accounts[0].reservedCredits, 0);
    assert.equal(data.ledgerEntries.filter(entry => entry.operationType === 'capture').length, 1);
    assert.equal(data.ledgerEntries.filter(entry => entry.operationType === 'refund').length, 1);
  });
});

test('Comparison binding persistence failure refunds every allocation before any dispatch', async () => {
  await fixture(async ({ orchestrator, payload, actor, accountRepo, calls }) => {
    await assert.rejects(orchestrator.create(payload, actor), /binding persistence/);
    assert.equal(orchestrator.activeAdmissions.size, 0);
    const data = await accountRepo.readRaw(); assert.equal(calls.length, 0);
    assert.ok(data.reservations.every(item => item.status === 'refunded'));
    assert.equal(data.accounts[0].availableCredits, 200); assert.equal(data.accounts[0].reservedCredits, 0);
  }, { failPersistence: 1 });
});

test('Comparison enqueue failure preserves accepted first slot and refunds failed plus untouched slots', async () => {
  await fixture(async ({ orchestrator, payload, actor, accountRepo, calls, repository, credits }) => {
    await assert.rejects(orchestrator.create(payload, actor), /enqueue failure/);
    assert.equal(orchestrator.activeAdmissions.size, 0);
    let data = await accountRepo.readRaw(); assert.equal(calls.length, 1);
    assert.deepEqual(data.reservations.map(item => item.status), ['reserved','refunded','refunded']);
    const run = (await repository.readData()).sets[0].runs[0];
    assert.deepEqual(run.slots.map(slot => slot.status), ['queued','failed','failed']);
    await credits.captureForJob({ userId: actor.userId, reservationId: data.reservations[0].reservationId, jobId: data.reservations[0].jobId });
    const replay = await orchestrator.create(payload, actor); assert.equal(replay.idempotentReplay, true); assert.equal(calls.length, 1);
    data = await accountRepo.readRaw(); assert.equal(data.accounts[0].availableCredits, 150); assert.equal(data.accounts[0].reservedCredits, 0);
  }, { count: 3, failEnqueue: 2 });
});

test('Comparison post-acceptance persistence failure never refunds its accepted first job', async () => {
  await fixture(async ({ orchestrator, payload, actor, accountRepo, calls }) => {
    await assert.rejects(orchestrator.create(payload, actor), /binding persistence/);
    const data = await accountRepo.readRaw(); assert.equal(calls.length, 1);
    assert.deepEqual(data.reservations.map(item => item.status), ['reserved','refunded']);
    assert.equal(data.accounts[0].reservedCredits, 50);
  }, { failPersistence: 2 });
});

test('Comparison failed compensation remains durable and the existing read reconciler retries its refund', async () => {
  await fixture(async ({ orchestrator, payload, actor, accountRepo, repository, credits }) => {
    const refund = credits.refundForJob.bind(credits); let attempts = 0;
    credits.refundForJob = input => { if (++attempts === 1) return Promise.reject(Object.assign(new Error('Injected refund failure.'), { code: 'fixture_refund_failure' })); return refund(input); };
    await assert.rejects(orchestrator.create(payload, actor), /binding persistence/);
    const stored = (await repository.readData()).sets[0];
    assert.equal(stored.runs[0].slots[0].error.code, 'comparison_refund_pending');
    assert.ok(stored.runs[0].slots[0].jobId && stored.runs[0].slots[0].reservationId);
    assert.equal((await accountRepo.readRaw()).accounts[0].reservedCredits, 50);
    await orchestrator.reconcileRun(stored.id, stored.runs[0]);
    const data = await accountRepo.readRaw(); assert.equal(data.accounts[0].reservedCredits, 0); assert.equal(data.accounts[0].availableCredits, 200);
    assert.equal((await repository.readData()).sets[0].runs[0].slots[0].error.code, 'enqueue_failed');
  }, { failPersistence: 1 });
});

test('Comparison concurrent GET between slot enqueues cannot refund an active admission; both slots capture once', async () => {
  await fixture(async ({ orchestrator, payload, actor, accountRepo, repository, generation, credits, calls }) => {
    const enqueue = generation.enqueueReservedOperation.bind(generation);
    let releaseSecond, enteredSecond;
    const paused = new Promise(resolve => { enteredSecond = resolve; });
    const release = new Promise(resolve => { releaseSecond = resolve; });
    let attempts = 0;
    generation.enqueueReservedOperation = async operation => {
      if (++attempts === 2) { enteredSecond(); await release; }
      return enqueue(operation);
    };
    const admission = orchestrator.create(payload, actor);
    try {
      await paused;
      const stored = (await repository.readData()).sets[0];
      assert.equal(calls.length, 1); assert.equal(orchestrator.activeAdmissions.size, 1);
      const read = await orchestrator.get(stored.id, actor);
      assert.equal(read.runs[0].slots[1].status, 'queued');
      const during = await accountRepo.readRaw();
      assert.deepEqual(during.reservations.map(item => item.status), ['reserved','reserved']);
      assert.equal(during.ledgerEntries.filter(item => item.operationType === 'refund').length, 0);
    } finally { releaseSecond(); }
    await admission;
    assert.equal(calls.length, 2); assert.equal(orchestrator.activeAdmissions.size, 0);
    for (const reservation of (await accountRepo.readRaw()).reservations) {
      await credits.captureForJob({ userId: actor.userId, reservationId: reservation.reservationId, jobId: reservation.jobId });
      await credits.captureForJob({ userId: actor.userId, reservationId: reservation.reservationId, jobId: reservation.jobId });
    }
    const settled = await accountRepo.readRaw();
    assert.equal(settled.accounts[0].reservedCredits, 0); assert.equal(settled.accounts[0].availableCredits, 100);
    assert.equal(settled.ledgerEntries.filter(item => item.operationType === 'capture').length, 2);
    assert.equal(settled.ledgerEntries.filter(item => item.operationType === 'refund').length, 0);
  });
});

test('Comparison bounds active admission guards and rejects capacity before reservation or enqueue', async () => {
  await fixture(async ({ orchestrator, payload, actor, accountRepo, calls }) => {
    for (let index = 0; index < 128; index++) orchestrator.activeAdmissions.add(`active:${index}`);
    await assert.rejects(orchestrator.create(payload, actor), error => error.code === 'comparison_admission_busy');
    assert.equal(orchestrator.activeAdmissions.size, 128);
    assert.equal(calls.length, 0);
    const data = await accountRepo.readRaw();
    assert.equal(data.reservations.length, 0); assert.equal(data.accounts[0].availableCredits, 200);
  });
});

test('Comparison a fresh owner after Queue loss has no admission guard and refunds missing jobs idempotently', async () => {
  await fixture(async ({ orchestrator, payload, actor, accountRepo, repository, generation, credits, registry, jobs }) => {
    const result = await orchestrator.create(payload, actor); jobs.clear();
    const fresh = new ComparisonOrchestrator({ providerRegistry: registry, generationApplicationService: generation,
      creditReservation: credits, repository, creditManager: { getNetJobCosts: async () => new Map() } });
    assert.equal(fresh.activeAdmissions.size, 0);
    await fresh.get(result.setId, actor); await fresh.get(result.setId, actor);
    const data = await accountRepo.readRaw(); assert.equal(data.accounts[0].availableCredits, 200); assert.equal(data.accounts[0].reservedCredits, 0);
    assert.deepEqual(data.reservations.map(item => item.status), ['refunded','refunded']);
    assert.equal(data.ledgerEntries.filter(item => item.operationType === 'refund').length, 2);
  });
});
