import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getResolvedReferenceImages
} from '../server/providers/resolvedReferenceImages.js';

test('provider references prefer the immutable processing-plan order', () => {
  assert.deepEqual(getResolvedReferenceImages({
    resolvedReferenceImagesOrdered: ['face', 'outfit', 'style'],
    resolvedTemplateBaselineReference: 'legacy-template',
    resolvedFaceReferenceImageA: 'legacy-face'
  }), ['face', 'outfit', 'style']);
});

test('provider references retain the legacy order for old queued jobs', () => {
  assert.deepEqual(getResolvedReferenceImages({
    resolvedTemplateBaselineReference: 'template',
    resolvedCharacterReferenceImageA: 'character',
    resolvedFaceReferenceImageA: 'face'
  }), ['template', 'character', 'face']);
});
