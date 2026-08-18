import { Images } from 'lucide-react';
import { apiMediaUrl } from '../../lib/api/apiClient';
import { cn } from '../../lib/utils/cn';
import type { CommunityPost } from '../../features/community/schemas/communitySchemas';
import {
  ComparisonThumbnailGrid,
  comparisonThumbnailProfileId
} from '../comparisons/ComparisonThumbnailGrid';
import { AuthenticatedMediaImage } from './AuthenticatedMediaImage';
import { VideoMediaPlayer } from './VideoMediaPlayer';

export function resolveCommunityPostDetailMedia(post: Pick<CommunityPost, 'postType'>) {
  return post.postType === 'template'
    ? {
        fit: 'cover' as const,
        presentation: 'templateDetail' as const,
        source: 'original' as const
      }
    : {
        fit: 'contain' as const,
        presentation: 'templateCard' as const,
        source: 'original' as const
      };
}

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
  presentation?: 'templateCard' | 'templateDetail' | 'profileTemplateSquare';
  source?: 'preview' | 'original';
}) {
  if (post.postType === 'video') {
    return (
      <VideoMediaPlayer
        className={cn('aspect-video', className)}
        videoUrl={post.videoUrl}
        posterUrl={post.posterUrl || post.thumbnailUrl}
        title={post.title}
        controls={eager}
        preload="metadata"
      />
    );
  }

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

  const fallbackPath = images[0];
  const attentionPath = fit === 'cover'
    ? post.presentationUrls[presentation] || fallbackPath
    : fallbackPath;
  const imageClassName = cn(
    'h-full w-full',
    fit === 'cover' ? 'object-cover object-top' : 'object-contain'
  );
  return (
    <div className={cn('grid aspect-[4/3] place-items-center overflow-hidden bg-black', className)}>
      {requiresAuthenticatedMedia(post) ? (
        <AuthenticatedMediaImage
          src={attentionPath}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          className={imageClassName}
          fallback={attentionPath !== fallbackPath ? (
            <AuthenticatedMediaImage
              src={fallbackPath}
              alt=""
              loading={eager ? 'eager' : 'lazy'}
              className={imageClassName}
              fallback={<Images className="size-8 text-[var(--mpf-text-muted)]" aria-hidden="true" />}
            />
          ) : <Images className="size-8 text-[var(--mpf-text-muted)]" aria-hidden="true" />}
        />
      ) : (
        <img
          src={apiMediaUrl(attentionPath) || ''}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          className={imageClassName}
          data-fallback-src={apiMediaUrl(fallbackPath) || ''}
          onError={event => {
            const fallback = event.currentTarget.dataset.fallbackSrc;
            if (fallback && event.currentTarget.dataset.fallbackApplied !== 'true') {
              event.currentTarget.dataset.fallbackApplied = 'true';
              event.currentTarget.src = fallback;
            }
          }}
        />
      )}
    </div>
  );
}

function requiresAuthenticatedMedia(post: CommunityPost) {
  return post.visibility === 'private'
    || !['active', 'published', 'reported'].includes(post.status || '');
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
