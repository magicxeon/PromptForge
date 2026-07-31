import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  findNavigationRoute,
  type NavigationRouteId
} from '../../app/routeRegistry/routes';

type Crumb = {
  label: string;
  to?: string;
};

export function Breadcrumbs() {
  const location = useLocation();
  const { t } = useTranslation('shell');
  const crumbs = resolveCrumbs(location.pathname, location.search, key => String(t(key)));
  if (!crumbs.length) return null;

  return (
    <nav
      aria-label={t('shell.navigation.breadcrumbs')}
      className="mb-3 overflow-x-auto"
      data-testid="breadcrumbs"
    >
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

function resolveCrumbs(pathname: string, search: string, t: (key: string) => string): Crumb[] {
  if (pathname === '/' || pathname === '/home' || pathname === '/community') return [];
  const routeCrumb = (id: NavigationRouteId, link = false): Crumb => {
    const route = findNavigationRoute(id);
    return {
      label: t(route?.labelKey || `shell.navigation.items.${id}`),
      to: link ? route?.path : undefined
    };
  };
  const home = routeCrumb('home', true);
  if (pathname.startsWith('/community/characters')) {
    return [home, routeCrumb('characters')];
  }
  if (pathname.startsWith('/community/') || pathname.startsWith('/creators/')) {
    return [home];
  }
  if (pathname.startsWith('/studio/scene') || pathname.startsWith('/create/scenes')) {
    return [
      home,
      routeCrumb('studio', true),
      { label: t('shell.navigation.items.sceneBuilder') }
    ];
  }
  if (pathname.startsWith('/studio') || pathname.startsWith('/create/simple') || pathname.startsWith('/create/characters')) {
    const characterSheet = new URLSearchParams(search).get('mode') === 'character-sheet';
    return [
      home,
      routeCrumb('studio', true),
      {
        label: t(characterSheet
          ? 'shell.navigation.items.characterSheet'
          : 'shell.navigation.items.faceCreator')
      }
    ];
  }
  if (pathname.startsWith('/create/fashion')) {
    return [home, routeCrumb('fashion')];
  }
  if (pathname.startsWith('/playground') || pathname.startsWith('/create/playground')) {
    return [home, routeCrumb('playground')];
  }
  if (pathname.startsWith('/comparisons') || pathname.startsWith('/compare')) {
    return [home, routeCrumb('comparisons')];
  }
  if (pathname.startsWith('/history') || pathname.startsWith('/library')) {
    return [home, routeCrumb('history')];
  }
  if (pathname.startsWith('/collections')) {
    return [home, routeCrumb('collections')];
  }
  if (pathname.startsWith('/admin')) {
    return [home, routeCrumb('admin')];
  }
  return [home];
}
