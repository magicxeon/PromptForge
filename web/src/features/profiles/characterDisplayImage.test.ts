import { describe, expect, it } from 'vitest';
import { characterSummarySchema } from './schemas/profileSchemas';
import { characterDisplayImages } from './characterDisplayImage';

describe('Character display projection', () => {
  it('prefers approved display artwork without modifying canonical reference fields', () => {
    const item = characterSummarySchema.parse({ id: 'a', displayName: 'Alice', displayImageUrl: '/work', displayImageSource: 'owner_selected_work',
      imageUrl: '/sheet', thumbnailUrl: '/front', faceThumbnailUrl: '/face', characterProfileVersionId: 'v1' });
    const before = structuredClone(item);
    expect(characterDisplayImages(item)).toEqual([{ src: '/work', fit: 'cover' }, { src: '/front', fit: 'contain' }, { src: '/face', fit: 'contain' }, { src: '/sheet', fit: 'contain' }]);
    expect(item).toEqual(before);
  });
  it.each(['canonical_sheet', 'owner_canonical_sheet'])('deduplicates and contains a %s multi-view sheet', source => {
    const item = characterSummarySchema.parse({ id: 'a', displayName: 'Alice', displayImageUrl: '/sheet', displayImageSource: source, imageUrl: '/sheet' });
    expect(characterDisplayImages(item)).toEqual([{ src: '/sheet', fit: 'contain' }]);
    expect(characterDisplayImages(characterSummarySchema.parse({ id: 'empty', displayName: 'Empty' }))).toEqual([]);
  });
});
