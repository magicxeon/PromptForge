import assert from 'node:assert/strict';
import test from 'node:test';
import { eligibleDurations, reconcileVideoDuration } from '../server/domain/generation/VideoDurationReconciliation.js';

const veo = {
  providerId: 'gemini', modelId: 'veo-3.1-lite-generate-preview',
  durationControlMode: 'exact', durations: [4, 6, 8]
};

test('exact duration reconciliation rounds up and preserves a deterministic trim', () => {
  assert.deepEqual(reconcileVideoDuration({
    model: veo,
    plannedDurationSeconds: 7,
    requestedDurationSeconds: 4,
    resolution: '720p'
  }), {
    plannedDurationSeconds: 7,
    renderDurationSeconds: 8,
    trimDurationSeconds: 1,
    durationControlMode: 'exact',
    strategy: 'pad_and_trim',
    supportedDurations: [4, 6, 8],
    requiresSplit: false,
    reasonCode: 'video_duration_padded_for_provider'
  });
});

test('Veo reference and non-720p combinations expose only the eight-second duration', () => {
  assert.deepEqual(eligibleDurations(veo, { resolution: '1080p', referenceImageCount: 0 }), [8]);
  assert.deepEqual(eligibleDurations(veo, { resolution: '720p', referenceImageCount: 1 }), [8]);
});

test('prompted duration reconciliation identifies a target without claiming a trim', () => {
  const result = reconcileVideoDuration({
    model: {
      providerId: 'gemini', modelId: 'gemini-omni-1.1-flash',
      durationControlMode: 'prompted', durations: [3, 4, 5, 6, 7, 8, 9, 10]
    },
    plannedDurationSeconds: 6.4,
    resolution: '720p'
  });
  assert.equal(result.renderDurationSeconds, 7);
  assert.equal(result.durationControlMode, 'prompted');
  assert.equal(result.strategy, 'prompt_target');
  assert.equal(result.trimDurationSeconds, 0);
});

test('duration reconciliation blocks a Shot above the provider maximum', () => {
  assert.throws(
    () => reconcileVideoDuration({ model: veo, plannedDurationSeconds: 9, resolution: '720p' }),
    error => error.code === 'video_duration_split_required'
      && error.details.maximumDurationSeconds === 8
  );
});
