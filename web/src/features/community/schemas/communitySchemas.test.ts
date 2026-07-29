import { describe, expect, it } from 'vitest';
import { communityFeedPageSchema, communityPostSchema } from './communitySchemas';

describe('communityPostSchema', () => {
  it('normalizes a minimal public image post without requiring private snapshot data', () => {
    const post = communityPostSchema.parse({
      id: 'post_1',
      postType: 'image',
      creator: { displayName: 'Demo Creator' },
      engagementSummary: {}
    });

    expect(post.creator.displayName).toBe('Demo Creator');
    expect(post.engagementSummary.likeCount).toBe(0);
    expect(post.templateAvailability).toBe(false);
  });

  it('preserves public comparison media slots', () => {
    const post = communityPostSchema.parse({
      id: 'post_2',
      postType: 'comparison',
      creator: { displayName: 'Demo Creator' },
      engagementSummary: {},
      comparisonSnapshot: {
        slots: [{
          slotId: 'slot_1',
          imageUrl: '/api/community/posts/post_2/comparison-slots/slot_1/image',
          thumbnailUrl: '/api/community/posts/post_2/comparison-slots/slot_1/image'
        }]
      }
    });

    expect(post.comparisonSnapshot?.slots).toHaveLength(1);
  });

  it('preserves feed category facets for discovery filtering', () => {
    const page = communityFeedPageSchema.parse({
      items: [],
      ranking: {
        sort: 'latest',
        period: 'week',
        officialTag: null,
        windowStart: '2026-07-01T00:00:00.000Z',
        windowEnd: '2026-07-29T00:00:00.000Z',
        algorithmVersion: 'test',
        calculatedAt: '2026-07-29T00:00:00.000Z'
      },
      facets: {
        postTypes: { all: 2, image: 1, template: 1, comparison: 0, collection: 0 },
        officialTags: [{ id: 'content_type.fashion', count: 2 }]
      },
      nextCursor: null,
      hasMore: false
    });

    expect(page.facets?.officialTags).toEqual([
      { id: 'content_type.fashion', count: 2 }
    ]);
  });
});
