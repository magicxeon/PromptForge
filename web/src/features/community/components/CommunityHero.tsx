import { FlaskConical, LayoutTemplate } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { routePaths } from '../../../app/routeRegistry/routes';
import { DiscoveryPageHero } from '../../../components/discovery/DiscoveryPageHero';
import { MediaStage } from '../../../components/media/MediaStage';
import type { CommunityPost } from '../schemas/communitySchemas';

export function CommunityHero({ post }: { post: CommunityPost | null }) {
  const { t } = useTranslation('community');

  return (
    <DiscoveryPageHero
      className="community-hero"
      eyebrow={t('community.home.eyebrow')}
      title={t('community.home.title')}
      description={t('community.home.description')}
      media={post ? <MediaStage post={post} eager fit="cover" source="original" /> : undefined}
      mediaLabel={post?.title || t('community.home.featuredMedia')}
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
  );
}
