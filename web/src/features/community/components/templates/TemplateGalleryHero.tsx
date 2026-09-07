import { Search, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routeBuilders, routePaths } from '../../../../app/routeRegistry/routes';
import { DiscoveryPageHero } from '../../../../components/discovery/DiscoveryPageHero';
import { MediaStage } from '../../../../components/media/MediaStage';
import { createReturnNavigationState } from '../../../../lib/navigation/returnNavigation';
import type { TemplateHeroSelection } from './templateHeroSelection';

export function TemplateGalleryHero({ selection }: { selection: TemplateHeroSelection | null }) {
  const { t } = useTranslation('community');
  const location = useLocation();
  return (
    <DiscoveryPageHero
      className={selection ? 'template-gallery-hero--illustrated' : undefined}
      eyebrow={t('community.templates.eyebrow')}
      title={t('community.templates.title')}
      description={t('community.templates.description')}
      media={selection ? (
        <div className="template-hero__art">
          <div className="template-hero__images" aria-hidden="true">
            {[...selection.creations].reverse().map((post, index) => (
              <MediaStage key={post.id} post={post} eager fit="cover" source="original"
                className={`template-hero__image${index < 2 ? ' template-hero__image--secondary' : ''}`} />
            ))}
            <MediaStage post={selection.original} eager fit="cover" source="original"
              className="template-hero__image template-hero__image--original" />
          </div>
          <Link className="template-hero__original-link"
            title={selection.original.title || t('community.creator.untitled')}
            to={routeBuilders.templateDetail(selection.original.id)}
            state={createReturnNavigationState(location)}>
            <span>{t('community.templateDetail.original')}</span>
            <strong>{selection.original.title || t('community.creator.untitled')}</strong>
          </Link>
        </div>
      ) : undefined}
      mediaLabel={selection?.original.title || undefined}
      actions={[
        { label: t('community.templates.create'), to: routePaths.createStudioScene, icon: <Sparkles />, variant: 'primary' },
        { label: t('community.templates.browse'), to: `${routePaths.exploreTemplates}#template-catalog`, icon: <Search /> }
      ]}
    />
  );
}
