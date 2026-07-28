import { UserRound } from 'lucide-react';
import type { CommunityPost } from '../../features/community/schemas/communitySchemas';

export function CreatorIdentity({
  creator,
  createdAt,
  compact = false
}: {
  creator: CommunityPost['creator'];
  createdAt?: string | null;
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
        <UserRound className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-sm text-white">{creator.displayName}</strong>
        {!compact ? (
          <small className="block truncate text-[var(--mpf-text-muted)]">
            {creator.handle ? `@${creator.handle}` : creator.username}
            {createdAt ? ` · ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(createdAt))}` : ''}
          </small>
        ) : null}
      </span>
    </div>
  );
}
