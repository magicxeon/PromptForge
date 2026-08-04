import { Images } from 'lucide-react';
import { apiMediaUrl } from '../../lib/api/apiClient';
import { cn } from '../../lib/utils/cn';
import type { CommunityPost } from '../../features/community/schemas/communitySchemas';
import {
  ComparisonThumbnailGrid,
  comparisonThumbnailProfileId
} from '../comparisons/ComparisonThumbnailGrid';

export function MediaStage({
  post,
  className,
  eager = false,
  fit = 'contain',
  presentation = 'templateCard',
  source = 'preview'
}: {
  post: CommunityPost;
  className?: string;
  eager?: boolean;
  fit?: 'contain' | 'cover';
  presentation?: 'templateCard' | 'profileTemplateSquare';
  source?: 'preview' | 'original';
}) {
  if (post.postType === 'comparison') {
    const slots = post.comparisonSnapshot?.slots
      .filter(slot =>
        slot.status === 'completed'
        && Boolean(slot.thumbnailUrl || slot.imageUrl)
      )
      .slice(0, 4) || [];
    const profileId = comparisonThumbnailProfileId(slots.length);
    return (
      <ComparisonThumbnailGrid
        className={className}
        eager={eager}
        items={slots.map(slot => ({
          id: slot.slotId,
          imageUrl: slot.imageUrl,
          thumbnailUrl: slot.thumbnailUrl,
          presentationUrl:
            `/api/community/posts/${encodeURIComponent(post.id)}`
            + `/comparison-slots/${encodeURIComponent(slot.slotId)}`
            + `/presentations/${profileId}`
        }))}
      />
    );
  }

  const images = getPostImages(post, source);

  if (!images.length) {
    return (
      <div className={cn('grid min-h-64 place-items-center bg-black text-[var(--mpf-text-muted)]', className)}>
        <Images className="size-8" aria-hidden="true" />
      </div>
    );
  }

  if (post.postType === 'collection') {
    return (
      <div className={cn('grid aspect-[4/3] grid-cols-2 gap-1 overflow-hidden bg-black', className)}>
        {images.slice(0, 4).map((image, index) => (
          <img
            key={`${image}-${index}`}
            src={apiMediaUrl(image) || ''}
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            className="h-full min-h-0 w-full object-cover object-top"
          />
        ))}
      </div>
    );
  }

  const fallbackUrl = apiMediaUrl(images[0]) || '';
  const attentionUrl = fit === 'cover'
    ? apiMediaUrl(post.presentationUrls[presentation]) || fallbackUrl
    : fallbackUrl;
  return (
    <div className={cn('grid aspect-[4/3] place-items-center overflow-hidden bg-black', className)}>
      <img
        src={attentionUrl}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        className={cn('h-full w-full', fit === 'cover' ? 'object-cover object-top' : 'object-contain')}
        data-fallback-src={fallbackUrl}
        onError={event => {
          const fallback = event.currentTarget.dataset.fallbackSrc;
          if (fallback && event.currentTarget.dataset.fallbackApplied !== 'true') {
            event.currentTarget.dataset.fallbackApplied = 'true';
            event.currentTarget.src = fallback;
          }
        }}
      />
    </div>
  );
}

function getPostImages(post: CommunityPost, source: 'preview' | 'original') {
  if (post.postType === 'collection') {
    return post.collectionSnapshot?.items
      .map(item => selectMediaSource(item, source))
      .filter((image): image is string => Boolean(image)) || [];
  }
  return [selectMediaSource(post, source)].filter((image): image is string => Boolean(image));
}

function selectMediaSource(
  media: { imageUrl?: string | null; thumbnailUrl?: string | null },
  source: 'preview' | 'original'
) {
  return source === 'original'
    ? media.imageUrl || media.thumbnailUrl || null
    : media.thumbnailUrl || media.imageUrl || null;
}
