import assert from 'node:assert/strict';
import test from 'node:test';
import { ComparisonValidator, aggregateRunStatus } from '../server/domain/comparisons/ComparisonValidator.js';
import { ProviderRegistry } from '../server/providers/ProviderRegistry.js';

function createRegistry() {
  return new ProviderRegistry({
    schemaVersion: 7,
    defaultProvider: 'alpha',
    providers: [{
      id: 'alpha',
      enabled: true,
      apiKeyEnv: 'ALPHA_KEY',
      displayName: { en: 'Alpha', th: 'Alpha' },
      defaultModel: 'image-a',
      models: [{
        id: 'image-a',
        enabled: true,
        displayName: { en: 'Image A', th: 'Image A' },
        capabilities: {
          imageGeneration: true,
          imageReferences: true,
          maxReferenceImages: 2,
          aspectRatios: ['1:1']
        },
        creditCost: 3
      }]
    }]
  }, { ALPHA_KEY: 'secret' });
}

function createMuseTestingRegistry(nodeEnvironment = 'test') {
  return new ProviderRegistry({
    schemaVersion: 8,
    defaultProvider: 'meta-muse',
    providers: [{
      id: 'meta-muse', enabled: true, apiKeyEnv: 'MUSE_KEY',
      displayName: { en: 'Meta Muse', th: 'Meta Muse' },
      defaultModel: 'muse-image-1.0',
      models: [{
        id: 'muse-image-1.0', enabled: true,
        displayName: { en: 'Muse Image 1.0', th: 'Muse Image 1.0' },
        allowedGenerationSurfaces: ['playground'],
        testingRoutingEnabled: true,
        paidRoutingEnabled: false,
        qualificationStatus: 'internal_testing',
        pricingStatus: 'priced',
        capabilities: {
          imageGeneration: true,
          imageReferences: false,
          maxReferenceImages: 0,
          aspectRatios: ['1:1', '9:16']
        }
      }]
    }]
  }, { NODE_ENV: nodeEnvironment, MUSE_KEY: 'secret' });
}

test('comparison validation accepts duplicate models but enforces 2-4 slots', () => {
  const validator = new ComparisonValidator({ providerRegistry: createRegistry(), secret: 'test' });
  const context = { aspectRatio: '1:1', referenceCount: 0 };
  const duplicateSlots = [
    { id: 'one', provider: 'alpha', model: 'image-a' },
    { id: 'two', provider: 'alpha', model: 'image-a' }
  ];
  assert.equal(validator.validateSlots(duplicateSlots, context).length, 2);
  assert.throws(() => validator.validateSlots(duplicateSlots.slice(0, 1), context), /between 2 and 4/);
  assert.throws(() => validator.validateSlots([...duplicateSlots, ...duplicateSlots, duplicateSlots[0]], context), /between 2 and 4/);
});

test('comparison validation blocks duplicate slot IDs and capability mismatches', () => {
  const validator = new ComparisonValidator({ providerRegistry: createRegistry(), secret: 'test' });
  assert.throws(() => validator.validateSlots([
    { id: 'same', provider: 'alpha', model: 'image-a' },
    { id: 'same', provider: 'alpha', model: 'image-a' }
  ], { aspectRatio: '1:1', referenceCount: 0 }), /Duplicate slot ID/);
  assert.throws(() => validator.validateSlots([
    { id: 'one', provider: 'alpha', model: 'image-a' },
    { id: 'two', provider: 'alpha', model: 'image-a' }
  ], { aspectRatio: '1:1', referenceCount: 3 }), /supports up to 2/);
});

test('estimate tokens bind slots, cost, context and expiry', () => {
  const validator = new ComparisonValidator({ providerRegistry: createRegistry(), secret: 'test' });
  const context = { aspectRatio: '1:1', referenceCount: 0, mode: 'normal', selections: {}, customColors: {} };
  const slots = validator.validateSlots([
    { id: 'one', provider: 'alpha', model: 'image-a' },
    { id: 'two', provider: 'alpha', model: 'image-a' }
  ], context).map((slot, index) => ({
    ...slot,
    estimateId: `estimate_${index + 1}`,
    estimatedCredit: 3
  }));
  const estimate = validator.createEstimate(slots, context, 'usr_demo');
  assert.equal(estimate.estimatedTotalCredit, 6);
  assert.doesNotThrow(() => validator.verifyEstimate(estimate.estimateToken, estimate, context, 'usr_demo'));
  assert.throws(() => validator.verifyEstimate(estimate.estimateToken, { ...estimate, estimatedTotalCredit: 7 }, context, 'usr_demo'), /changed/);
  assert.throws(() => validator.verifyEstimate(estimate.estimateToken, estimate, context, 'usr_alice'), /changed/);
});

test('aggregate run status preserves partial success', () => {
  assert.equal(aggregateRunStatus([{ status: 'completed' }, { status: 'completed' }]), 'completed');
  assert.equal(aggregateRunStatus([{ status: 'completed' }, { status: 'failed' }]), 'partially_completed');
  assert.equal(aggregateRunStatus([{ status: 'failed' }, { status: 'failed' }]), 'failed');
  assert.equal(aggregateRunStatus([{ status: 'processing' }, { status: 'queued' }]), 'processing');
});

test('video comparison requires exactly two slots and remains qualification gated', () => {
  const validator = new ComparisonValidator({ providerRegistry: createRegistry(), secret: 'test' });
  const slots = [
    { id: 'one', provider: 'alpha', model: 'image-a' },
    { id: 'two', provider: 'alpha', model: 'image-a' }
  ];
  assert.throws(
    () => validator.validateSlots(slots.slice(0, 1), { mediaType: 'video' }),
    /exactly 2 slots/
  );
  assert.throws(
    () => validator.validateSlots(slots, { mediaType: 'video' }),
    error => error.code === 'video_comparison_not_qualified' && error.statusCode === 409
  );
});

test('Playground comparison accepts testing Muse while other surfaces and production remain blocked', () => {
  const slots = [
    { id: 'one', provider: 'meta-muse', model: 'muse-image-1.0' },
    { id: 'two', provider: 'meta-muse', model: 'muse-image-1.0' }
  ];
  const testValidator = new ComparisonValidator({
    providerRegistry: createMuseTestingRegistry(), secret: 'test'
  });
  const context = {
    aspectRatio: '9:16', referenceCount: 0, generationSurface: 'playground',
    mode: 'normal', selections: {}, customColors: {}
  };
  assert.equal(testValidator.validateSlots(slots, context).length, 2);
  assert.throws(
    () => testValidator.validateSlots(slots, { ...context, generationSurface: 'cinematic' }),
    error => error.code === 'provider_surface_unsupported'
  );
  assert.throws(
    () => testValidator.validateSlots(slots, { ...context, generationSurface: null }),
    error => error.code === 'provider_surface_unsupported'
  );
  assert.throws(
    () => testValidator.validateSlots(slots, { ...context, referenceCount: 1 }),
    /does not support reference images/
  );

  const productionValidator = new ComparisonValidator({
    providerRegistry: createMuseTestingRegistry('production'), secret: 'test'
  });
  assert.throws(
    () => productionValidator.validateSlots(slots, context),
    error => error.code === 'provider_not_released'
  );
});

test('comparison estimate token binds the generation surface', () => {
  const validator = new ComparisonValidator({ providerRegistry: createRegistry(), secret: 'test' });
  const context = {
    aspectRatio: '1:1', referenceCount: 0, mode: 'normal',
    generationSurface: 'playground', selections: {}, customColors: {}
  };
  const slots = validator.validateSlots([
    { id: 'one', provider: 'alpha', model: 'image-a' },
    { id: 'two', provider: 'alpha', model: 'image-a' }
  ], context).map((slot, index) => ({
    ...slot, estimateId: `estimate_${index + 1}`, estimatedCredit: 3
  }));
  const estimate = validator.createEstimate(slots, context, 'usr_demo');
  assert.throws(
    () => validator.verifyEstimate(
      estimate.estimateToken,
      estimate,
      { ...context, generationSurface: 'studio' },
      'usr_demo'
    ),
    /changed/
  );
});
