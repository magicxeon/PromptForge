import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { calculateVideoPricingPreview, calculateVideoUsageSettlement } from '../server/domain/credits/VideoPricingCalculator.js';
import { CreditPricingPolicyService } from '../server/domain/credits/CreditPricingPolicyService.js';
import { CreditReservationService } from '../server/domain/credits/CreditReservationService.js';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';
import { VideoGenerationApplicationService } from '../server/domain/generation/VideoGenerationApplicationService.js';
import { VideoProviderTaskService } from '../server/domain/generation/VideoProviderTaskService.js';
import { VideoProviderTaskRepository } from '../server/repositories/generation/VideoProviderTaskRepository.js';
import { VideoCapabilityRegistry } from '../server/domain/generation/VideoCapabilityRegistry.js';

const policy = JSON.parse(await fs.readFile(new URL('../server/config/credit-pricing-policy.json', import.meta.url), 'utf8'));
const actor = { userId: 'usr_video_fixture', username: 'fixture', role: 'user' };
// Synthetic qualified model, not a change to the live provider qualification catalog.
const model = {
  providerId: 'modelark', modelId: 'dreamina-seedance-2-5-260628', billingMetric: 'completion_token',
  ratesByResolutionAndInputModeUsdPerMillionTokens: {
    '480p': { without_video: 10.7, with_video: 6.4 }, '720p': { without_video: 10.7, with_video: 6.4 }
  },
  providerRateVersion: 'fixture-rate-v1', providerPriceSource: 'https://docs.byteplus.com/en/docs/ModelArk/1544106',
  providerPriceSourceDate: '2026-09-04', pricingStatus: 'priced', paidRoutingEnabled: true, qualificationStatus: 'qualified'
};
const request = { operation: 'text_to_video', commercialOperation: 'playground_video', inputMode: 'text_to_video',
  resolution: '720p', aspectRatio: '9:16', durationSeconds: 6, audioMode: 'none', referenceImageCount: 0 };
const usage = { billingMetric: 'completion_token', completionTokens: 130500, outputCount: 1, source: 'provider_response' };

async function fixture(t, selectedPolicy = policy, selectedModel = model, selectedRequest = request, reserve = true) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'video-actual-credit-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const databaseFile = path.join(directory, 'credits.json');
  await fs.writeFile(databaseFile, JSON.stringify({ schemaVersion: 2, accounts: [{ userId: actor.userId,
    availableCredits: 10000, reservedCredits: 0, lifetimeCapturedCredits: 0, status: 'active' }],
    estimates: [], reservations: [], ledgerEntries: [] }));
  const accounts = new CreditAccountRepository({ databaseFile });
  const pricing = new CreditPricingPolicyService({ policyData: structuredClone(selectedPolicy) });
  const credits = new CreditReservationService({ accountRepo: accounts, pricingPolicyService: pricing });
  const quote = await credits.estimateVideo({ userId: actor.userId, model: selectedModel, request: selectedRequest, generationMode: 'playground_video' });
  const input = { userId: actor.userId, estimateId: quote.estimateId, generationRequest: {
    ...selectedRequest, requestedProviderId: selectedModel.providerId, requestedModelId: selectedModel.modelId,
    routingMode: 'advanced', qualityTier: 'video', referenceCount: selectedRequest.referenceImageCount, outputCount: 1,
    generationMode: 'playground_video', requestId: 'video_fixture_request',
    developmentPocUnverified: selectedModel.developmentPocUnverified === true,
    developmentPocCredits: selectedModel.developmentPocCredits
  }, metadata: { jobId: 'videotask_fixture' } };
  const reserved = reserve ? await credits.validateAndReserveForRequest(input) : null;
  return { accounts, credits, pricing, quote, reserved, input, directory };
}

test('actual video: calibrated portrait samples match provider tokens without extra paid samples', () => {
  for (const [resolution, seconds, tokens] of [
    ['480p', 4, 38830], ['480p', 6, 58045], ['480p', 8, 77260],
    ['720p', 4, 87300], ['720p', 6, 130500], ['720p', 8, 173700], ['720p', 30, 648900]
  ]) {
    for (const audioMode of ['none', 'generated']) {
      const preview = calculateVideoPricingPreview(model, { ...request, resolution, durationSeconds: seconds, audioMode }, policy);
      assert.equal(preview.estimatedCompletionTokens, tokens);
      assert.equal(preview.estimatorVersion, 'seedance25-portrait-24fps-extra-frame-v1');
    }
  }
});

const isolatedAvailability = { getVersion: () => 'fixture', evaluate: () => ({ enabled: true }), assertAvailable() {} };

test('actual video: catalog activation quotes and settles all measured cases without a POC switch', async t => {
  const registry = new VideoCapabilityRegistry({ runtimeEnvironment: 'development', developmentPocEnabled: false,
    availabilityPolicy: isolatedAvailability });
  const selected = registry.resolve('modelark', model.modelId);
  assert.equal(selected.paidRoutingEnabled, true);
  assert.equal(selected.qualificationStatus, 'qualified');
  assert.equal(selected.developmentPocUnverified, undefined);
  assert.equal(registry.getPublicCatalog().models.length, 1);
  assert.equal(selected.paidUsageActivation.measuredCases.reduce((sum, row) => sum + row.sampleCount, 0), 32);
  for (const row of selected.paidUsageActivation.measuredCases) {
    for (const referenceImageCount of row.referenceCounts) {
      const requested = { ...request, ...row, referenceImageCount, providerId: selected.providerId,
        modelId: selected.modelId, operation: 'image_to_video', inputMode: 'multimodal_reference' };
      const qualified = registry.validateRequest(requested);
      const f = await fixture(t, policy, qualified, requested);
      assert.equal(f.quote.chargeMode, 'actual_usage');
      assert.equal(f.quote.breakdown.estimatedCompletionTokens, row.completionTokens);
      assert.equal(f.quote.breakdown.videoSettlement.rateEvidenceBasis, 'configured_rate_user_authorized_provisional');
      assert.equal(f.quote.breakdown.videoSettlement.tokenRateUsdPerMillion, 10.7);
      const result = await f.credits.captureForJob({ userId: actor.userId,
        reservationId: f.reserved.reservation.reservationId, jobId: 'videotask_fixture',
        usage: { ...usage, completionTokens: row.completionTokens } });
      assert.ok(result.reservation.capturedCredits > 1);
      assert.ok(result.reservation.releasedCredits > 0);
    }
  }
});

test('actual video: scoped activation never qualifies production, other models or unmeasured requests', async () => {
  for (const runtimeEnvironment of ['development', 'test']) {
    const registry = new VideoCapabilityRegistry({ runtimeEnvironment, developmentPocEnabled: true,
      availabilityPolicy: isolatedAvailability });
    const selected = registry.resolve('modelark', model.modelId);
    assert.equal(selected.paidRoutingEnabled, true);
    assert.equal(selected.developmentPocUnverified, undefined);
    const service = new CreditReservationService({ pricingPolicyService: new CreditPricingPolicyService({ policyData: policy }),
      accountRepo: { saveEstimate() { throw new Error('Out-of-profile quote must not be saved'); } } });
    const base = { ...request, operation: 'image_to_video', inputMode: 'multimodal_reference',
      referenceImageCount: 3, durationSeconds: 8, audioMode: 'generated' };
    for (const overrides of [{ aspectRatio: '16:9' }, { resolution: '1080p' }, { durationSeconds: 5 },
      { resolution: '480p', durationSeconds: 30 }, { fps: 30 }, { inputVideoSeconds: 1 },
      { referenceImageCount: 4 }, { referenceImageCount: 0 }, { inputMode: 'image_to_video' }, { audioMode: 'none' }]) {
      await assert.rejects(service.estimateVideo({ userId: actor.userId, model: selected, request: { ...base, ...overrides } }),
        { code: 'credit_pricing_unavailable' });
    }
    assert.equal(registry.resolve('modelark', 'seedance-1-0-pro-250528').paidRoutingEnabled, false);
  }
  const production = new VideoCapabilityRegistry({ runtimeEnvironment: 'production', availabilityPolicy: isolatedAvailability });
  assert.deepEqual(production.getPublicCatalog().models, []);
  assert.equal(production.resolve('modelark', model.modelId).paidRoutingEnabled, false);
});

test('actual video: activated profile preserves source and first-frame gates', () => {
  const registry = new VideoCapabilityRegistry({ runtimeEnvironment: 'development', developmentPocEnabled: false,
    seedanceFirstFrameEnabled: false, availabilityPolicy: isolatedAvailability,
    sourcePolicy: { allowAnyProvider: false, policyVersion: 'strict-fixture' } });
  const requested = { ...request, providerId: model.providerId, modelId: model.modelId,
    operation: 'image_to_video', inputMode: 'multimodal_reference', audioMode: 'generated', referenceImageCount: 3 };
  assert.throws(() => registry.validateRequest({ ...requested, referenceContainsPerson: true }),
    { code: 'video_provider_synthetic_character_source_required' });
  assert.throws(() => registry.validateRequest({ ...requested, references: [{ role: 'first_frame' }] }),
    { code: 'video_first_frame_disabled' });
});

test('actual video: activated catalog dispatches once and pinned settlement survives activation rollback', async t => {
  const registry = new VideoCapabilityRegistry({ runtimeEnvironment: 'test', developmentPocEnabled: false,
    availabilityPolicy: isolatedAvailability });
  const selected = registry.resolve(model.providerId, model.modelId);
  const requested = { ...request, providerId: model.providerId, modelId: model.modelId,
    operation: 'image_to_video', inputMode: 'multimodal_reference', audioMode: 'generated', referenceImageCount: 3 };
  const f = await fixture(t, policy, selected, requested);
  const repository = new VideoProviderTaskRepository({ tasksFile: path.join(f.directory, 'tasks.json') });
  let submits = 0;
  const provider = new VideoProviderTaskService({ repository, capabilityRegistry: registry,
    adapter: { preflight() {}, async submit() { submits++; return { providerTaskId: 'offline_task' }; } } });
  const dispatch = { ...requested, id: 'videotask_fixture', idempotencyKey: 'catalog_paid_fixture',
    reservationId: f.reserved.reservation.reservationId, estimateId: f.quote.estimateId,
    estimatedCredits: f.quote.estimatedCredits, chargeMode: f.quote.chargeMode };
  await provider.submitTask(dispatch, actor);
  await provider.submitTask(dispatch, actor);
  assert.equal(submits, 1);
  const task = await repository.find('videotask_fixture');
  assert.equal(task.chargeMode, 'actual_usage');
  const raw = registry.load().models.find(row => row.modelId === model.modelId);
  raw.paidUsageActivation.enabled = false;
  raw.ratesByResolutionAndInputModeUsdPerMillionTokens['720p'].without_video = 999;
  assert.deepEqual(registry.getPublicCatalog().models, []);
  const settled = await f.credits.captureForJob({ userId: actor.userId,
    reservationId: f.reserved.reservation.reservationId, jobId: 'videotask_fixture', usage });
  assert.equal(settled.reservation.capturedCredits, f.quote.breakdown.providerEstimatedCredits);
  assert.ok(settled.reservation.releasedCredits > 0);
});

test('actual video: qualified paid quote replaces a POC tariff while preserving request markers', async t => {
  const f = await fixture(t, policy, { ...model, developmentPocUnverified: true, developmentPocCredits: 1 });
  assert.equal(f.quote.chargeMode, 'actual_usage');
  assert.ok(f.quote.estimatedCredits > 1);
  assert.equal(f.quote.pricingInputs.developmentPocCredits, 1);
  assert.equal(f.quote.breakdown.videoSettlement.retailPolicy.profitMarkupPercentByMedia.video, 30);
});

test('actual video: unqualified or missing rate evidence never produces a free/POC quote', async () => {
  const service = new CreditReservationService({ pricingPolicyService: new CreditPricingPolicyService({ policyData: policy }),
    accountRepo: { saveEstimate() { throw new Error('Invalid quote must not be saved'); } } });
  for (const overrides of [
    { qualificationStatus: 'internal_testing' }, { paidRoutingEnabled: false }, { pricingStatus: 'research_only' },
    { providerPriceSource: null }, { providerPriceSourceDate: null }, { providerRateVersion: null },
    { ratesByResolutionAndInputModeUsdPerMillionTokens: {} }
  ]) await assert.rejects(service.estimateVideo({ userId: actor.userId,
    model: { ...model, developmentPocUnverified: true, developmentPocCredits: 1, ...overrides }, request }),
  { code: 'credit_pricing_unavailable' });
});

test('actual video: disabling new quote policy never falls back to a free qualification quote', async () => {
  const service = new CreditReservationService({ pricingPolicyService: new CreditPricingPolicyService({
    policyData: { ...policy, videoActualUsage: { ...policy.videoActualUsage, enabled: false } }
  }), accountRepo: { saveEstimate() { throw new Error('Disabled quotes must not be saved'); } } });
  await assert.rejects(service.estimateVideo({ userId: actor.userId, model: { ...model,
    pricingStatus: 'research_only', paidRoutingEnabled: false, testingRoutingEnabled: true }, request,
  generationMode: 'cinematic_video' }), { code: 'credit_pricing_unavailable' });
});

test('actual video: atomic partial capture releases unused hold and ledger deltas replay exactly', async t => {
  const f = await fixture(t);
  const settled = await f.credits.captureForJob({ userId: actor.userId, reservationId: f.reserved.reservation.reservationId,
    jobId: 'videotask_fixture', usage });
  const expected = calculateVideoUsageSettlement(usage, f.quote.breakdown.videoSettlement);
  assert.equal(settled.reservation.amountCredits, f.quote.estimatedCredits);
  assert.equal(settled.reservation.capturedCredits, expected.actualCredits);
  assert.equal(settled.reservation.releasedCredits, f.quote.estimatedCredits - expected.actualCredits);
  assert.equal(settled.account.availableCredits, 10000 - expected.actualCredits);
  assert.equal(settled.account.reservedCredits, 0);
  const data = await f.accounts.readRaw();
  let available = 10000, reserved = 0;
  for (const entry of data.ledgerEntries) {
    available += entry.availableDelta; reserved += entry.reservedDelta;
    assert.equal(entry.availableAfter, available); assert.equal(entry.reservedAfter, reserved);
  }
  assert.deepEqual(data.ledgerEntries.map(entry => entry.operationType), ['reserve', 'capture', 'release']);
});

test('actual video: duplicate/concurrent capture and restart replay never release or debit twice', async t => {
  const f = await fixture(t);
  const input = { userId: actor.userId, reservationId: f.reserved.reservation.reservationId, jobId: 'videotask_fixture', usage };
  await Promise.all([f.credits.captureForJob(input), f.credits.captureForJob(input)]);
  const restarted = new CreditReservationService({ accountRepo: new CreditAccountRepository({ databaseFile: f.accounts.databaseFile }) });
  await restarted.captureForJob({ ...input, usage: null });
  const data = await f.accounts.readRaw();
  assert.equal(data.ledgerEntries.filter(entry => entry.operationType === 'capture').length, 1);
  assert.equal(data.ledgerEntries.filter(entry => entry.operationType === 'release').length, 1);
});

test('actual video: pinned policy and provider rate are immune to future edits', async t => {
  const f = await fixture(t);
  f.pricing.policy.profitMarkupPercentByMedia.video = 1000;
  f.pricing.policy.pricingFxThbPerUsd = 500;
  const captured = await f.credits.captureForJob({ userId: actor.userId,
    reservationId: f.reserved.reservation.reservationId, jobId: 'videotask_fixture', usage });
  assert.equal(captured.reservation.capturedCredits, 735);
});

test('actual video: definite provider failure refunds once independently of cost evidence', async t => {
  const f = await fixture(t);
  const input = { userId: actor.userId, reservationId: f.reserved.reservation.reservationId,
    jobId: 'videotask_fixture', reasonCode: 'video_provider_failure' };
  await Promise.all([f.credits.refundForJob(input), f.credits.refundForJob(input)]);
  assert.equal((await f.accounts.readRaw()).accounts[0].availableCredits, 10000);
  await assert.rejects(f.credits.captureForJob({ ...input, usage }), { code: 'credit_operation_already_settled' });
  assert.equal((await f.accounts.readRaw()).ledgerEntries.filter(entry => entry.operationType === 'refund').length, 1);
});

test('actual video: missing, invalid, inconsistent and over-cap usage leave the hold untouched', async t => {
  const f = await fixture(t);
  for (const invalid of [null, {}, { ...usage, completionTokens: 0 }, { ...usage, completionTokens: -1 },
    { ...usage, completionTokens: 1.5 }, { ...usage, completionTokens: NaN },
    { ...usage, source: 'estimated_usage' }, { ...usage, billingMetric: 'output_second' }, { ...usage, outputCount: 2 }]) {
    await assert.rejects(f.credits.captureForJob({ userId: actor.userId,
      reservationId: f.reserved.reservation.reservationId, jobId: 'videotask_fixture', usage: invalid }),
    { code: 'video_usage_reconciliation_required' });
  }
  await assert.rejects(f.credits.captureForJob({ userId: actor.userId,
    reservationId: f.reserved.reservation.reservationId, jobId: 'videotask_fixture', usage: { ...usage, completionTokens: 1000000 } }),
  { code: 'video_usage_exceeds_consent' });
  const data = await f.accounts.readRaw();
  assert.equal(data.reservations[0].status, 'reserved');
  assert.equal(data.ledgerEntries.length, 1);
});

test('actual video: foreign actor/job and conflicting capture replay cannot mutate settlement', async t => {
  const f = await fixture(t);
  const input = { userId: actor.userId, reservationId: f.reserved.reservation.reservationId, jobId: 'videotask_fixture', usage };
  await assert.rejects(f.credits.captureForJob({ ...input, userId: 'foreign' }), { code: 'credit_reservation_not_found' });
  await assert.rejects(f.credits.captureForJob({ ...input, jobId: 'foreign' }), { code: 'credit_reservation_not_found' });
  await f.credits.captureForJob(input);
  await assert.rejects(f.accounts.captureReservation({ ...input, amountCredits: 5 }), { code: 'credit_operation_already_settled' });
});

test('actual video: expired/changed quotes and insufficient funds fail before execution', async t => {
  const f = await fixture(t);
  await assert.rejects(f.credits.validateAndReserveForRequest({ ...f.input,
    generationRequest: { ...f.input.generationRequest, durationSeconds: 8 } }), { code: 'credit_estimate_stale' });
  f.credits.estimateCache.get(f.quote.estimateId).expiresAt = new Date(0).toISOString();
  await assert.rejects(f.credits.validateAndReserveForRequest(f.input), { code: 'credit_estimate_expired' });
  await assert.rejects(f.accounts.reserveCredits({ userId: actor.userId, amountCredits: 10000,
    requestId: 'overdraw_fixture', estimateId: 'fixture' }), { code: 'credit_insufficient' });
});

test('actual video: accepted legacy POC and text reservations keep default full capture', async t => {
  const oldPolicy = structuredClone(policy); delete oldPolicy.videoActualUsage;
  const f = await fixture(t, oldPolicy, { ...model, pricingStatus: 'research_only', paidRoutingEnabled: false,
    developmentPocUnverified: true, developmentPocCredits: 1 });
  assert.equal(f.quote.estimatedCredits, 1);
  const old = await f.credits.captureForJob({ userId: actor.userId, reservationId: f.reserved.reservation.reservationId,
    jobId: 'videotask_fixture' });
  assert.equal(old.reservation.capturedCredits, 1);
  const text = await f.accounts.reserveCredits({ userId: actor.userId, amountCredits: 40,
    requestId: 'cinematic_text_fixture', metadata: { kind: 'cinematic_text' } });
  const result = await f.credits.captureForJob({ userId: actor.userId, reservationId: text.reservation.reservationId });
  assert.equal(result.reservation.capturedCredits, 40);
  assert.equal(result.reservation.releasedCredits, 0);
});

test('actual video: both product workflows price identical billable inputs identically', async () => {
  const credits = new CreditReservationService({ pricingPolicyService: new CreditPricingPolicyService({ policyData: policy }),
    accountRepo: { saveEstimate: async estimate => estimate } });
  const playground = await credits.estimateVideo({ userId: actor.userId, model, request, generationMode: 'playground_video' });
  const cinematic = await credits.estimateVideo({ userId: actor.userId, model,
    request: { ...request, commercialOperation: 'cinematic_draft_clip' }, generationMode: 'cinematic_video' });
  assert.equal(playground.estimatedCredits, cinematic.estimatedCredits);
  assert.deepEqual(playground.breakdown.videoSettlement, cinematic.breakdown.videoSettlement);
});

test('actual video: seconds-based provider keeps its billing metric', async t => {
  const f = await fixture(t, policy, { ...model, providerId: 'gemini', modelId: 'veo-fixture', billingMetric: 'output_second',
    ratesByResolutionUsd: { '720p': 0.1 } });
  const result = await f.credits.captureForJob({ userId: actor.userId, reservationId: f.reserved.reservation.reservationId,
    jobId: 'videotask_fixture', usage: { billingMetric: 'output_second', outputSeconds: 6,
      outputCount: 1, source: 'locked_provider_request' } });
  assert.equal(result.ledgerEntry.metadata.providerCostEvidence.costBasis, 'locked_provider_request');
  assert.equal(result.reservation.capturedCredits, 315);
});

test('actual video: provider discounts require account eligibility evidence for new paid quotes', () => {
  const discounted = { ...model, providerDiscounts: [{ id: 'fixture-discount', startsAt: '2026-01-01T00:00:00Z',
    endsAt: '2027-01-01T00:00:00Z', resolutions: ['720p'], multiplier: 0.5 }] };
  assert.equal(calculateVideoPricingPreview(discounted, request, policy).discountId, null);
  assert.equal(calculateVideoPricingPreview({ ...discounted, providerDiscountEligibilityVerified: true }, request, policy).discountId, 'fixture-discount');
});

for (const invalid of [null, { ...usage, completionTokens: 1000000 }]) {
  test(`actual video: application retains durable output and reconciles ${invalid ? 'over-cap' : 'missing'} usage`, async t => {
    const f = await fixture(t);
    const tasks = new VideoProviderTaskRepository({ tasksFile: path.join(f.directory, 'tasks.json') });
    await tasks.createAccepted({ id: 'videotask_fixture', ownerUserId: actor.userId, idempotencyKey: 'fixture_video',
      status: 'completed', billingStatus: 'reserved', reservationId: f.reserved.reservation.reservationId,
      providerUsage: invalid, outputAsset: { assetId: 'durable_fixture' } });
    const application = new VideoGenerationApplicationService({ taskRepository: tasks, creditService: f.credits,
      providerTaskService: { pollTask() { throw new Error('Terminal task must not redispatch'); } } });
    const result = await application.getAndPoll('videotask_fixture', actor);
    assert.equal(result.status, 'reconciliation_required');
    assert.equal(result.billingStatus, 'reserved');
    assert.equal(result.outputAsset.assetId, 'durable_fixture');
    assert.equal((await f.accounts.readRaw()).ledgerEntries.length, 1);
  });
}

test('actual video: concurrent submission across service instances claims provider dispatch exactly once', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'video-dispatch-claim-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const tasksFile = path.join(directory, 'tasks.json');
  let calls = 0;
  const adapter = { async submit() { calls += 1; await new Promise(resolve => setTimeout(resolve, 25));
    return { providerTaskId: 'fixture_provider_task' }; } };
  const services = [0, 1].map(() => new VideoProviderTaskService({
    repository: new VideoProviderTaskRepository({ tasksFile }), adapter,
    capabilityRegistry: { validateRequest: () => model }
  }));
  const submission = { ...request, id: 'videotask_claim', idempotencyKey: 'fixture_claim_command' };
  await Promise.all(services.map(service => service.submitTask(submission, actor)));
  assert.equal(calls, 1);
  assert.equal((await services[0].repository.find('videotask_claim')).providerTaskId, 'fixture_provider_task');
  await assert.rejects(services[0].submitTask({ ...submission, durationSeconds: 8 }, actor), { code: 'video_idempotency_conflict' });
});

async function submissionFixture(t, { preflight, submit, validateRequest } = {}) {
  const f = await fixture(t, policy, model, request, false);
  const tasksFile = path.join(f.directory, 'tasks.json');
  const tasks = new VideoProviderTaskRepository({ tasksFile });
  const calls = { preflight: 0, submit: 0, reserve: 0, refund: 0 };
  const capabilityRegistry = { resolve: () => model, validateRequest: validateRequest || (() => model) };
  const adapter = {
    async preflight(input) { calls.preflight++; return preflight?.(calls.preflight, input, tasks); },
    async submit(input) {
      calls.submit++;
      return submit ? submit(input) : { providerTaskId: 'offline_provider_task' };
    }
  };
  const creditService = {
    async validateAndReserveForRequest(input) { calls.reserve++; return f.credits.validateAndReserveForRequest(input); },
    async refundForJob(input) { calls.refund++; return f.credits.refundForJob(input); }
  };
  const createApplication = (options = {}) => {
    const repository = new VideoProviderTaskRepository({ tasksFile });
    return new VideoGenerationApplicationService({ capabilityRegistry, creditService, taskRepository: repository,
      modelArkCredentialScopeResolver: () => 'offline_scope',
      providerTaskService: new VideoProviderTaskService({ repository, capabilityRegistry, adapter }), ...options });
  };
  const input = { ...request, providerId: model.providerId, modelId: model.modelId,
    prompt: 'Offline video settlement fixture.', estimateId: f.quote.estimateId, idempotencyKey: 'offline_submit_fixture' };
  return { ...f, tasks, calls, createApplication, input };
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function rejectedPreflight(providerBillableState) {
  return Object.assign(new Error('Offline endpoint rejected.'), { code: 'video_provider_endpoint_invalid', statusCode: 409,
    ...(providerBillableState ? { providerBillableState } : {}) });
}

for (const state of [undefined, 'not_billable']) {
  test(`actual video: ${state || 'local unclassified'} pre-dispatch rejection refunds immediately and blocks settled replay`, async t => {
    const f = await submissionFixture(t, { preflight(count) { if (count === 2) throw rejectedPreflight(state); } });
    const application = f.createApplication();
    await assert.rejects(application.submit(f.input, actor), {
      code: 'video_provider_endpoint_invalid', statusCode: 409,
      providerDispatchState: 'not_started', providerBillableState: 'not_billable'
    });
    const data = await f.accounts.readRaw();
    assert.equal(data.accounts[0].availableCredits, 10000);
    assert.equal(data.accounts[0].reservedCredits, 0);
    assert.equal(data.reservations[0].status, 'refunded');
    assert.deepEqual(data.ledgerEntries.map(row => row.operationType), ['reserve', 'refund']);
    assert.equal(await f.tasks.findByIdempotencyKey(actor.userId, f.input.idempotencyKey), null);
    await assert.rejects(f.createApplication().submit(f.input, actor), { code: 'video_credit_reservation_already_settled' });
    assert.equal(f.calls.submit, 0);
    assert.equal(f.calls.refund, 1);
    assert.equal((await f.accounts.readRaw()).ledgerEntries.length, 2);
  });
}

for (const status of [undefined, null, '']) {
  test(`actual video: ${status === undefined ? 'missing' : status === null ? 'null' : 'empty'} reservation status cannot dispatch a refunded replay`, async t => {
    const f = await submissionFixture(t, { preflight(count) { if (count === 2) throw rejectedPreflight('not_billable'); } });
    await assert.rejects(f.createApplication().submit(f.input, actor), { providerDispatchState: 'not_started' });
    const before = await f.accounts.readRaw();
    const application = f.createApplication({ creditService: {
      async validateAndReserveForRequest(input) {
        const authorization = await f.credits.validateAndReserveForRequest(input);
        if (status === undefined) delete authorization.reservation.status;
        else authorization.reservation.status = status;
        return authorization;
      }
    } });
    await assert.rejects(application.submit(f.input, actor), { code: 'video_credit_reservation_already_settled' });
    assert.equal(f.calls.submit, 0);
    assert.equal(await f.tasks.findByIdempotencyKey(actor.userId, f.input.idempotencyKey), null);
    assert.deepEqual(await f.accounts.readRaw(), before);
  });
}

for (const state of ['unknown', 'billable']) {
  test(`actual video: explicitly ${state} pre-dispatch failure retains the hold`, async t => {
    const f = await submissionFixture(t, { preflight(count) { if (count === 2) throw rejectedPreflight(state); } });
    await assert.rejects(f.createApplication().submit(f.input, actor), {
      providerDispatchState: 'not_started', providerBillableState: state
    });
    const data = await f.accounts.readRaw();
    assert.equal(data.accounts[0].reservedCredits, f.quote.estimatedCredits);
    assert.equal(data.reservations[0].status, 'reserved');
    assert.deepEqual(data.ledgerEntries.map(row => row.operationType), ['reserve']);
    assert.equal(f.calls.refund, 0);
    assert.equal(f.calls.submit, 0);
  });
}

test('actual video: qualification revoked after reservation refunds without dispatch', async t => {
  let validations = 0;
  const f = await submissionFixture(t, { validateRequest() {
    if (++validations === 3) throw Object.assign(new Error('Offline qualification revoked.'), {
      code: 'video_model_not_qualified', statusCode: 409
    });
    return model;
  } });
  await assert.rejects(f.createApplication().submit(f.input, actor), { code: 'video_model_not_qualified' });
  assert.equal(f.calls.refund, 1);
  assert.equal(f.calls.submit, 0);
  assert.equal((await f.accounts.readRaw()).accounts[0].reservedCredits, 0);
});

test('actual video: concurrent same-key preflight failures share one reservation and refund', async t => {
  const entered = deferred();
  const release = deferred();
  t.after(() => release.resolve());
  const f = await submissionFixture(t, { async preflight(count) {
    if (count === 2) { entered.resolve(); await release.promise; throw rejectedPreflight('not_billable'); }
  } });
  const results = Promise.allSettled([f.createApplication().submit(f.input, actor), f.createApplication().submit(f.input, actor)]);
  await entered.promise;
  release.resolve();
  const outcomes = await results;
  assert.ok(outcomes.every(row => row.status === 'rejected' && row.reason.code === 'video_provider_endpoint_invalid'));
  assert.equal(f.calls.preflight, 2);
  assert.equal(f.calls.reserve, 1);
  assert.equal(f.calls.refund, 1);
  assert.equal(f.calls.submit, 0);
  assert.deepEqual((await f.accounts.readRaw()).ledgerEntries.map(row => row.operationType), ['reserve', 'refund']);
});

test('actual video: concurrent same-key caller and conflicting input cannot refund an active claim', async t => {
  const entered = deferred();
  const release = deferred();
  t.after(() => release.resolve());
  const f = await submissionFixture(t, { async submit() {
    entered.resolve(); await release.promise; return { providerTaskId: 'offline_active_claim' };
  } });
  const first = f.createApplication().submit(f.input, actor);
  await entered.promise;
  const second = f.createApplication().submit(f.input, actor);
  await assert.rejects(f.createApplication().submit({ ...f.input, prompt: 'Conflicting offline prompt.' }, actor), {
    code: 'video_idempotency_conflict'
  });
  await assert.rejects(f.createApplication().submit({ ...f.input, estimateId: 'conflicting_quote' }, actor), {
    code: 'video_idempotency_conflict'
  });
  const active = await f.tasks.findByIdempotencyKey(actor.userId, f.input.idempotencyKey);
  assert.equal(active.status, 'provider_submitting');
  assert.equal(f.calls.refund, 0);
  release.resolve();
  const [one, two] = await Promise.all([first, second]);
  assert.equal(one.id, two.id);
  assert.equal(one.providerTaskId, 'offline_active_claim');
  assert.equal(f.calls.reserve, 1);
  assert.equal(f.calls.submit, 1);
  assert.equal(f.calls.refund, 0);
  assert.equal((await f.accounts.readRaw()).accounts[0].reservedCredits, f.quote.estimatedCredits);
});

test('actual video: definite preflight rejection does not refund a separately durable dispatch claim', async t => {
  const f = await submissionFixture(t, { async preflight(count, input, tasks) {
    if (count !== 2) return;
    await tasks.createAccepted({ id: input.id, ownerUserId: actor.userId, idempotencyKey: input.idempotencyKey,
      reservationId: input.reservationId, billingStatus: 'reserved' });
    await tasks.claimDispatch(input.id, {});
    throw rejectedPreflight('not_billable');
  } });
  await assert.rejects(f.createApplication().submit(f.input, actor), { code: 'video_provider_endpoint_invalid' });
  assert.equal((await f.tasks.findByIdempotencyKey(actor.userId, f.input.idempotencyKey)).status, 'provider_submitting');
  assert.equal((await f.accounts.readRaw()).accounts[0].reservedCredits, f.quote.estimatedCredits);
  assert.equal(f.calls.refund, 0);
});

test('actual video: preflight rejection with unreadable task state retains the hold', async t => {
  const f = await submissionFixture(t, { preflight(count) { if (count === 2) throw rejectedPreflight('not_billable'); } });
  const application = f.createApplication();
  const lookup = application.taskRepository.findByIdempotencyKey.bind(application.taskRepository);
  let lookups = 0;
  application.taskRepository.findByIdempotencyKey = async (...args) => {
    if (++lookups === 2) throw new Error('Offline task store unavailable.');
    return lookup(...args);
  };
  await assert.rejects(application.submit(f.input, actor), { code: 'video_provider_endpoint_invalid' });
  assert.equal(f.calls.refund, 0);
  assert.equal((await f.accounts.readRaw()).accounts[0].reservedCredits, f.quote.estimatedCredits);
});

test('actual video: uncertain task acceptance cannot release a reservation', async t => {
  const f = await submissionFixture(t);
  const application = f.createApplication();
  application.providerTaskService.repository.createAccepted = async () => { throw rejectedPreflight('not_billable'); };
  await assert.rejects(application.submit(f.input, actor), error => {
    assert.equal(error.code, 'video_provider_endpoint_invalid');
    assert.equal(error.providerDispatchState, undefined);
    return true;
  });
  assert.equal(f.calls.refund, 0);
  assert.equal(f.calls.submit, 0);
  assert.equal((await f.accounts.readRaw()).accounts[0].reservedCredits, f.quote.estimatedCredits);
});

for (const state of ['unknown', 'not_billable']) {
  test(`actual video: dispatched ${state} failure preserves existing settlement behavior`, async t => {
    const f = await submissionFixture(t, { submit() { throw rejectedPreflight(state); } });
    const result = await f.createApplication().submit(f.input, actor);
    assert.equal(result.status, state === 'unknown' ? 'reconciliation_required' : 'failed');
    assert.equal(result.billingStatus, state === 'unknown' ? 'reserved' : 'refunded');
    assert.equal(f.calls.submit, 1);
    assert.equal(f.calls.refund, state === 'unknown' ? 0 : 1);
    const data = await f.accounts.readRaw();
    assert.equal(data.accounts[0].reservedCredits, state === 'unknown' ? f.quote.estimatedCredits : 0);
    assert.equal(data.ledgerEntries.length, state === 'unknown' ? 1 : 2);
  });
}

test('actual video: bounded submission flights reject new keys before reserve, coalesce duplicates and release capacity', async t => {
  const entered = deferred();
  const release = deferred();
  t.after(() => release.resolve());
  const f = await submissionFixture(t, { async submit() {
    entered.resolve(); await release.promise; return { providerTaskId: 'offline_bounded_submission' };
  } });
  const application = f.createApplication({ maxConcurrentSubmissions: 1 });
  const first = application.submit(f.input, actor);
  await entered.promise;
  const duplicate = f.createApplication({ maxConcurrentSubmissions: 1 }).submit(f.input, actor);
  await assert.rejects(application.submit({ ...f.input, idempotencyKey: 'offline_over_capacity' }, actor), {
    code: 'video_submission_capacity_exceeded', statusCode: 429
  });
  assert.equal(f.calls.reserve, 1);
  assert.equal(f.calls.submit, 1);
  assert.equal(f.calls.preflight, 2);
  release.resolve();
  const [one, two] = await Promise.all([first, duplicate]);
  assert.equal(one.id, two.id);
  await application.submit({ ...f.input, idempotencyKey: 'offline_capacity_released' }, actor);
  await application.submit({ ...f.input, idempotencyKey: 'offline_capacity_released_again' }, actor);
  assert.equal(f.calls.reserve, 3);
  assert.equal(f.calls.submit, 3);
  assert.equal(f.calls.refund, 0);
});

test('actual video: rejected preflight and refund release bounded submission capacity', async t => {
  const f = await submissionFixture(t, { preflight(count) { if (count === 2) throw rejectedPreflight('not_billable'); } });
  const application = f.createApplication({ maxConcurrentSubmissions: 1 });
  await assert.rejects(application.submit(f.input, actor), { code: 'video_provider_endpoint_invalid' });
  const accepted = await application.submit({ ...f.input, idempotencyKey: 'offline_after_refund' }, actor);
  assert.equal(accepted.status, 'provider_queued');
  assert.equal(f.calls.reserve, 2);
  assert.equal(f.calls.refund, 1);
  assert.equal(f.calls.submit, 1);
});

test('actual video: submission concurrency environment is validated separately from recovery concurrency', async () => {
  const policyUrl = new URL('../server/config/videoRecoveryPolicy.js', import.meta.url);
  const original = process.env.VIDEO_SUBMISSION_MAX_CONCURRENT;
  try {
    for (const [value, expected] of [[undefined, 32], ['1', 1], ['32', 32], ['256', 256],
      ['0', 32], ['257', 32], ['1.5', 32], ['invalid', 32]]) {
      if (value === undefined) delete process.env.VIDEO_SUBMISSION_MAX_CONCURRENT;
      else process.env.VIDEO_SUBMISSION_MAX_CONCURRENT = value;
      const { videoRecoveryPolicy: selected } = await import(`${policyUrl.href}?submissionLimit=${value}`);
      assert.equal(selected.maxConcurrentSubmissions, expected);
      assert.equal(selected.maxConcurrent, 4);
    }
  } finally {
    if (original === undefined) delete process.env.VIDEO_SUBMISSION_MAX_CONCURRENT;
    else process.env.VIDEO_SUBMISSION_MAX_CONCURRENT = original;
  }
});
