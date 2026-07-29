import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { communityPostSchema } from '../../features/community/schemas/communitySchemas';
import { MediaStage } from './MediaStage';

const post = communityPostSchema.parse({
  id: 'post_media_source',
  postType: 'image',
  creator: { displayName: 'Creator' },
  imageUrl: '/api/scene-templates/shared/post_media_source/image',
  thumbnailUrl: '/api/scene-templates/shared/post_media_source/thumbnail',
  engagementSummary: {}
});

describe('MediaStage media source', () => {
  it('uses the preview by default for discovery surfaces', () => {
    const { container } = render(<MediaStage post={post} />);

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/api/scene-templates/shared/post_media_source/thumbnail'
    );
  });

  it('uses the original image for detail and fullscreen surfaces', () => {
    const { container } = render(<MediaStage post={post} source="original" />);

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/api/scene-templates/shared/post_media_source/image'
    );
  });

  it('uses the shared count-aware attention presentation for comparisons', () => {
    const comparison = communityPostSchema.parse({
      id: 'post_comparison',
      postType: 'comparison',
      creator: { displayName: 'Creator' },
      comparisonSnapshot: {
        slots: ['a', 'b', 'c'].map(slotId => ({
          slotId,
          imageUrl: `/api/community/posts/post_comparison/comparison-slots/${slotId}/image`,
          thumbnailUrl: `/api/community/posts/post_comparison/comparison-slots/${slotId}/image`,
          status: 'completed'
        }))
      },
      engagementSummary: {}
    });
    const { container } = render(<MediaStage post={comparison} />);

    expect(container.firstElementChild).toHaveAttribute('data-image-count', '3');
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/api/community/posts/post_comparison/comparison-slots/a/presentations/comparison-card-3-person-focus'
    );
  });
});
