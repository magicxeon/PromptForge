import { ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { CommunityPost } from '../../features/community/schemas/communitySchemas';
import { routeBuilders } from '../../app/routeRegistry/routes';
import { createReturnNavigationState } from '../../lib/navigation/returnNavigation';
import { MediaStage } from '../media/MediaStage';

export function ProfileTemplateMosaic({
  posts,
  viewAllHref,
  viewAllLabel
}: {
  posts: CommunityPost[];
  viewAllHref: string;
  viewAllLabel: string;
}) {
  const location = useLocation();
  const visiblePosts = posts.slice(0, 4);

  return (
    <div className="profile-template-mosaic">
      {visiblePosts.map((post, index) => (
        <Link
          key={post.id}
          to={routeBuilders.post(post.id)}
          state={createReturnNavigationState(location)}
          className={`profile-template-mosaic__item profile-template-mosaic__item--${index + 1}`}
          aria-label={post.title || post.postType}
        >
          <MediaStage
            post={post}
            fit="cover"
            presentation="profileTemplateSquare"
            className="profile-template-mosaic__media"
          />
          <span>{post.title}</span>
        </Link>
      ))}
      <Link className="profile-template-mosaic__view-all" to={viewAllHref}>
        <span>{viewAllLabel}</span>
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  );
}
