import { Eye, Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { CommunityPost } from '../../features/community/schemas/communitySchemas';
import { CreatorIdentity } from '../community/CreatorIdentity';
import { createReturnNavigationState } from '../../lib/navigation/returnNavigation';
import { MediaStage } from './MediaStage';
import { useTranslation } from 'react-i18next';
import { TemplatePricingBadge } from '../templates/TemplatePricingBadge';
import type { CSSProperties, ReactNode } from 'react';
import { routeBuilders } from '../../app/routeRegistry/routes';

export function MediaCard({
  post,
  ownerAction,
  previewFit = 'contain'
}: {
  post: CommunityPost;
  ownerAction?: ReactNode;
  previewFit?: 'contain' | 'cover';
}) {
  const { t } = useTranslation('community');
  const location = useLocation();
  const summary = post.engagementSummary;
  const retired = post.status === 'owner_unpublished';
  const setupRequired = post.status === 'draft';
  const adaptive = post.postType === 'image';
  return (
    <article
      className={`community-media-card group relative overflow-hidden rounded-[var(--mpf-radius-md)] border border-[var(--mpf-border)] bg-[var(--mpf-surface)] transition hover:-translate-y-0.5 hover:border-cyan-400/45${retired ? ' is-retired' : ''}${adaptive ? ' community-media-card--adaptive-image' : ''}`}
      style={adaptive ? { '--media-card-ratio': featuredImageRatio(post.generationMetadata) } as CSSProperties : undefined}
    >
      <Link
        to={routeBuilders.post(post.id)}
        state={createReturnNavigationState(location)}
        className="block text-inherit no-underline"
        aria-label={post.title || post.postType}
      >
        <MediaStage post={post} fit={adaptive ? 'contain' : previewFit} source={adaptive ? 'original' : 'preview'} className="community-media-card__stage" />
        {post.postType === 'video' && post.durationSeconds ? (
          <span className="absolute right-3 top-3 rounded bg-black/75 px-2 py-1 text-xs font-semibold text-white">
            {formatDuration(post.durationSeconds)}
          </span>
        ) : null}
        <div className="community-media-card__body p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="rounded-[var(--mpf-radius-sm)] border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[11px] font-semibold uppercase text-cyan-200">
              {retired
                ? t('community.status.retired')
                : setupRequired
                  ? t('community.status.setupRequired')
                  : post.postType}
            </span>
            {post.postType === 'template' && post.templatePricing
              ? <TemplatePricingBadge accessCredits={post.templatePricing.accessCredits} />
              : <span className="text-xs text-[var(--mpf-text-muted)]">#{post.ranking?.rank || '-'}</span>}
          </div>
          <h2 className="community-media-card__title m-0 line-clamp-2 text-base text-white">
            {post.title || t('community.creator.untitled')}
          </h2>
          <div className="my-3">
            <CreatorIdentity creator={post.creator} compact />
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-[var(--mpf-text-muted)]">
            <Metric icon={Heart} value={summary.likeCount} />
            <Metric icon={MessageCircle} value={summary.commentCount} />
            <Metric icon={Repeat2} value={summary.remixSuccessCount} />
            <Metric icon={Eye} value={summary.viewCount} />
          </div>
        </div>
      </Link>
      {ownerAction ? (
        <div className="border-t border-[var(--mpf-border)] p-3 [&>button]:w-full">
          {ownerAction}
        </div>
      ) : null}
    </article>
  );
}

export function featuredImageRatio(metadata: CommunityPost['generationMetadata']) {
  const { width, height, aspectRatio } = metadata;
  const match = /^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/.exec(aspectRatio?.trim() || '');
  const ratio = width && height && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? width / height : match ? Number(match[1]) / Number(match[2]) : NaN;
  return Number.isFinite(ratio) && ratio > 0 ? Math.min(2, Math.max(0.625, ratio)) : 0.75;
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
}

function Metric({
  icon: Icon,
  value
}: {
  icon: typeof Heart;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-3.5" aria-hidden="true" />
      {value}
    </span>
  );
}
