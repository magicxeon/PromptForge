import assert from 'node:assert/strict';
import test from 'node:test';
import { videoCapabilityRegistry } from '../server/domain/generation/VideoCapabilityRegistry.js';
import { calculateVideoPricingPreview } from '../server/domain/credits/VideoPricingCalculator.js';

const policy = {
  pricingFxThbPerUsd: 35,
  operatingSafetyBufferRate: 0.15,
  targetGrossMarginRate: 0.70,
  creditsPerThbAssumption: 10,
  creditRoundingIncrement: 5
};

test('Veo pricing scales by output seconds, resolution and count', () => {
  const model = videoCapabilityRegistry.resolve('gemini', 'veo-3.1-fast-generate-preview');
  const quote = calculateVideoPricingPreview(model, {
    aspectRatio: '9:16', resolution: '720p', durationSeconds: 8, outputCount: 1
  }, policy);
  assert.equal(quote.providerCostUsd, 0.8);
  assert.equal(quote.estimatedCredits, 1075);
  const doubled = calculateVideoPricingPreview(model, {
    aspectRatio: '9:16', resolution: '720p', durationSeconds: 8, outputCount: 2
  }, policy);
  assert.equal(doubled.estimatedCredits, 2150);
});

test('Gemini Omni uses the official effective 720p output-second rate', () => {
  const model = videoCapabilityRegistry.resolve('gemini', 'gemini-omni-flash-preview');
  const quote = calculateVideoPricingPreview(model, {
    aspectRatio: '9:16', resolution: '720p', durationSeconds: 8, outputCount: 1
  }, policy);
  assert.equal(quote.providerCostUsd, 0.8);
  assert.equal(quote.estimatedCredits, 1075);
  assert.equal(quote.providerRateVersion, 'google-omni-standard-2026-08-30');
});

test('Seedance token pricing includes target pixels, fps and input video duration', () => {
  const model = videoCapabilityRegistry.resolve('modelark', 'dreamina-seedance-2-0-mini-260615');
  const withoutVideo = calculateVideoPricingPreview(model, {
    aspectRatio: '9:16', resolution: '720p', durationSeconds: 5, fps: 24, audioMode: 'none'
  }, policy);
  const withVideo = calculateVideoPricingPreview(model, {
    aspectRatio: '9:16', resolution: '720p', durationSeconds: 5, fps: 24, audioMode: 'none', inputVideoSeconds: 10
  }, policy);
  assert.ok(withoutVideo.estimatedCompletionTokens > 0);
  assert.ok(withVideo.providerCostUsd > withoutVideo.providerCostUsd);
  assert.equal(withVideo.providerRateVersion, 'byteplus-seedance-2026-08-17');
});
