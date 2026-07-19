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
  ], context);
  const estimate = validator.createEstimate(slots, context, 'user_demo');
  assert.equal(estimate.estimatedTotalCredit, 6);
  assert.doesNotThrow(() => validator.verifyEstimate(estimate.estimateToken, estimate, context, 'user_demo'));
  assert.throws(() => validator.verifyEstimate(estimate.estimateToken, { ...estimate, estimatedTotalCredit: 7 }, context, 'user_demo'), /changed/);
});

test('aggregate run status preserves partial success', () => {
  assert.equal(aggregateRunStatus([{ status: 'completed' }, { status: 'completed' }]), 'completed');
  assert.equal(aggregateRunStatus([{ status: 'completed' }, { status: 'failed' }]), 'partially_completed');
  assert.equal(aggregateRunStatus([{ status: 'failed' }, { status: 'failed' }]), 'failed');
  assert.equal(aggregateRunStatus([{ status: 'processing' }, { status: 'queued' }]), 'processing');
});
