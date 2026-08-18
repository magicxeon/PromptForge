import { Play } from 'lucide-react';
import { apiMediaUrl } from '../../lib/api/apiClient';
import { cn } from '../../lib/utils/cn';

export function VideoMediaPlayer({
  videoUrl,
  posterUrl,
  title,
  className,
  controls = true,
  preload = 'metadata'
}: {
  videoUrl?: string | null;
  posterUrl?: string | null;
  title: string;
  className?: string;
  controls?: boolean;
  preload?: 'none' | 'metadata';
}) {
  if (!videoUrl) {
    return (
      <div className={cn('grid aspect-video place-items-center bg-black text-[var(--mpf-text-muted)]', className)}>
        <Play className="size-9" aria-hidden="true" />
      </div>
    );
  }

  return (
    <video
      className={cn('h-full w-full bg-black object-contain', className)}
      controls={controls}
      preload={preload}
      poster={apiMediaUrl(posterUrl) || undefined}
      aria-label={title}
      playsInline
      onPlay={event => {
        document.querySelectorAll<HTMLVideoElement>('video').forEach(player => {
          if (player !== event.currentTarget && !player.paused) player.pause();
        });
      }}
    >
      <source src={apiMediaUrl(videoUrl) || ''} />
    </video>
  );
}
