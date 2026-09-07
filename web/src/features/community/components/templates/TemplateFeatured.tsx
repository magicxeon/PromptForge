import { Star } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routeBuilders } from '../../../../app/routeRegistry/routes';
import { CreatorIdentity } from '../../../../components/community/CreatorIdentity';
import { MediaStage } from '../../../../components/media/MediaStage';
import { TemplatePricingBadge } from '../../../../components/templates/TemplatePricingBadge';
import { TemplateUseButton } from '../../../../components/templates/TemplateUseButton';
import { createReturnNavigationState } from '../../../../lib/navigation/returnNavigation';
import type { CommunityPost } from '../../schemas/communitySchemas';

export function TemplateFeatured({ post, creations, using, onUse }: {
  post: CommunityPost; creations: CommunityPost[]; using: boolean; onUse: () => void;
}) {
  const { t } = useTranslation('community');
  const location = useLocation();
  const media = [post, ...creations.filter(item => item.id !== post.id).slice(0, 2)];
  return <section className="template-feature" aria-labelledby="template-feature-title">
    <div className="template-feature__copy">
      <span className="template-feature__eyebrow"><Star aria-hidden="true" />{t('community.templates.featuredEyebrow')}</span>
      <h2 id="template-feature-title">{post.title || t('community.creator.untitled')}</h2>
      {post.description ? <p>{post.description}</p> : null}
      <CreatorIdentity creator={post.creator} linked compact />
      {post.templatePricing ? <div className="template-fee"><small>{t('community.templateVisual.fee')}</small><TemplatePricingBadge accessCredits={post.templatePricing.accessCredits} /></div> : null}
      <div className="template-feature__actions">
        <Link className="template-feature__detail-link" to={routeBuilders.templateDetail(post.id)} state={createReturnNavigationState(location)}>{t('community.templates.viewDetails')}</Link>
        <TemplateUseButton disabled={!post.templateAvailability || using} onUse={onUse} />
      </div>
      {!post.templateAvailability ? <small>{t('community.templates.unavailable')}</small> : null}
    </div>
    <div className="template-feature__media" data-count={media.length}>
      {media.map((item, index) => <Link key={item.id} to={index ? routeBuilders.post(item.id) : routeBuilders.templateDetail(post.id)}
        state={createReturnNavigationState(location)} aria-label={item.title || t('community.creator.untitled')}>
        <MediaStage post={item} eager fit="cover" source="original" />
        <span>{t(index ? 'community.templateVisual.creation' : 'community.templateDetail.original')}</span>
      </Link>)}
    </div>
  </section>;
}
