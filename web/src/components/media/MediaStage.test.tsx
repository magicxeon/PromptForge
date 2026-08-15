import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { communityPostSchema } from '../../features/community/schemas/communitySchemas';
import { MediaStage, resolveCommunityPostDetailMedia } from './MediaStage';

vi.mock('./AuthenticatedMediaImage', () => ({
  AuthenticatedMediaImage: ({
    src,
    alt,
    className,
    loading
  }: {
    src: string;
    alt?: string;
    className?: string;
    loading?: 'eager' | 'lazy';
  }) => (
    <img
      src={src}
      alt={alt || ''}
      className={className}
      loading={loading}
      data-authenticated-media="true"
    />
  )
}));

const post = communityPostSchema.parse({
  id: 'post_media_source',
  postType: 'image',
  status: 'published',
  visibility: 'public',
  creator: { displayName: 'Creator' },
  imageUrl: '/api/scene-templates/shared/post_media_source/image',
  thumbnailUrl: '/api/scene-templates/shared/post_media_source/thumbnail',
  engagementSummary: {}
});

describe('MediaStage media source', () => {
  it('keeps Template detail face-focused without changing ordinary Image detail', () => {
    expect(resolveCommunityPostDetailMedia({ postType: 'template' })).toEqual({
      fit: 'cover',
      presentation: 'templateDetail',
      source: 'original'
    });
    expect(resolveCommunityPostDetailMedia({ postType: 'image' })).toEqual({
      fit: 'contain',
      presentation: 'templateCard',
      source: 'original'
    });
  });

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

  it('uses actor-authenticated media for an owner-only Template draft', () => {
    const draft = communityPostSchema.parse({
      ...post,
      postType: 'template',
      status: 'draft',
      visibility: 'private'
    });
    const { container } = render(<MediaStage post={draft} fit="cover" />);

    expect(container.querySelector('img')).toHaveAttribute('data-authenticated-media', 'true');
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/api/scene-templates/shared/post_media_source/thumbnail'
    );
  });

  it('uses the server person-focused presentation for cover previews', () => {
    const focusedPost = communityPostSchema.parse({
      ...post,
      presentationUrls: {
        templateCard: '/api/scene-templates/shared/post_media_source/presentations/template-card-person-focus-v2'
      }
    });
    const { container } = render(<MediaStage post={focusedPost} fit="cover" />);

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/api/scene-templates/shared/post_media_source/presentations/template-card-person-focus-v2'
    );
    expect(container.querySelector('img')).toHaveAttribute(
      'data-fallback-src',
      '/api/scene-templates/shared/post_media_source/thumbnail'
    );
  });

  it('uses the dedicated portrait person presentation for Template detail', () => {
    const focusedPost = communityPostSchema.parse({
      ...post,
      postType: 'template',
      presentationUrls: {
        templateDetail: '/api/scene-templates/shared/post_media_source/presentations/template-detail-person-focus-v1'
      }
    });
    const { container } = render(
      <MediaStage
        post={focusedPost}
        fit="cover"
        presentation="templateDetail"
        source="original"
      />
    );

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/api/scene-templates/shared/post_media_source/presentations/template-detail-person-focus-v1'
    );
    expect(container.querySelector('img')).toHaveAttribute(
      'data-fallback-src',
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
