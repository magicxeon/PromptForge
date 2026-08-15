import { Eye, Heart, Sparkles, UsersRound, Vote } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { routeBuilders } from '../../app/routeRegistry/routes';
import type { CommunityPost } from '../../features/community/schemas/communitySchemas';
import type { CreatorPage } from '../../features/profiles/schemas/profileSchemas';
import { apiMediaUrl } from '../../lib/api/apiClient';
import { createReturnNavigationState } from '../../lib/navigation/returnNavigation';
import { ComparisonThumbnailGrid } from '../comparisons/ComparisonThumbnailGrid';
import { MediaStage } from '../media/MediaStage';

export function ProfileFeaturedWork({
  post,
  viewLabel
}: {
  post: CommunityPost;
  viewLabel: string;
}) {
  const location = useLocation();
  return (
    <article className="profile-featured-work">
      <MediaStage post={post} fit="cover" eager className="profile-featured-work__media" />
      <div className="profile-featured-work__scrim" aria-hidden="true" />
      <div className="profile-featured-work__content">
        <div>
          <h3>{post.title}</h3>
          <p><Heart aria-hidden="true" />{formatCompact(post.engagementSummary.likeCount)} <Eye aria-hidden="true" />{formatCompact(post.engagementSummary.viewCount)}</p>
        </div>
        <Link
          to={routeBuilders.post(post.id)}
          state={createReturnNavigationState(location)}
        >
          {viewLabel}
        </Link>
      </div>
    </article>
  );
}

export function CreatorHighlights({
  page,
  labels
}: {
  page: CreatorPage;
  labels: { likes: string; uses: string; votes: string; followers: string };
}) {
  const statistics = page.statistics;
  const metrics = [
    { key: 'likes', icon: Heart, value: Number(statistics.likes) || 0, label: labels.likes },
    { key: 'uses', icon: Sparkles, value: Number(statistics.uses) || 0, label: labels.uses },
    { key: 'votes', icon: Vote, value: Number(statistics.votes) || 0, label: labels.votes },
    { key: 'followers', icon: UsersRound, value: page.counts.followers || 0, label: labels.followers }
  ];
  return (
    <dl className="creator-highlight-grid">
      {metrics.map(metric => {
        const Icon = metric.icon;
        return (
          <div key={metric.key}>
            <Icon aria-hidden="true" />
            <dt>{metric.label}</dt>
            <dd>{formatCompact(metric.value)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function ProfileComparisonCard({
  post,
  viewLabel
}: {
  post: CommunityPost;
  viewLabel: string;
}) {
  const location = useLocation();
  const slots = post.comparisonSnapshot?.slots || [];
  return (
    <article className="profile-comparison-card">
      <ComparisonThumbnailGrid items={slots.map(slot => ({
        id: slot.slotId,
        imageUrl: slot.imageUrl,
        thumbnailUrl: slot.thumbnailUrl
      }))} />
      <div className="profile-comparison-card__content">
        <div>
          <h3>{post.title}</h3>
          <p>{post.description}</p>
        </div>
        <Link
          to={routeBuilders.post(post.id)}
          state={createReturnNavigationState(location)}
        >
          {viewLabel}
        </Link>
      </div>
    </article>
  );
}

export function ProfileCollectionMosaic({
  post,
  itemLabel
}: {
  post: CommunityPost;
  itemLabel: string;
}) {
  const location = useLocation();
  const items = post.collectionSnapshot?.items || [];
  const previewItems = items.length ? items.slice(0, 4) : [{
    itemId: post.id,
    imageUrl: post.imageUrl,
    thumbnailUrl: post.thumbnailUrl
  }];
  return (
    <Link
      to={routeBuilders.post(post.id)}
      state={createReturnNavigationState(location)}
      className="profile-collection-mosaic"
    >
      <div className="profile-collection-mosaic__images" data-count={previewItems.length}>
        {previewItems.map(item => (
          <img
            key={item.itemId}
            src={apiMediaUrl(item.thumbnailUrl || item.imageUrl) || ''}
            alt=""
            loading="lazy"
          />
        ))}
      </div>
      <div>
        <h3>{post.title}</h3>
        <p>{post.description}</p>
        <span>{post.collectionSnapshot?.itemCount || previewItems.length} {itemLabel}</span>
      </div>
    </Link>
  );
}

function formatCompact(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}
