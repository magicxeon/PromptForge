import { describe, expect, it } from 'vitest';
import { characterSummarySchema } from '../schemas/profileSchemas';
import { communityPostSchema } from '../../community/schemas/communitySchemas';
import { characterDestinations, characterGalleryImageUrl, characterImageMoments, characterPortraitUrl } from './characterDiscoveryModel';

describe('Character discovery projection', () => {
  it('requires effective permission and exact destination IDs', () => {
    expect(characterDestinations({ handoffAvailable: false, destinationCapabilities: ['scene_builder'] })).toEqual([]);
    expect(characterDestinations({ handoffAvailable: true, destinationCapabilities: ['future_scene_builder', 'fashion'] })).toEqual([]);
    expect(characterDestinations({ handoffAvailable: true, destinationCapabilities: ['scene_builder'] })).toEqual(['scene_builder']);
  });
  it('uses curated gallery media for circles without changing normal card fallbacks', () => {
    const character = characterSummarySchema.parse({ id: 'one', displayName: 'One', faceThumbnailUrl: '/face.jpg', displayImageUrl: '/display.jpg' });
    expect(characterPortraitUrl(character)).toBe('/display.jpg');
    for (const source of ['owner_generation', 'owner_selected_generation', 'featured_work', 'owner_selected_work']) {
      expect(characterGalleryImageUrl({ ...character, displayImageSource: source })).toBe('/display.jpg');
    }
    for (const source of ['casting_preview', 'canonical_sheet', 'future_source', undefined]) {
      expect(characterGalleryImageUrl({ ...character, displayImageSource: source })).toBeNull();
    }
    expect(characterGalleryImageUrl({ ...character, displayImageUrl: null, displayImageSource: 'owner_generation' })).toBeNull();
  });
  it('shows at most three public active image moments, never private or removed work', () => {
    const post = communityPostSchema.parse({ id: 'work', postType: 'image', creator: {}, engagementSummary: {}, imageUrl: '/work.jpg' });
    const result = characterImageMoments([
      { ...post, visibility: 'private' }, { ...post, status: 'removed' }, { ...post, postType: 'video' },
      ...Array.from({ length: 5 }, (_, i) => ({ ...post, id: `public-${i}` }))
    ]);
    expect(result.map(item => item.id)).toEqual(['public-0', 'public-1', 'public-2']);
  });
});
