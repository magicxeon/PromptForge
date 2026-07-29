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
});
