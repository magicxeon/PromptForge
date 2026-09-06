import { Clock3, Cpu, Maximize2, RectangleHorizontal } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routeBuilders } from '../../../../app/routeRegistry/routes';
import { CreatorIdentity } from '../../../../components/community/CreatorIdentity';
import { DiscoveryMetricRow } from '../../../../components/discovery/DiscoveryMetricRow';
import { MediaStage } from '../../../../components/media/MediaStage';
import { TemplatePricingBadge } from '../../../../components/templates/TemplatePricingBadge';
import { TemplateUseButton } from '../../../../components/templates/TemplateUseButton';
import { createReturnNavigationState } from '../../../../lib/navigation/returnNavigation';
import type { CommunityPost } from '../../schemas/communitySchemas';

export function TemplateDiscoveryCard({
  post,
  using,
  onUse
}: {
  post: CommunityPost;
  using: boolean;
  onUse: () => void;
}) {
  const { t } = useTranslation('community');
  const location = useLocation();
  const detailHref = routeBuilders.post(post.id);
  const metadata = post.generationMetadata;
  const imageSize = metadata.width && metadata.height
    ? `${metadata.width} x ${metadata.height}`
    : metadata.resolution;
  const duration = formatDuration(metadata.generationDuration);

  return (
    <article className="template-discovery-card">
      <Link
        to={detailHref}
        state={createReturnNavigationState(location)}
        className="template-discovery-card__media"
        aria-label={post.title || t('community.creator.untitled')}
      >
        <MediaStage post={post} fit="cover" source="original" />
        {post.officialTags[0] ? <span>{formatTag(post.officialTags[0])}</span> : null}
      </Link>
      <div className="template-discovery-card__body">
        <div className="template-discovery-card__heading">
          <div>
            <h3>{post.title || t('community.creator.untitled')}</h3>
            <CreatorIdentity creator={post.creator} compact />
          </div>
          {post.templatePricing ? (
            <TemplatePricingBadge accessCredits={post.templatePricing.accessCredits} />
          ) : null}
        </div>
        <DiscoveryMetricRow metrics={[
          { id: 'model', icon: <Cpu />, label: t('community.detail.model'), value: post.providerModelDisplay },
          { id: 'ratio', icon: <RectangleHorizontal />, label: t('community.detail.aspectRatio'), value: metadata.aspectRatio },
          { id: 'size', icon: <Maximize2 />, label: t('community.detail.imageSize'), value: imageSize },
          { id: 'duration', icon: <Clock3 />, label: t('community.detail.generationDuration'), value: duration }
        ]} />
        {post.officialTags.length > 1 ? (
          <div className="template-discovery-card__tags">
            {post.officialTags.slice(1, 4).map(tag => <span key={tag}>{formatTag(tag)}</span>)}
          </div>
        ) : null}
      </div>
      <footer className="template-discovery-card__footer">
        <Link to={detailHref} state={createReturnNavigationState(location)}>
          {t('community.templates.viewDetails')}
        </Link>
        {post.templateAvailability ? (
          <TemplateUseButton disabled={using} onUse={onUse} />
        ) : (
          <span className="template-discovery-card__unavailable">
            {t('community.templates.unavailable')}
          </span>
        )}
      </footer>
    </article>
  );
}

function formatDuration(value?: string | number | null) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? `${duration.toFixed(1)}s` : null;
}

function formatTag(value: string) {
  return value
    .replace(/^[a-z0-9_-]+[.:/]/i, '')
    .replace(/[._/-]+/g, ' ')
    .trim();
}
