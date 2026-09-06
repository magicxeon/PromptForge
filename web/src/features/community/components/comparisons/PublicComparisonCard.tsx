import { Clock3, Eye, Images, Maximize2, RectangleHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routeBuilders } from '../../../../app/routeRegistry/routes';
import { CreatorIdentity } from '../../../../components/community/CreatorIdentity';
import { DiscoveryMetricRow } from '../../../../components/discovery/DiscoveryMetricRow';
import { apiMediaUrl } from '../../../../lib/api/apiClient';
import { createReturnNavigationState } from '../../../../lib/navigation/returnNavigation';
import type { CommunityPost } from '../../schemas/communitySchemas';

type PublicComparisonSlot = NonNullable<CommunityPost['comparisonSnapshot']>['slots'][number];

export function PublicComparisonCard({ post }: { post: CommunityPost }) {
  const { t } = useTranslation('community');
  const location = useLocation();
  const slots = post.comparisonSnapshot?.slots || [];
  const detailHref = routeBuilders.post(post.id);
  const size = post.generationMetadata.width && post.generationMetadata.height
    ? `${post.generationMetadata.width} x ${post.generationMetadata.height}`
    : post.generationMetadata.resolution;

  return (
    <article className="public-comparison-card">
      <div className="public-comparison-card__slots" data-slot-count={Math.min(slots.length, 4)}>
        {slots.slice(0, 4).map((slot, index) => (
          <PublicComparisonSlotPreview key={slot.slotId} slot={slot} index={index} />
        ))}
        {!slots.length ? (
          <div className="public-comparison-card__empty">
            <Images aria-hidden="true" />
            {t('community.comparisons.noResults')}
          </div>
        ) : null}
      </div>
      <div className="public-comparison-card__body">
        <div className="public-comparison-card__title-row">
          <div>
            <span>{t('community.comparisons.publicLabel')}</span>
            <h3>{post.title || t('community.creator.untitled')}</h3>
          </div>
          <span className="public-comparison-card__count">
            {t('community.comparisons.resultCount', { count: slots.length })}
          </span>
        </div>
        {post.promptPreview ? <p className="public-comparison-card__prompt">{post.promptPreview}</p> : null}
        <CreatorIdentity creator={post.creator} compact />
        <DiscoveryMetricRow metrics={[
          { id: 'ratio', icon: <RectangleHorizontal />, label: t('community.detail.aspectRatio'), value: post.generationMetadata.aspectRatio },
          { id: 'size', icon: <Maximize2 />, label: t('community.detail.imageSize'), value: size },
          { id: 'views', icon: <Eye />, label: t('community.home.works'), value: post.engagementSummary.viewCount || null }
        ]} />
      </div>
      <footer className="public-comparison-card__footer">
        {post.createdAt ? <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time> : <span />}
        <Link to={detailHref} state={createReturnNavigationState(location)}>
          {t('community.comparisons.open')}
        </Link>
      </footer>
    </article>
  );
}

function PublicComparisonSlotPreview({
  slot,
  index
}: {
  slot: PublicComparisonSlot;
  index: number;
}) {
  const { t } = useTranslation('community');
  const [mediaFailed, setMediaFailed] = useState(false);
  const source = slot.thumbnailUrl || slot.imageUrl || slot.posterUrl;
  const failed = slot.status !== 'completed' || !source || mediaFailed;
  return (
    <figure className="public-comparison-slot">
      <div>
        {!failed ? (
          <img src={apiMediaUrl(source) || ''} alt="" loading="lazy" onError={() => setMediaFailed(true)} />
        ) : (
          <span className="public-comparison-slot__missing">
            <Images aria-hidden="true" />
            {t(slot.status === 'failed'
              ? 'community.comparisons.failedResult'
              : 'community.comparisons.missingResult')}
          </span>
        )}
        <span className="public-comparison-slot__index">{index + 1}</span>
      </div>
      <figcaption>
        <strong>{slot.modelDisplayName || t('community.detail.metadataUnavailable')}</strong>
        <span>{slot.providerDisplayName || t('community.detail.metadataUnavailable')}</span>
        {formatDuration(slot.generationDuration) ? (
          <small><Clock3 aria-hidden="true" />{formatDuration(slot.generationDuration)}</small>
        ) : null}
      </figcaption>
    </figure>
  );
}

function formatDuration(value?: string | number | null) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? `${duration.toFixed(1)}s` : null;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}
