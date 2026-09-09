import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGenerationContext, compilePromptFromGenerationContext, createQueueOptions } from '../server/domain/generation/generationRequestService.js';
import { prepareGenerationReferences } from '../server/domain/generation/prepareGenerationReferences.js';
import { CreditReservationService } from '../server/domain/credits/CreditReservationService.js';
import { normalizeGenerationHistoryRecord } from '../server/repositories/recordNormalizer.js';
import { buildGeneratedShareSnapshots } from '../server/domain/community/communityShareSnapshot.js';
import { GenerationApplicationService } from '../server/domain/generation/GenerationApplicationService.js';

const definition = { schemaVersion: 1, name: 'MIRA', ageYears: 24, appearance: 'Dark hair', situation: 'Market seller' };
const payload = { generationSurface: 'playground', generationMode: 'character-sheet', aspectRatio: '3:4', outputCount: 1, lookSheetDefinition: definition };
test('duplicate accepted reservation returns the original Job without another dispatch', async () => {
  let enqueues = 0;
  const service = new GenerationApplicationService({
    providerRegistry: { assertRuntimeAvailable() {} },
    queueManager: { createJobId: () => 'new-job', enqueue: () => { enqueues++; }, getJobStatus: async () => ({ status: 'completed' }) },
    creditService: { validateAndReserveForRequest: async () => ({ reservation: { jobId: 'accepted-job', reservationId: 'rsv', amountCredits: 20 } }) }
  });
  const result = await service.submitPreparedOperation({ providerId: 'fixture', modelId: 'fixture', context: payload, generationRequest: {} });
  assert.equal(result.jobId, 'accepted-job');
  assert.equal(result.status, 'completed');
  assert.equal(enqueues, 0);
});
test('document sheet stays on the normal pipeline, preserves metadata and has no old crop manifest', async () => {
  const context = normalizeGenerationContext(payload, { userId: 'owner' });
  const plan = { providerPlan: { referenceCount: 0 }, planFingerprint: 'reference-test' };
  await prepareGenerationReferences(context, { actorContext: { userId: 'owner' },
    characterService: { validateGenerationContext: async () => null },
    processingService: { processContext: async value => { value.referenceProcessing = { ...plan, processedReferences: [] }; return plan; } } });
  assert.equal(context.aspectRatio, '3:4');
  assert.equal(context.characterSheetConfig, null);
  assert.equal(context.lookSheetSnapshot.fields.ageYears, 24);
  assert.match(compilePromptFromGenerationContext(context), /24 years/);
  assert.match(compilePromptFromGenerationContext(context), /FRONT, 3\/4 VIEW, SIDE, BACK/);
  assert.match(compilePromptFromGenerationContext(context), /CHARACTER NOTES/);
  assert.equal(context.lookSheetSnapshot.presetVersion, 2);
  assert.equal(context.lookSheetSnapshot.textMode, 'generated');
  assert.equal(context.promptRefinement.enabled, false);
  const options = createQueueOptions(context, { username: 'owner', modelConfig: { defaults: {} } });
  assert.equal(options.storyReferenceHandoff, null);
  assert.deepEqual(options.lookSheetSnapshot, context.lookSheetSnapshot);
  const record = await normalizeGenerationHistoryRecord({ id: 'job', ownerUserId: 'owner', ownerUsername: 'owner', ...options });
  assert.deepEqual(record.lookSheetSnapshot, options.lookSheetSnapshot);
  assert.equal(JSON.stringify(buildGeneratedShareSnapshots(record)).includes('lookSheetSnapshot'), false);
});
test('invalid mode, multi-output and template combinations reject before dispatch', () => {
  for (const patch of [{ outputCount: 2 }, { generationMode: 'scene' }, { generationSurface: 'cinematic' }, { sceneTemplateSnapshot: {} }]) {
    assert.throws(() => normalizeGenerationContext({ ...payload, ...patch }), { code: 'look_sheet_context_invalid' });
  }
  assert.equal(normalizeGenerationContext({ generationMode: 'character-sheet', characterType: 'reusable_model', aspectRatio: '3:4' }).aspectRatio, '1:1');
});
test('changed or removed definition cannot reuse a locked estimate and old quotes stay compatible', async () => {
  const estimate = { estimateId: 'test', userId: 'owner', estimatedCredits: 20, expiresAt: '2099-01-01',
    routing: { requestedProviderId: 'provider', requestedModelId: 'model' },
    pricingInputs: { generationMode: 'character-sheet', outputCount: 1, lookSheetFingerprint: 'pinned' } };
  let reservations = 0;
  const service = new CreditReservationService({ accountRepo: { getEstimateById: async () => estimate,
    reserveCredits: async () => { reservations++; return { reservation: { reservationId: 'test' }, account: {} }; } }, pricingPolicyService: {} });
  const generationRequest = { requestId: 'request', requestedProviderId: 'provider', requestedModelId: 'model', generationMode: 'character-sheet', outputCount: 1, lookSheetFingerprint: 'pinned' };
  for (const fingerprint of ['edited', null]) await assert.rejects(service.validateAndReserveForRequest({ userId: 'owner', estimateId: 'test', metadata: { jobId: 'job' }, generationRequest: { ...generationRequest, lookSheetFingerprint: fingerprint } }), error => error.code === 'credit_estimate_stale' && error.details.mismatches.some(item => item.field === 'lookSheetFingerprint'));
  assert.equal(reservations, 0);
  await service.validateAndReserveForRequest({ userId: 'owner', estimateId: 'test', generationRequest, metadata: { jobId: 'job' } });
  assert.equal(reservations, 1);
});
