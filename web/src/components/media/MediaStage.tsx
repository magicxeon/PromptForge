import { Images } from 'lucide-react';
import { apiMediaUrl } from '../../lib/api/apiClient';
import { cn } from '../../lib/utils/cn';
import type { CommunityPost } from '../../features/community/schemas/communitySchemas';

export function MediaStage({
  post,
  className,
  eager = false,
  fit = 'contain'
}: {
  post: CommunityPost;
  className?: string;
  eager?: boolean;
  fit?: 'contain' | 'cover';
}) {
  const images = getPostImages(post);

  if (!images.length) {
    return (
      <div className={cn('grid min-h-64 place-items-center bg-black text-[var(--mpf-text-muted)]', className)}>
        <Images className="size-8" aria-hidden="true" />
      </div>
    );
  }

  if (post.postType === 'comparison' || post.postType === 'collection') {
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

  return (
    <div className={cn('grid aspect-[4/3] place-items-center overflow-hidden bg-black', className)}>
      <img
        src={apiMediaUrl(images[0]) || ''}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        className={cn('h-full w-full', fit === 'cover' ? 'object-cover object-top' : 'object-contain')}
      />
    </div>
  );
}

function getPostImages(post: CommunityPost) {
  if (post.postType === 'comparison') {
    return post.comparisonSnapshot?.slots
      .filter(slot => slot.status === 'completed')
      .map(slot => slot.thumbnailUrl || slot.imageUrl)
      .filter(Boolean) || [];
  }
  if (post.postType === 'collection') {
    return post.collectionSnapshot?.items
      .map(item => item.thumbnailUrl || item.imageUrl)
      .filter((image): image is string => Boolean(image)) || [];
  }
  return [post.thumbnailUrl || post.imageUrl].filter((image): image is string => Boolean(image));
}
