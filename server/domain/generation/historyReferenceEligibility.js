export const HISTORY_REFERENCE_ROLES = new Set([
  'face_reference',
  'character_reference',
  'style_reference',
  'pose_reference',
  'outfit_front',
  'outfit_back'
]);

export function isHistoryEligibleForReferenceRole(item, role) {
  switch (role) {
    case 'face_reference':
      return item?.mode === 'headshot';
    case 'character_reference':
      return item?.mode === 'character-sheet';
    case 'pose_reference':
      return item?.mode === 'normal';
    case 'outfit_front':
    case 'outfit_back':
      return item?.mode === 'normal'
        || (item?.mode === 'character-sheet'
          && item?.characterSheetConfig?.characterType === 'styled_character');
    case 'style_reference':
      return true;
    default:
      return false;
  }
}
