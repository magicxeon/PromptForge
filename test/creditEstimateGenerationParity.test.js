import assert from 'node:assert/strict';
import test from 'node:test';
import { createEstimateOptions } from '../server/app/routes/creditRoutes.js';

test('credit estimate uses canonical Reusable Model ratio instead of stale client ratio', () => {
  const options = createEstimateOptions({
    body: {
      requestedProviderId: 'openai',
      requestedModelId: 'gpt-image-1.5',
      aspectRatio: '6:8',
      outputCount: 4,
      generationMode: 'character-sheet',
      referenceCount: 0
    },
    processing: {
      aspectRatio: '1:1',
      outputCount: 4,
      generationMode: 'character-sheet',
      referenceCount: 1,
      planFingerprint: 'rpp-casting'
    },
    userId: 'usr_casting'
  });

  assert.equal(options.aspectRatio, '1:1');
  assert.equal(options.outputCount, 4);
  assert.equal(options.generationMode, 'character-sheet');
  assert.equal(options.referenceCount, 1);
  assert.equal(options.referenceProcessingPlanFingerprint, 'rpp-casting');
});

test('credit estimate preserves raw inputs when no generation context is supplied', () => {
  const options = createEstimateOptions({
    body: {
      aspectRatio: '6:8',
      outputCount: 2,
      generationMode: 'scene',
      referenceCount: 1
    },
    templatePricing: { executionReferenceCount: 2 },
    userId: 'usr_scene'
  });

  assert.equal(options.aspectRatio, '6:8');
  assert.equal(options.outputCount, 2);
  assert.equal(options.generationMode, 'scene');
  assert.equal(options.referenceCount, 3);
});
