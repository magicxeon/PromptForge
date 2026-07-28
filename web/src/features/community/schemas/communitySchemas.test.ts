import { describe, expect, it } from 'vitest';
import { communityPostSchema } from './communitySchemas';

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
});
