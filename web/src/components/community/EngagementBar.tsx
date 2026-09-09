import { Bookmark, Eye, Heart, RefreshCw, Share2 } from 'lucide-react';
import { ProcessingSpinner } from '../ui/ProcessingSpinner';
import { useTranslation } from 'react-i18next';
import { useCommunityEngagement } from '../../features/community/hooks/useCommunityEngagement';
import type { CommunityPost } from '../../features/community/schemas/communitySchemas';
import { useActor } from '../../lib/auth/ActorProvider';
import { Button } from '../ui/Button';

type Props = { post: CommunityPost; variant?: 'detail' | 'compact' | 'like-only' };

export function EngagementBar(props: Props) {
  const { actor } = useActor();
  return <PostEngagement key={`${actor?.userId || 'loading'}:${props.post.id}`} {...props} />;
}

function PostEngagement({ post, variant = 'detail' }: Props) {
  const { t } = useTranslation('community');
  const engagement = useCommunityEngagement(post);
  const state = engagement.viewerState;
  const summary = engagement.summary;
  const compact = variant !== 'detail';
  const likeOnly = variant === 'like-only';
  const likeLabel = t(state?.liked ? 'community.engagement.unlike' : 'community.detail.like');

  return (
    <div className={compact ? 'engagement-bar engagement-bar--compact' : 'engagement-bar flex flex-wrap items-center gap-2 border-y border-[var(--mpf-border)] py-3'}>
      <Button
        type="button"
        className={compact ? 'engagement-bar__like' : undefined}
        variant={state?.liked ? 'primary' : 'secondary'}
        size="sm"
        aria-pressed={state?.liked === true}
        aria-label={compact ? `${likeLabel}: ${summary.likeCount}${likeOnly ? `, ${post.title}` : ''}` : undefined}
        aria-busy={engagement.isPending || engagement.isLoading}
        title={engagement.hasActor ? likeLabel : t('community.engagement.signIn')}
        icon={engagement.isPending || engagement.isLoading ? <ProcessingSpinner className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Heart className="size-4" fill={state?.liked ? 'currentColor' : 'none'} aria-hidden="true" />}
        disabled={!engagement.canReact}
        onClick={() => engagement.toggle('like')}
      >
        {compact ? (likeOnly && !summary.likeCount ? null : summary.likeCount) : `${t('community.detail.like')} ${summary.likeCount}`}
      </Button>
      {likeOnly ? null : compact ? <span className="engagement-bar__views" title={t('community.engagement.views')}>
        <Eye aria-hidden="true" /><span className="sr-only">{t('community.engagement.views')} </span>{summary.viewCount}
      </span> : <>
      <Button
        type="button"
        variant={state?.saved ? 'primary' : 'secondary'}
        size="sm"
        aria-pressed={state?.saved === true}
        icon={<Bookmark className="size-4" fill={state?.saved ? 'currentColor' : 'none'} aria-hidden="true" />}
        disabled={!engagement.canReact}
        onClick={() => engagement.toggle('save')}
      >
        {t('community.detail.save')} {summary.saveCount}
      </Button>
      <Button
        type="button"
        size="sm"
        icon={<Share2 className="size-4" />}
        onClick={() => void navigator.clipboard.writeText(window.location.href)}
      >
        {t('community.detail.share')}
      </Button>
      </>}
      {engagement.loadFailed ? <div className="engagement-bar__error" role="status">
        <span>{t('community.engagement.unavailable')}</span>
        <Button type="button" size="icon" variant="ghost" title={t('community.feed.retry')} aria-label={t('community.feed.retry')}
          icon={<RefreshCw className="size-4" aria-hidden="true" />} onClick={engagement.retryRead} />
      </div> : engagement.actionFailed ? <p className="engagement-bar__error" role="alert">{t('community.engagement.actionFailed')}</p> : null}
    </div>
  );
}
