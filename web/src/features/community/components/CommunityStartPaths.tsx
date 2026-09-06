import {
  Columns3,
  FlaskConical,
  LayoutTemplate,
  UsersRound,
  type LucideIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routePaths } from '../../../app/routeRegistry/routes';

type StartPath = {
  id: string;
  to: string;
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
};

const startPaths: StartPath[] = [
  {
    id: 'playground',
    to: routePaths.createPlayground,
    icon: FlaskConical,
    titleKey: 'community.home.paths.playground.title',
    descriptionKey: 'community.home.paths.playground.description'
  },
  {
    id: 'templates',
    to: routePaths.exploreTemplates,
    icon: LayoutTemplate,
    titleKey: 'community.home.paths.templates.title',
    descriptionKey: 'community.home.paths.templates.description'
  },
  {
    id: 'characters',
    to: routePaths.exploreCharacters,
    icon: UsersRound,
    titleKey: 'community.home.paths.characters.title',
    descriptionKey: 'community.home.paths.characters.description'
  },
  {
    id: 'comparisons',
    to: routePaths.exploreComparisons,
    icon: Columns3,
    titleKey: 'community.home.paths.comparisons.title',
    descriptionKey: 'community.home.paths.comparisons.description'
  }
];

export function CommunityStartPaths({
  communityEnabled,
  charactersEnabled
}: {
  communityEnabled: boolean;
  charactersEnabled: boolean;
}) {
  const { t } = useTranslation('community');
  const visiblePaths = startPaths.filter(path => {
    if (path.id === 'playground') return true;
    if (path.id === 'characters') return charactersEnabled;
    return communityEnabled;
  });

  return (
    <section className="community-start-paths" aria-labelledby="community-start-paths-title">
      <header className="discovery-section-heading">
        <div>
          <span>{t('community.home.paths.eyebrow')}</span>
          <h2 id="community-start-paths-title">{t('community.home.paths.title')}</h2>
        </div>
      </header>
      <div className="community-start-paths__grid">
        {visiblePaths.map(path => {
          const Icon = path.icon;
          return (
            <Link key={path.id} to={path.to} className="community-start-path">
              <span className="community-start-path__icon"><Icon aria-hidden="true" /></span>
              <span>
                <strong>{t(path.titleKey)}</strong>
                <small>{t(path.descriptionKey)}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
