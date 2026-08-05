import assert from 'node:assert/strict';
import test from 'node:test';
import { isHistoryEligibleForReferenceRole } from '../server/domain/generation/historyReferenceEligibility.js';

test('History reference roles filter generated outputs before pagination', () => {
  const face = { mode: 'headshot' };
  const reusable = {
    mode: 'character-sheet',
    characterSheetConfig: { characterType: 'reusable_model' }
  };
  const styled = {
    mode: 'character-sheet',
    characterSheetConfig: { characterType: 'styled_character' }
  };
  const scene = { mode: 'normal' };

  assert.equal(isHistoryEligibleForReferenceRole(face, 'face_reference'), true);
  assert.equal(isHistoryEligibleForReferenceRole(scene, 'face_reference'), false);
  assert.equal(isHistoryEligibleForReferenceRole(reusable, 'character_reference'), true);
  assert.equal(isHistoryEligibleForReferenceRole(reusable, 'outfit_front'), false);
  assert.equal(isHistoryEligibleForReferenceRole(styled, 'outfit_front'), true);
  assert.equal(isHistoryEligibleForReferenceRole(scene, 'pose_reference'), true);
});
