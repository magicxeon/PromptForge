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

export function visibleNavigationRoutes(role?: string) {
  return navigationRoutes.filter(route =>
    route.navigation === 'primary'
    || Boolean(role && route.allowedRoles?.includes(role))
  );
}

export function findNavigationRoute(id: NavigationRouteId) {
  return navigationRoutes.find(route => route.id === id);
}
