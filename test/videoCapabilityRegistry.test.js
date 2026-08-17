import assert from 'node:assert/strict';
import test from 'node:test';
import { videoCapabilityRegistry } from '../server/domain/generation/VideoCapabilityRegistry.js';

test('paid video catalog exposes no unqualified research models', () => {
  assert.deepEqual(videoCapabilityRegistry.getPublicCatalog().models, []);
  assert.equal(videoCapabilityRegistry.getPublicCatalog({ includeResearch: true }).models.length, 9);
});

test('video capability validation blocks paid routing and rejects unsupported Veo combinations', () => {
  const request = {
    providerId: 'gemini', modelId: 'veo-3.1-fast-generate-preview',
    operation: 'cinematic_draft_clip', aspectRatio: '9:16', resolution: '720p',
    durationSeconds: 4, audioMode: 'generated', referenceImageCount: 0
  };
  assert.throws(() => videoCapabilityRegistry.validateRequest(request), error => error.code === 'video_model_not_qualified');
  assert.throws(
    () => videoCapabilityRegistry.validateRequest({ ...request, resolution: '1080p' }, { allowResearch: true }),
    error => error.code === 'video_parameter_combination_unsupported'
  );
  assert.equal(videoCapabilityRegistry.validateRequest({ ...request, durationSeconds: 8, resolution: '1080p' }, { allowResearch: true }).providerId, 'gemini');
});

test('Seedance 2.5 keeps 1080p blocked by capability evidence', () => {
  assert.throws(() => videoCapabilityRegistry.validateRequest({
    providerId: 'modelark', modelId: 'dreamina-seedance-2-5-260628',
    operation: 'cinematic_final_clip', aspectRatio: '9:16', resolution: '1080p',
    durationSeconds: 5, audioMode: 'generated', referenceImageCount: 1
  }, { allowResearch: true }), error => error.code === 'video_parameter_unsupported');
});
