import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isReferenceReusableByViewer,
  validateReferenceSlotPolicies
} from '../server/sceneTemplates/sceneReferenceSlotPolicy.js';
import {
  sanitizeReferenceSlotsForPublic
} from '../server/sceneTemplates/sceneTemplateSanitizer.js';
import { createMockPrivateReferenceSlots } from './sceneQaFixtures.js';

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

test('sanitizeReferenceSlotsForPublic strips or cleans default values and mapping properties for other viewers', () => {
  const snapshot = {
    replaceableVariables: [
      { id: 'face_ref', type: 'reference_image', defaultValue: { source: 'history', jobId: 'job_1', imageUrl: '/outputs/1.png' } },
      { id: 'outfit_ref', type: 'reference_image', defaultValue: { source: 'history', jobId: 'job_2', imageUrl: '/outputs/2.png', thumbnailUrl: '/outputs/2_thumb.png' } },
      { id: 'style_ref', type: 'reference_image', defaultValue: { source: 'history', jobId: 'job_3', imageUrl: '/outputs/3.png' } }
    ],
    referenceSlotMapping: {
      face_ref: { required: true, sharePolicy: 'required_user_replacement', sourceJobId: 'job_1', imageUrl: '/outputs/1.png', thumbnailUrl: '/outputs/1_thumb.png' },
      outfit_ref: { required: false, sharePolicy: 'shared_preview_only', sourceJobId: 'job_2', imageUrl: '/outputs/2.png', thumbnailUrl: '/outputs/2_thumb.png' },
      style_ref: { required: false, sharePolicy: 'shared_as_reusable_reference', sourceJobId: 'job_3', imageUrl: '/outputs/3.png', thumbnailUrl: '/outputs/3_thumb.png' }
    }
  };

  const viewerContext = { username: 'user_bob' };
  const sanitized = sanitizeReferenceSlotsForPublic(snapshot, viewerContext, 'user_alice');

  // 1. face_ref (required_user_replacement) -> defaultValue is nullified
  const faceVar = sanitized.replaceableVariables.find(v => v.id === 'face_ref');
  assert.equal(faceVar.defaultValue, null);

  // Assert face_ref mapping sanitation
  const faceMap = sanitized.referenceSlotMapping.face_ref;
  assert.equal(faceMap.reuseAllowed, false);
  assert.equal(faceMap.previewAllowed, false);
  assert.equal(faceMap.sourceJobId, undefined);
  assert.equal(faceMap.imageUrl, undefined);
  assert.equal(faceMap.thumbnailUrl, undefined);

  // 2. outfit_ref (shared_preview_only) -> defaultValue is nullified, previewValue has imagery
  const outfitVar = sanitized.replaceableVariables.find(v => v.id === 'outfit_ref');
  assert.equal(outfitVar.defaultValue, null);
  assert.ok(outfitVar.previewValue);
  assert.equal(outfitVar.previewValue.imageUrl, '/outputs/2.png');
  assert.equal(outfitVar.previewValue.thumbnailUrl, '/outputs/2_thumb.png');

  // Assert outfit_ref mapping sanitation
  const outfitMap = sanitized.referenceSlotMapping.outfit_ref;
  assert.equal(outfitMap.reuseAllowed, false);
  assert.equal(outfitMap.previewAllowed, true);
  assert.equal(outfitMap.sourceJobId, undefined);
  assert.equal(outfitMap.imageUrl, undefined);
  assert.equal(outfitMap.thumbnailUrl, '/outputs/2_thumb.png'); // Keep thumbnail for preview-only mapping

  // 3. style_ref (shared_as_reusable_reference) -> defaultValue is intact
  const styleVar = sanitized.replaceableVariables.find(v => v.id === 'style_ref');
  assert.ok(styleVar.defaultValue);
  assert.equal(styleVar.defaultValue.jobId, 'job_3');
  assert.equal(styleVar.defaultValue.imageUrl, '/outputs/3.png');

  // Assert style_ref mapping sanitation (preserved)
  const styleMap = sanitized.referenceSlotMapping.style_ref;
  assert.equal(styleMap.reuseAllowed, true);
  assert.equal(styleMap.previewAllowed, true);
  assert.equal(styleMap.sourceJobId, 'job_3');
  assert.equal(styleMap.imageUrl, '/outputs/3.png');
  assert.equal(styleMap.thumbnailUrl, '/outputs/3_thumb.png');
});

test('sanitizeReferenceSlotsForPublic preserves snapshot entirely for the owner', () => {
  // Use shared fixture to build private slot mapping
  const privateSlots = createMockPrivateReferenceSlots();
  const snapshot = {
    replaceableVariables: [
      { id: 'face_ref', type: 'reference_image', defaultValue: { source: 'history', jobId: 'job_1', imageUrl: '/outputs/1.png' } },
      { id: 'character_ref', type: 'reference_image', defaultValue: { source: 'history', jobId: 'job_2', imageUrl: '/outputs/2.png' } }
    ],
    referenceSlotMapping: privateSlots
  };

  const ownerContext = { username: 'user_alice' };
  const sanitized = sanitizeReferenceSlotsForPublic(snapshot, ownerContext, 'user_alice');

  const faceVar = sanitized.replaceableVariables.find(v => v.id === 'face_ref');
  assert.ok(faceVar.defaultValue);
  assert.equal(faceVar.defaultValue.jobId, 'job_1');

  const charVar = sanitized.replaceableVariables.find(v => v.id === 'character_ref');
  assert.ok(charVar.defaultValue);
  assert.equal(charVar.defaultValue.jobId, 'job_2');
});

// ---
// DEFERRED: Provider / Model Unavailable Fallback (Scene-010 § 218)
// ---
// Requirement: When the model/provider in a sceneTemplateSnapshot is no longer
// available in the provider catalog, the server should produce a warning or
// fallback state instead of crashing.
//
// Coverage status: ** Manual QA only for MVP **
//
// Reason: Testing this case deterministically would require either:
//   a) Injecting a live provider catalog into a unit-test environment, or
//   b) Mocking the full ProviderFactory + catalog in the test runner.
// Neither is stable enough for automated CI at this stage.
//
// When to automate:
//   - After ProviderFactory exposes a testable catalog interface.
//   - Or after a stable provider fixture file exists (test/fixtures/provider-catalog.json).
//
// Manual QA steps:
//   1. Edit a generated image's sceneTemplateSnapshot.providerModelSnapshot.providerId
//      to a non-existent value (e.g. "provider_deleted").
//   2. Click "Use Template" and attempt to Generate.
//   3. Confirm the server returns a descriptive error, not a crash.
