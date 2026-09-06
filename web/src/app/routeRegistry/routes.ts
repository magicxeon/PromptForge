export const routePaths = {
  explore: '/',
  exploreComparisons: '/explore/comparisons',
  exploreTemplates: '/explore/templates',
  exploreCharacters: '/explore/characters',
  createPlayground: '/create/playground',
  createStudioFace: '/create/studio/face',
  createStudioCharacter: '/create/studio/character',
  createStudioScene: '/create/studio/scene',
  createFashion: '/create/fashion',
  createCinematic: '/create/cinematic',
  createCinematicNew: '/create/cinematic/new',
  libraryRecent: '/library/recent',
  libraryCollections: '/library/collections',
  ownedCharacters: '/me/characters',
  ownedTemplates: '/me/templates',
  accountCredits: '/credits',
  admin: '/admin',
  adminOperations: '/admin/operations',
  adminAttributes: '/admin/attributes',
  adminCinematic: '/admin/cinematic',
  adminProviders: '/admin/providers',
  adminControlPlane: '/admin/control-plane'
} as const;

export const routeBuilders = {
  post: (postId: string) => `/posts/${encodeURIComponent(postId)}`,
  templateDetail: (postId: string) => `/explore/templates/${encodeURIComponent(postId)}`,
  character: (characterId: string) => `/characters/${encodeURIComponent(characterId)}`,
  ownedCharacter: (characterId: string) => `/me/characters/${encodeURIComponent(characterId)}`,
  profile: (handle: string, tab?: string) =>
    `/profiles/${encodeURIComponent(handle)}${tab && tab !== 'overview' ? `/${encodeURIComponent(tab)}` : ''}`,
  recentDetail: (jobId: string) => `/library/recent/${encodeURIComponent(jobId)}`,
  collection: (collectionId: string) => `/library/collections/${encodeURIComponent(collectionId)}`,
  comparison: (setId: string) => `/comparisons/${encodeURIComponent(setId)}`,
  cinematicProject: (projectId: string, stage = 'setup') =>
    `/create/cinematic/${encodeURIComponent(projectId)}/${encodeURIComponent(stage)}`,
  cinematicShot: (projectId: string, shotId: string) =>
    `/create/cinematic/${encodeURIComponent(projectId)}/shot/${encodeURIComponent(shotId)}`,
  adminUser: (userId: string) => `/admin/users/${encodeURIComponent(userId)}`
} as const;

export type NavigationRouteId =
  | 'gallery'
  | 'templates'
  | 'characters'
  | 'publicComparisons'
  | 'studio'
  | 'fashion'
  | 'cinematic'
  | 'playground'
  | 'history'
  | 'collections'
  | 'myCharacters'
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
  feature?: 'community' | 'characters' | 'cinematic';
};

export type SidebarNavigationGroup = {
  id: string;
  labelKey?: string;
  items: readonly SidebarNavigationItem[];
};

export const navigationRoutes: readonly NavigationRoute[] = [
  { id: 'gallery', path: routePaths.explore, labelKey: 'shell.navigation.items.gallery', navigation: 'primary' },
  { id: 'publicComparisons', path: routePaths.exploreComparisons, labelKey: 'shell.navigation.items.publicComparisons', navigation: 'primary' },
  { id: 'templates', path: routePaths.exploreTemplates, labelKey: 'shell.navigation.items.templates', navigation: 'primary' },
  { id: 'characters', path: routePaths.exploreCharacters, labelKey: 'shell.navigation.items.characters', navigation: 'primary' },
  { id: 'studio', path: routePaths.createStudioFace, labelKey: 'shell.navigation.items.studio', navigation: 'primary' },
  { id: 'fashion', path: routePaths.createFashion, labelKey: 'shell.navigation.items.fashionStudio', navigation: 'primary' },
  { id: 'cinematic', path: routePaths.createCinematic, labelKey: 'shell.navigation.items.cinematicStudio', navigation: 'primary' },
  { id: 'playground', path: routePaths.createPlayground, labelKey: 'shell.navigation.items.playground', navigation: 'primary' },
  { id: 'history', path: routePaths.libraryRecent, labelKey: 'shell.navigation.items.recent', navigation: 'primary' },
  { id: 'collections', path: routePaths.libraryCollections, labelKey: 'shell.navigation.items.collections', navigation: 'primary' },
  { id: 'myCharacters', path: routePaths.ownedCharacters, labelKey: 'shell.navigation.items.myCharacters', navigation: 'primary' },
  { id: 'admin', path: routePaths.admin, labelKey: 'shell.navigation.items.admin', navigation: 'role', allowedRoles: ['admin', 'support'] }
] as const;

export const sidebarNavigationGroups: readonly SidebarNavigationGroup[] = [
  {
    id: 'explore',
    labelKey: 'shell.navigation.groups.explore',
    items: [
      { id: 'gallery', path: routePaths.explore, labelKey: 'shell.navigation.items.gallery', icon: 'gallery', feature: 'community' },
      { id: 'public-comparisons', path: routePaths.exploreComparisons, labelKey: 'shell.navigation.items.publicComparisons', icon: 'comparisons', feature: 'community' },
      { id: 'templates', path: routePaths.exploreTemplates, labelKey: 'shell.navigation.items.templates', icon: 'templates', feature: 'community' },
      { id: 'characters', path: routePaths.exploreCharacters, labelKey: 'shell.navigation.items.characters', icon: 'characters', feature: 'characters' }
    ]
  },
  {
    id: 'create',
    labelKey: 'shell.navigation.groups.create',
    items: [
      { id: 'playground', path: routePaths.createPlayground, labelKey: 'shell.navigation.items.playground', icon: 'playground' },
      {
        id: 'studio',
        labelKey: 'shell.navigation.items.studio',
        icon: 'studio',
        children: [
          { id: 'face-creator', path: `${routePaths.createStudioFace}#studio-configurator-title`, labelKey: 'shell.navigation.items.faceCreator', icon: 'face' },
          { id: 'character-sheet', path: `${routePaths.createStudioCharacter}#studio-configurator-title`, labelKey: 'shell.navigation.items.characterSheet', icon: 'character' },
          { id: 'scene-builder', path: `${routePaths.createStudioScene}#studio-configurator-title`, labelKey: 'shell.navigation.items.sceneBuilder', icon: 'scene' }
        ]
      },
      { id: 'fashion', path: routePaths.createFashion, labelKey: 'shell.navigation.items.fashionStudio', icon: 'fashion' },
      { id: 'cinematic', path: routePaths.createCinematic, labelKey: 'shell.navigation.items.cinematicStudio', icon: 'cinematic', feature: 'cinematic' }
    ]
  },
  {
    id: 'library',
    labelKey: 'shell.navigation.groups.library',
    items: [
      { id: 'history', path: routePaths.libraryRecent, labelKey: 'shell.navigation.items.recent', icon: 'history' },
      { id: 'collections', path: routePaths.libraryCollections, labelKey: 'shell.navigation.items.collections', icon: 'collections' },
      { id: 'my-characters', path: routePaths.ownedCharacters, labelKey: 'shell.navigation.items.myCharacters', icon: 'characters', feature: 'characters' },
      { id: 'my-templates', path: routePaths.ownedTemplates, labelKey: 'shell.navigation.items.myTemplates', icon: 'templates', feature: 'community' }
    ]
  },
  {
    id: 'operations',
    labelKey: 'shell.navigation.groups.operations',
    items: [
      { id: 'admin', path: routePaths.admin, labelKey: 'shell.navigation.items.admin', icon: 'admin', allowedRoles: ['admin', 'support'] }
    ]
  }
] as const;

export function visibleNavigationRoutes(role?: string) {
  return navigationRoutes.filter(route => route.navigation === 'primary' || Boolean(role && route.allowedRoles?.includes(role)));
}

export function findNavigationRoute(id: NavigationRouteId) {
  return navigationRoutes.find(route => route.id === id);
}

export function isSidebarNavigationTargetActive(id: string, currentLocation: string) {
  const [pathname = ''] = currentLocation.split('?');
  if (id === 'gallery') return pathname === routePaths.explore;
  if (id === 'public-comparisons') return pathname === routePaths.exploreComparisons;
  if (id === 'templates') return pathname === routePaths.exploreTemplates || pathname.startsWith(`${routePaths.exploreTemplates}/`);
  if (id === 'characters') return pathname.startsWith(routePaths.exploreCharacters) || pathname.startsWith('/characters/');
  if (id === 'face-creator') return pathname === routePaths.createStudioFace;
  if (id === 'character-sheet') return pathname === routePaths.createStudioCharacter;
  if (id === 'scene-builder') return pathname === routePaths.createStudioScene;
  if (id === 'fashion') return pathname.startsWith(routePaths.createFashion);
  if (id === 'cinematic') return pathname.startsWith(routePaths.createCinematic);
  if (id === 'playground') return pathname.startsWith(routePaths.createPlayground);
  if (id === 'history') return pathname.startsWith(routePaths.libraryRecent);
  if (id === 'collections') return pathname.startsWith(routePaths.libraryCollections);
  if (id === 'my-characters') return pathname.startsWith(routePaths.ownedCharacters);
  if (id === 'my-templates') return pathname === routePaths.ownedTemplates;
  if (id === 'admin') return pathname.startsWith(routePaths.admin);
  return false;
}
