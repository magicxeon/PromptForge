import { Grid3X3, Images, Sparkles, UsersRound } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MediaStage } from '../../../components/media/MediaStage';
import { createReturnNavigationState } from '../../../lib/navigation/returnNavigation';
import type { CommunityPost } from '../schemas/communitySchemas';

export function CommunityHero({ posts }: { posts: CommunityPost[] }) {
  const { t } = useTranslation('community');
  const location = useLocation();
  const visualPosts = posts.filter(hasVisualMedia).slice(0, 4);
  const templateCount = posts.filter(post => post.postType === 'template').length;
  const creatorCount = new Set(
    posts.map(post => post.creator.handle || post.creator.username || post.creator.displayName)
  ).size;

  return (
    <section className="community-hero" aria-labelledby="community-hero-title">
      <div className="community-hero__copy">
        <span className="community-hero__eyebrow">{t('community.home.eyebrow')}</span>
        <h1 id="community-hero-title">{t('community.home.title')}</h1>
        <p>{t('community.home.description')}</p>
        <div className="community-hero__actions">
          <Link className="community-hero__primary" to="/studio">
            <Sparkles aria-hidden="true" />
            {t('community.home.create')}
          </Link>
          <Link className="community-hero__secondary" to="/community?type=template">
            <Grid3X3 aria-hidden="true" />
            {t('community.home.exploreTemplates')}
          </Link>
        </div>
        <dl className="community-hero__stats">
          <div>
            <dt><Images aria-hidden="true" />{t('community.home.works')}</dt>
            <dd>{posts.length}</dd>
          </div>
          <div>
            <dt><Grid3X3 aria-hidden="true" />{t('community.home.templates')}</dt>
            <dd>{templateCount}</dd>
          </div>
          <div>
            <dt><UsersRound aria-hidden="true" />{t('community.home.creators')}</dt>
            <dd>{creatorCount}</dd>
          </div>
        </dl>
      </div>
      {visualPosts.length ? (
        <div className={`community-hero__collage community-hero__collage--${visualPosts.length}`}>
          {visualPosts.map(post => (
            <Link
              key={post.id}
              to={`/community/${encodeURIComponent(post.id)}`}
              state={createReturnNavigationState(location)}
              aria-label={post.title || post.postType}
            >
              <MediaStage post={post} eager fit="cover" />
              <span>{formatHeroLabel(post.officialTags[0] || post.postType)}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function hasVisualMedia(post: CommunityPost) {
  if (post.imageUrl || post.thumbnailUrl) return true;
  if (post.comparisonSnapshot?.slots.some(slot => slot.imageUrl || slot.thumbnailUrl)) return true;
  return Boolean(post.collectionSnapshot?.items.some(item => item.imageUrl || item.thumbnailUrl));
}

function formatHeroLabel(value: string) {
  const readable = value
    .replace(/^content_type[.:_-]*/i, '')
    .replace(/[._-]+/g, ' ')
    .trim();
  return readable || 'Community';
}
