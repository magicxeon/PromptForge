import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isReferenceReusableByViewer,
  validateReferenceSlotPolicies
} from '../server/sceneTemplates/sceneReferenceSlotPolicy.js';
import {
  sanitizeReferenceSlotsForPublic
} from '../server/sceneTemplates/sceneTemplateSanitizer.js';

test('isReferenceReusableByViewer permits owner or reusable policy only', () => {
  const slot = { sharePolicy: 'shared_as_reusable_reference' };
  const privateSlot = { sharePolicy: 'required_user_replacement' };
  const previewOnlySlot = { sharePolicy: 'shared_preview_only' };

  // 1. Template Owner -> reusable is true for all slots
  const ownerContext = { username: 'user_alice' };
  assert.equal(isReferenceReusableByViewer(slot, ownerContext, 'user_alice'), true);
  assert.equal(isReferenceReusableByViewer(privateSlot, ownerContext, 'user_alice'), true);
  assert.equal(isReferenceReusableByViewer(previewOnlySlot, ownerContext, 'user_alice'), true);

  // 2. Viewer -> reusable is true only for shared_as_reusable_reference
  const viewerContext = { username: 'user_bob' };
  assert.equal(isReferenceReusableByViewer(slot, viewerContext, 'user_alice'), true);
  assert.equal(isReferenceReusableByViewer(privateSlot, viewerContext, 'user_alice'), false);
  assert.equal(isReferenceReusableByViewer(previewOnlySlot, viewerContext, 'user_alice'), false);
});

test('validateReferenceSlotPolicies aggregates slots correctly', () => {
  const slots = {
    face_ref: { required: true, sharePolicy: 'required_user_replacement' },
    style_ref: { required: false, sharePolicy: 'shared_as_reusable_reference' },
    outfit_ref: { required: false, sharePolicy: 'shared_preview_only' }
  };

  const viewerContext = { username: 'user_bob' };
  const result = validateReferenceSlotPolicies(slots, viewerContext, 'user_alice');

  // face_ref and outfit_ref are private for viewer (not reusable)
  assert.ok(result.privateSlots.face_ref);
  assert.ok(result.privateSlots.outfit_ref);
  
  // style_ref is reusable by viewer
  assert.ok(result.publicSlots.style_ref);

  // face_ref is required and not reusable, so it requires user replacement
  assert.deepEqual(result.requiredReplacements, ['face_ref']);
});

test('sanitizeReferenceSlotsForPublic strips or cleans default values for other viewers', () => {
  const snapshot = {
    replaceableVariables: [
      { id: 'face_ref', type: 'reference_image', defaultValue: { source: 'history', jobId: 'job_1', imageUrl: '/outputs/1.png' } },
      { id: 'outfit_ref', type: 'reference_image', defaultValue: { source: 'history', jobId: 'job_2', imageUrl: '/outputs/2.png', thumbnailUrl: '/outputs/2_thumb.png' } },
      { id: 'style_ref', type: 'reference_image', defaultValue: { source: 'history', jobId: 'job_3', imageUrl: '/outputs/3.png' } }
    ],
    referenceSlotMapping: {
      face_ref: { required: true, sharePolicy: 'required_user_replacement' },
      outfit_ref: { required: false, sharePolicy: 'shared_preview_only' },
      style_ref: { required: false, sharePolicy: 'shared_as_reusable_reference' }
    }
  };

  const viewerContext = { username: 'user_bob' };
  const sanitized = sanitizeReferenceSlotsForPublic(snapshot, viewerContext, 'user_alice');

  // 1. face_ref (required_user_replacement) -> defaultValue is nullified
  const faceVar = sanitized.replaceableVariables.find(v => v.id === 'face_ref');
  assert.equal(faceVar.defaultValue, null);

  // 2. outfit_ref (shared_preview_only) -> defaultValue strips jobId and provider details
  const outfitVar = sanitized.replaceableVariables.find(v => v.id === 'outfit_ref');
  assert.ok(outfitVar.defaultValue);
  assert.equal(outfitVar.defaultValue.jobId, null);
  assert.equal(outfitVar.defaultValue.imageUrl, '/outputs/2.png');
  assert.equal(outfitVar.defaultValue.thumbnailUrl, '/outputs/2_thumb.png');

  // 3. style_ref (shared_as_reusable_reference) -> defaultValue is intact
  const styleVar = sanitized.replaceableVariables.find(v => v.id === 'style_ref');
  assert.ok(styleVar.defaultValue);
  assert.equal(styleVar.defaultValue.jobId, 'job_3');
  assert.equal(styleVar.defaultValue.imageUrl, '/outputs/3.png');
});

test('sanitizeReferenceSlotsForPublic preserves snapshot entirely for the owner', () => {
  const snapshot = {
    replaceableVariables: [
      { id: 'face_ref', type: 'reference_image', defaultValue: { source: 'history', jobId: 'job_1', imageUrl: '/outputs/1.png' } }
    ],
    referenceSlotMapping: {
      face_ref: { required: true, sharePolicy: 'required_user_replacement' }
    }
  };

  const ownerContext = { username: 'user_alice' };
  const sanitized = sanitizeReferenceSlotsForPublic(snapshot, ownerContext, 'user_alice');

  const faceVar = sanitized.replaceableVariables.find(v => v.id === 'face_ref');
  assert.ok(faceVar.defaultValue);
  assert.equal(faceVar.defaultValue.jobId, 'job_1');
});
