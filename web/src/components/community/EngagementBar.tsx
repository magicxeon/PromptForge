import { Bookmark, Heart, Share2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getCommunityEngagement, setCommunityReaction } from '../../features/community/api/communityApi';
import type { CommunityPost } from '../../features/community/schemas/communitySchemas';
import { queryKeys } from '../../lib/api/queryKeys';
import { useActor } from '../../lib/auth/ActorProvider';
import { Button } from '../ui/Button';

export function EngagementBar({ post }: { post: CommunityPost }) {
  const { t } = useTranslation('community');
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const actorId = actor?.userId || 'loading';
  const engagement = useQuery({
    queryKey: queryKeys.engagement(post.id, actorId),
    queryFn: () => getCommunityEngagement(post.id),
    enabled: Boolean(actor)
  });
  const reaction = useMutation({
    mutationFn: ({ type, active }: { type: 'like' | 'save'; active: boolean }) =>
      setCommunityReaction(post.id, type, active),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.engagement(post.id, actorId) });
      void queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    }
  });
  const state = engagement.data?.viewerState;
  const summary = engagement.data?.summary || post.engagementSummary;

  return (
    <div className="flex flex-wrap items-center gap-2 border-y border-[var(--mpf-border)] py-3">
      <Button
        variant={state?.liked ? 'primary' : 'secondary'}
        size="sm"
        icon={<Heart className="size-4" fill={state?.liked ? 'currentColor' : 'none'} />}
        disabled={reaction.isPending}
        onClick={() => reaction.mutate({ type: 'like', active: !state?.liked })}
      >
        {t('community.detail.like')} {summary.likeCount}
      </Button>
      <Button
        variant={state?.saved ? 'primary' : 'secondary'}
        size="sm"
        icon={<Bookmark className="size-4" fill={state?.saved ? 'currentColor' : 'none'} />}
        disabled={reaction.isPending}
        onClick={() => reaction.mutate({ type: 'save', active: !state?.saved })}
      >
        {t('community.detail.save')} {summary.saveCount}
      </Button>
      <Button
        size="sm"
        icon={<Share2 className="size-4" />}
        onClick={() => void navigator.clipboard.writeText(window.location.href)}
      >
        {t('community.detail.share')}
      </Button>
    </div>
  );
}
