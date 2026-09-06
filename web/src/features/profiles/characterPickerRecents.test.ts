import { beforeEach, expect, it } from 'vitest';
import { readCharacterPickerRecents, rememberCharacterPick } from './characterPickerRecents';
beforeEach(() => localStorage.clear());
it('stores only eight deduplicated IDs, latest first, isolated by actor', () => {
  for (let i = 0; i < 12; i++) rememberCharacterPick('alice', `c${i}`);
  rememberCharacterPick('alice', 'c6');
  expect(readCharacterPickerRecents('alice')).toEqual(['c6', 'c11', 'c10', 'c9', 'c8', 'c7', 'c5', 'c4']);
  expect(readCharacterPickerRecents('bob')).toEqual([]);
});
it('ignores corrupted browser payloads', () => {
  localStorage.setItem('mpf.react.draft:character-picker-recents:alice', 'invalid json');
  expect(readCharacterPickerRecents('alice')).toEqual([]);
});
