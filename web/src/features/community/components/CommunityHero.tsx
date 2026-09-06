import { ArrowDown, FlaskConical, LayoutTemplate } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { routePaths } from '../../../app/routeRegistry/routes';
import { DiscoveryPageHero } from '../../../components/discovery/DiscoveryPageHero';
import { MediaStage } from '../../../components/media/MediaStage';
import type { CommunityPost } from '../schemas/communitySchemas';
import { communityHeroAssets } from '../config/discoveryEditorialConfig';
import { isEligibleCommunityHeroPost } from './communityHeroSelector';

export function CommunityHero({ post }: { post: CommunityPost | null }) {
  const { t } = useTranslation('community');
  const visiblePost = post && isEligibleCommunityHeroPost(post) && post.postType !== 'video' ? post : null;

  return (
    <div className="community-hero-wrap">
    <DiscoveryPageHero
      className="community-hero"
      eyebrow={t('community.home.eyebrow')}
      title="Momelo"
      description={t('community.home.description')}
      media={(
        <div className="community-hero-art">
          <img className="community-hero-art__backdrop" src={communityHeroAssets.backdrop} alt="" />
          <figure className="community-hero-art__card community-hero-art__card--portrait">
            <img src={communityHeroAssets.portrait} alt={t('community.home.hero.portraitAlt')} />
            <figcaption>{t('community.home.hero.characters')}</figcaption>
          </figure>
          <figure className="community-hero-art__card community-hero-art__card--scene">
            <img src={communityHeroAssets.scene} alt={t('community.home.hero.sceneAlt')} />
            <figcaption>{t('community.home.hero.scenes')}</figcaption>
          </figure>
          <figure className="community-hero-art__card community-hero-art__card--work">
            {visiblePost ? <MediaStage post={visiblePost} eager fit="cover" /> : (
              <img src={communityHeroAssets.backdrop} alt={t('community.home.hero.styleAlt')} />
            )}
            <figcaption>{visiblePost ? t('community.home.hero.community') : t('community.home.hero.styles')}</figcaption>
          </figure>
        </div>
      )}
      mediaLabel={visiblePost?.title || t('community.home.featuredMedia')}
      actions={[
        {
          label: t('community.home.openPlayground'),
          to: routePaths.createPlayground,
          icon: <FlaskConical aria-hidden="true" />,
          variant: 'primary'
        },
        {
          label: t('community.home.exploreTemplates'),
          to: routePaths.exploreTemplates,
          icon: <LayoutTemplate aria-hidden="true" />
        }
      ]}
    />
    <a className="community-hero-feed-link" href="#community-feed">
      <ArrowDown aria-hidden="true" />{t('community.home.hero.browseFeed')}
    </a>
    </div>
  );
}
