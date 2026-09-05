import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ProviderAvailabilityPolicyService,
  resolveImageProviderWorkflow,
  resolveVideoProviderWorkflow
} from '../server/domain/admin-configuration/ProviderAvailabilityPolicyService.js';

function state(overrides = {}) {
  return {
    schemaVersion: 1,
    version: 4,
    updatedAt: '2026-09-05T00:00:00.000Z',
    providers: {}, models: {}, workflows: {}, history: [],
    ...overrides
  };
}

test('provider master disable dominates enabled model and workflow overrides', () => {
  const service = new ProviderAvailabilityPolicyService({
    initialState: state({
      providers: { modelark: { enabled: false, reason: 'maintenance' } },
      models: { 'modelark/seedream': { enabled: true } },
      workflows: { 'modelark/seedream/cinematic.storyboard_image': { enabled: true } }
    })
  });

  const decision = service.evaluate({
    providerId: 'modelark', modelId: 'seedream', workflow: 'cinematic.storyboard_image'
  });
  assert.equal(decision.enabled, false);
  assert.equal(decision.scope, 'provider');
  assert.throws(() => service.assertAvailable({ providerId: 'modelark', modelId: 'seedream' }),
    error => error.code === 'provider_runtime_disabled' && error.details.scope === 'provider');
});

test('model master disable dominates workflow while workflow disable remains narrow', () => {
  const modelDisabled = new ProviderAvailabilityPolicyService({
    initialState: state({
      models: { 'openai/gpt-image': { enabled: false, reason: 'model pause' } },
      workflows: { 'openai/gpt-image/playground.image': { enabled: true } }
    })
  });
  assert.equal(modelDisabled.evaluate({
    providerId: 'openai', modelId: 'gpt-image', workflow: 'playground.image'
  }).scope, 'model');

  const workflowDisabled = new ProviderAvailabilityPolicyService({
    initialState: state({
      workflows: { 'openai/gpt-image/comparison.image': { enabled: false, reason: 'comparison pause' } }
    })
  });
  assert.equal(workflowDisabled.evaluate({
    providerId: 'openai', modelId: 'gpt-image', workflow: 'comparison.image'
  }).enabled, false);
  assert.equal(workflowDisabled.evaluate({
    providerId: 'openai', modelId: 'gpt-image', workflow: 'playground.image'
  }).enabled, true);
});

test('workflow resolvers map product surfaces without page-path coupling', () => {
  assert.equal(resolveImageProviderWorkflow({ generationSurface: 'playground' }), 'playground.image');
  assert.equal(resolveImageProviderWorkflow({ generationSurface: 'studio', generationMode: 'headshot' }), 'studio.face');
  assert.equal(resolveImageProviderWorkflow({ generationSurface: 'cinematic', generationMode: 'scene' }), 'cinematic.storyboard_image');
  assert.equal(resolveImageProviderWorkflow({ workflow: 'comparison.image' }), 'comparison.image');
  assert.equal(resolveVideoProviderWorkflow(), 'playground.video');
  assert.equal(resolveVideoProviderWorkflow({ capability: 'cinematic' }), 'cinematic.produce_video');
});
