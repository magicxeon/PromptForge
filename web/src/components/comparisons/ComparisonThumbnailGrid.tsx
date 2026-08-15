import { Columns3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiMediaUrl } from '../../lib/api/apiClient';
import { cn } from '../../lib/utils/cn';

export type ComparisonThumbnailItem = {
  id: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  presentationUrl?: string | null;
};

export function ComparisonThumbnailGrid({
  items,
  className,
  eager = false
}: {
  items: ComparisonThumbnailItem[];
  className?: string;
  eager?: boolean;
}) {
  const visibleItems = items
    .filter(item => item.presentationUrl || item.thumbnailUrl || item.imageUrl)
    .slice(0, 4);
  const count = visibleItems.length;

  if (!count) {
    return (
      <div
        className={cn(
          'comparison-thumbnail-grid comparison-thumbnail-grid--empty',
          className
        )}
      >
        <Columns3 className="size-8 text-[var(--mpf-text-muted)]" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className={cn('comparison-thumbnail-grid', className)}
      data-image-count={count}
    >
      {visibleItems.map(item => (
        <ComparisonThumbnail
          key={item.id}
          item={item}
          eager={eager}
        />
      ))}
    </div>
  );
}

export function comparisonThumbnailProfileId(count: number) {
  const normalizedCount = Math.min(4, Math.max(1, Math.trunc(count) || 1));
  return `comparison-card-${normalizedCount}-person-focus`;
}

function ComparisonThumbnail({
  item,
  eager
}: {
  item: ComparisonThumbnailItem;
  eager: boolean;
}) {
  const presentationSource = apiMediaUrl(item.presentationUrl);
  const fallbackSource = apiMediaUrl(item.thumbnailUrl || item.imageUrl);
  const [useFallback, setUseFallback] = useState(false);
  const source = useFallback
    ? fallbackSource
    : presentationSource || fallbackSource;

  useEffect(() => {
    setUseFallback(false);
  }, [presentationSource, fallbackSource]);

  return (
    <img
      src={source || ''}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      onError={() => {
        if (!useFallback && presentationSource && fallbackSource !== presentationSource) {
          setUseFallback(true);
        }
      }}
    />
  );
}
