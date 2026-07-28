export type NavigationRouteId =
  | 'home'
  | 'characters'
  | 'studio'
  | 'fashion'
  | 'playground'
  | 'comparisons'
  | 'history'
  | 'collections'
  | 'admin';

export type NavigationRoute = {
  id: NavigationRouteId;
  path: string;
  labelKey: string;
  navigation: 'primary' | 'role';
  allowedRoles?: string[];
};

export type SidebarNavigationItem = {
  id: string;
  labelKey: string;
  icon: string;
  path?: string;
  children?: readonly SidebarNavigationItem[];
  allowedRoles?: readonly string[];
  feature?: 'community' | 'characters';
};

export type SidebarNavigationGroup = {
  id: string;
  labelKey?: string;
  items: readonly SidebarNavigationItem[];
};

export const navigationRoutes: readonly NavigationRoute[] = [
  { id: 'home', path: '/community', labelKey: 'shell.navigation.items.home', navigation: 'primary' },
  { id: 'characters', path: '/community/characters', labelKey: 'shell.navigation.items.characters', navigation: 'primary' },
  { id: 'studio', path: '/studio', labelKey: 'shell.navigation.items.studio', navigation: 'primary' },
  { id: 'fashion', path: '/create/fashion', labelKey: 'shell.navigation.items.fashionStudio', navigation: 'primary' },
  { id: 'playground', path: '/playground', labelKey: 'shell.navigation.items.playground', navigation: 'primary' },
  { id: 'comparisons', path: '/comparisons', labelKey: 'shell.navigation.items.comparisons', navigation: 'primary' },
  { id: 'history', path: '/history', labelKey: 'shell.navigation.items.myImages', navigation: 'primary' },
  { id: 'collections', path: '/collections', labelKey: 'shell.navigation.items.collections', navigation: 'primary' },
  {
    id: 'admin',
    path: '/admin',
    labelKey: 'shell.navigation.items.admin',
    navigation: 'role',
    allowedRoles: ['admin', 'support']
  }
] as const;

export const sidebarNavigationGroups: readonly SidebarNavigationGroup[] = [
  {
    id: 'home',
    items: [
      {
        id: 'home',
        path: '/community',
        labelKey: 'shell.navigation.items.home',
        icon: 'home',
        feature: 'community'
      }
    ]
  },
  {
    id: 'create',
    labelKey: 'shell.navigation.groups.create',
    items: [
      {
        id: 'studio',
        labelKey: 'shell.navigation.items.studio',
        icon: 'studio',
        children: [
          {
            id: 'face-creator',
            path: '/studio',
            labelKey: 'shell.navigation.items.faceCreator',
            icon: 'face'
          },
          {
            id: 'character-sheet',
            path: '/studio?mode=character-sheet',
            labelKey: 'shell.navigation.items.characterSheet',
            icon: 'character'
          },
          {
            id: 'scene-builder',
            path: '/studio/scene',
            labelKey: 'shell.navigation.items.sceneBuilder',
            icon: 'scene'
          }
        ]
      },
      {
        id: 'fashion',
        path: '/create/fashion',
        labelKey: 'shell.navigation.items.fashionStudio',
        icon: 'fashion'
      },
      {
        id: 'playground',
        path: '/playground',
        labelKey: 'shell.navigation.items.playground',
        icon: 'playground'
      },
      {
        id: 'comparisons',
        path: '/comparisons',
        labelKey: 'shell.navigation.items.comparisons',
        icon: 'comparisons'
      }
    ]
  },
  {
    id: 'explore',
    labelKey: 'shell.navigation.groups.explore',
    items: [
      {
        id: 'characters',
        path: '/community/characters',
        labelKey: 'shell.navigation.items.characters',
        icon: 'characters',
        feature: 'characters'
      }
    ]
  },
  {
    id: 'library',
    labelKey: 'shell.navigation.groups.library',
    items: [
      {
        id: 'history',
        path: '/history',
        labelKey: 'shell.navigation.items.myImages',
        icon: 'history'
      },
      {
        id: 'collections',
        path: '/collections',
        labelKey: 'shell.navigation.items.collections',
        icon: 'collections'
      }
    ]
  },
  {
    id: 'operations',
    labelKey: 'shell.navigation.groups.operations',
    items: [
      {
        id: 'admin',
        path: '/admin',
        labelKey: 'shell.navigation.items.admin',
        icon: 'admin',
        allowedRoles: ['admin', 'support']
      }
    ]
  }
] as const;

export function visibleNavigationRoutes(role?: string) {
  return navigationRoutes.filter(route =>
    route.navigation === 'primary'
    || Boolean(role && route.allowedRoles?.includes(role))
  );
}

export function findNavigationRoute(id: NavigationRouteId) {
  return navigationRoutes.find(route => route.id === id);
}

export function isSidebarNavigationTargetActive(id: string, currentLocation: string) {
  const [pathname = '', search = ''] = currentLocation.split('?');
  const params = new URLSearchParams(search);
  if (id === 'home') {
    return pathname === '/community' || (
      pathname.startsWith('/community/')
      && !pathname.startsWith('/community/characters')
    );
  }
  if (id === 'characters') return pathname.startsWith('/community/characters');
  if (id === 'face-creator') return pathname === '/studio' && params.get('mode') !== 'character-sheet';
  if (id === 'character-sheet') return pathname === '/studio' && params.get('mode') === 'character-sheet';
  if (id === 'scene-builder') return pathname === '/studio/scene' || pathname === '/create/scenes';
  if (id === 'fashion') return pathname.startsWith('/create/fashion');
  if (id === 'playground') return pathname.startsWith('/playground');
  if (id === 'comparisons') return pathname.startsWith('/comparisons');
  if (id === 'history') return pathname.startsWith('/history');
  if (id === 'collections') return pathname.startsWith('/collections');
  if (id === 'admin') return pathname.startsWith('/admin');
  return false;
}
