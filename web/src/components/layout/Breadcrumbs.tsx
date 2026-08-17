import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routePaths } from '../../app/routeRegistry/routes';

type Crumb = { label: string; to?: string };

export function Breadcrumbs() {
  const location = useLocation();
  const { t } = useTranslation('shell');
  const crumbs = resolveCrumbs(location.pathname, key => String(t(key)));
  if (!crumbs.length) return null;

  return (
    <nav aria-label={t('shell.navigation.breadcrumbs')} className="mb-3 overflow-x-auto" data-testid="breadcrumbs">
      <ol className="m-0 flex min-w-max list-none items-center gap-1 p-0 text-xs text-[var(--mpf-text-muted)]">
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.to || 'current'}:${crumb.label}`} className="flex items-center gap-1">
            {index ? <ChevronRight className="size-3" aria-hidden="true" /> : null}
            {crumb.to
              ? <Link to={crumb.to} className="px-1 py-2 text-[var(--mpf-text-muted)] no-underline hover:text-[var(--theme-primary)]">{crumb.label}</Link>
              : <span className="px-1 py-2 text-[var(--mpf-text)]" aria-current="page">{crumb.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function resolveCrumbs(pathname: string, t: (key: string) => string): Crumb[] {
  if (pathname === routePaths.explore) return [];
  const explore = { label: t('shell.navigation.groups.explore'), to: routePaths.explore };
  const create = { label: t('shell.navigation.groups.create') };
  const library = { label: t('shell.navigation.groups.library') };

  if (pathname === routePaths.exploreComparisons) return [explore, { label: t('shell.navigation.items.publicComparisons') }];
  if (pathname === routePaths.exploreTemplates) return [explore, { label: t('shell.navigation.items.templates') }];
  if (pathname.startsWith(routePaths.exploreCharacters) || pathname.startsWith('/characters/')) return [explore, { label: t('shell.navigation.items.characters') }];
  if (pathname.startsWith('/posts/')) return [explore, { label: t('shell.navigation.items.post') }];
  if (pathname.startsWith(routePaths.ownedCharacters)) return [library, { label: t('shell.navigation.items.myCharacters') }];
  if (pathname.startsWith('/profiles/') || pathname.startsWith('/me')) return [{ label: t('shell.navigation.items.profile') }];

  if (pathname === routePaths.createPlayground) return [create, { label: t('shell.navigation.items.playground') }];
  if (pathname === routePaths.createStudioFace) return [create, { label: t('shell.navigation.items.studio'), to: routePaths.createStudioFace }, { label: t('shell.navigation.items.faceCreator') }];
  if (pathname === routePaths.createStudioCharacter) return [create, { label: t('shell.navigation.items.studio'), to: routePaths.createStudioFace }, { label: t('shell.navigation.items.characterSheet') }];
  if (pathname === routePaths.createStudioScene) return [create, { label: t('shell.navigation.items.studio'), to: routePaths.createStudioFace }, { label: t('shell.navigation.items.sceneBuilder') }];
  if (pathname.startsWith(routePaths.createFashion)) return [create, { label: t('shell.navigation.items.fashionStudio') }];
  if (pathname.startsWith(routePaths.createCinematic)) return [create, { label: t('shell.navigation.items.cinematicStudio') }];

  if (pathname.startsWith(routePaths.libraryRecent)) return [library, { label: t('shell.navigation.items.recent') }];
  if (pathname.startsWith(routePaths.libraryCollections)) return [library, { label: t('shell.navigation.items.collections') }];
  if (pathname.startsWith('/comparisons')) return [library, { label: t('shell.navigation.items.comparisons') }];
  if (pathname.startsWith(routePaths.accountCredits)) return [{ label: t('shell.account.credits') }];
  if (pathname === routePaths.adminAttributes) return [
    { label: t('shell.navigation.items.admin'), to: routePaths.admin },
    { label: t('shell.navigation.items.attributes') }
  ];
  if (pathname.startsWith(routePaths.admin)) return [{ label: t('shell.navigation.items.admin') }];
  return [explore];
}
