import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createFashionExecutionPrompt
} from '../server/domain/fashion-blueprint/FashionGenerationContext.js';

const item = {
  productType: 'dress',
  name: 'Pastel dress',
  integrityLevel: 'balanced',
  colorNotes: 'pastel pink'
};

test('Fashion Pose Proxy execution excludes the Template source garment prompt', () => {
  const prompt = createFashionExecutionPrompt({
    templatePoseProxy: { id: 'proxy_1' },
    poseDirection: 'Preserve the Template pose',
    environmentDirection: 'Preserve the Template environment',
    qualityPromptDirective: 'Clean commercial quality'
  }, item, {
    finalPromptSnapshot: 'wearing a blazer, plain inner top, and trousers'
  });

  assert.doesNotMatch(prompt, /wearing a blazer/i);
  assert.match(prompt, /Pastel dress/);
  assert.match(prompt, /identity-neutral pose proxy/i);
});

test('Fashion execution retains the Template prompt only when no Pose Proxy exists', () => {
  const prompt = createFashionExecutionPrompt({
    templatePoseProxy: null,
    poseDirection: 'Preserve the Template pose',
    environmentDirection: 'Preserve the Template environment',
    qualityPromptDirective: 'Clean commercial quality'
  }, item, {
    finalPromptSnapshot: 'A gallery scene with soft window light'
  });

  assert.match(prompt, /gallery scene with soft window light/i);
});
