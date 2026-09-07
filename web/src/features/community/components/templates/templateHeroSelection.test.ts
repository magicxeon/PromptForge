import { expect, it } from 'vitest';
import { communityPostSchema } from '../../schemas/communitySchemas';
import { selectTemplateHero } from './templateHeroSelection';

const original = communityPostSchema.parse({ id: 'original', postType: 'template', imageUrl: '/original.jpg',
  status: 'published', visibility: 'public', templateAvailability: true, creator: {}, engagementSummary: {} });
const creations = Array.from({ length: 3 }, (_, i) => communityPostSchema.parse({ id: `work-${i}`,
  postType: 'image', imageUrl: `/work-${i}.jpg`, status: 'published', visibility: 'public', creator: {}, engagementSummary: {} }));

it('requires three creation images excluding original and preserves canonical like order', () => {
  for (const items of [[], creations.slice(0, 1), creations.slice(0, 2), [original, ...creations.slice(0, 2)]]) {
    expect(selectTemplateHero([original], new Map([[original.id, { items }]]))).toBeNull();
  }
  expect(selectTemplateHero([original], new Map([[original.id, { items: creations }]])))
    .toEqual({ original, creations });
});

it('does not fill a family with duplicate, private, removed, non-image or missing-media records', () => {
  for (const invalid of [creations[0], { ...creations[2], visibility: 'private' },
    { ...creations[2], status: 'removed' }, { ...creations[2], postType: 'video' },
    { ...creations[2], imageUrl: null, thumbnailUrl: null }]) {
    const items = [creations[0], creations[1], invalid].map(item => communityPostSchema.parse(item));
    expect(selectTemplateHero([original], new Map([[original.id, { items }]]))).toBeNull();
  }
});

it('selects the first eligible current result, not the Featured root or another cached family', () => {
  const next = { ...original, id: 'next' };
  const previews = new Map([[original.id, { items: creations.slice(0, 2) }], [next.id, { items: creations }]]);
  expect(selectTemplateHero([original, next], previews)?.original.id).toBe('next');
  expect(selectTemplateHero([original], previews)).toBeNull();
  expect(selectTemplateHero([], previews)).toBeNull();
  expect(selectTemplateHero([next], new Map())).toBeNull();
});

it('rejects unavailable or non-public originals and supports thumbnail-only public media', () => {
  const previews = new Map([[original.id, { items: creations }]]);
  expect(selectTemplateHero([{ ...original, templateAvailability: false }], previews)).toBeNull();
  expect(selectTemplateHero([{ ...original, visibility: 'private' }], previews)).toBeNull();
  expect(selectTemplateHero([{ ...original, imageUrl: null, thumbnailUrl: '/thumb.jpg' }], previews)).not.toBeNull();
});
