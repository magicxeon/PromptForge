import assert from 'node:assert/strict';
import test from 'node:test';
import { ProviderRuntimeDisabledError } from '../server/domain/admin-configuration/ProviderAvailabilityPolicyService.js';
import { GenerationApplicationService } from '../server/domain/generation/GenerationApplicationService.js';

test('image generation blocks a runtime-disabled selection before Credit reservation', async () => {
  let reservations = 0;
  const decision = {
    enabled: false,
    scope: 'model',
    providerId: 'modelark',
    modelId: 'seedream-test',
    workflow: 'cinematic.storyboard_image',
    reason: 'Model maintenance',
    updatedAt: '2026-09-05T00:00:00.000Z'
  };
  const service = new GenerationApplicationService({
    providerRegistry: {
      assertRuntimeAvailable() { throw new ProviderRuntimeDisabledError(decision); }
    },
    queueManager: {
      createJobId: () => 'job_runtime_gate',
      subscribeLifecycle: () => {}
    },
    templateCoreService: {},
    creditService: {
      validateAndReserveForRequest: async () => { reservations += 1; return {}; }
    },
    castingExportService: {},
    telemetry: {},
    promptRefinementService: {},
    generationGroupRepository: {}
  });

  await assert.rejects(() => service.submitPreparedOperation({
    providerId: 'modelark',
    modelId: 'seedream-test',
    estimateId: 'estimate_1',
    requestId: 'request_1',
    payerUserId: 'usr_1',
    payerUsername: 'owner',
    context: { generationSurface: 'cinematic', generationMode: 'scene' },
    compiledPrompt: 'Prompt',
    modelConfig: {},
    providerConfig: {},
    generationRequest: { generationMode: 'scene' }
  }), error => error.code === 'provider_runtime_disabled'
    && error.details.workflow === 'cinematic.storyboard_image');
  assert.equal(reservations, 0);
});
