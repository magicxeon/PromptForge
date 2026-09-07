import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routeBuilders } from '../../../../app/routeRegistry/routes';
import { MediaStage } from '../../../../components/media/MediaStage';
import { CreatorIdentity } from '../../../../components/community/CreatorIdentity';
import { EngagementBar } from '../../../../components/community/EngagementBar';
import { createReturnNavigationState } from '../../../../lib/navigation/returnNavigation';
import type { CommunityPost } from '../../schemas/communitySchemas';

export function TemplateCreationCard({ post }: { post: CommunityPost }) {
  const { t } = useTranslation('community');
  const location = useLocation();
  const title = post.title || t('community.creator.untitled');
  return <article className="photo-creation-card">
    <Link to={routeBuilders.post(post.id)} state={createReturnNavigationState(location)} aria-label={title}>
      <MediaStage post={post} fit="contain" className="photo-creation-card__media" />
      <h2 title={title}>{title}</h2>
    </Link>
    <div className="photo-creation-card__byline"><CreatorIdentity creator={post.creator} compact linked /><EngagementBar post={post} variant="like-only" /></div>
  </article>;
}
