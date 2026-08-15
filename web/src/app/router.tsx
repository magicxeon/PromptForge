import { createBrowserRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { LegacyRouteRedirect, LegacyStudioRedirect } from '../components/layout/LegacyRouteRedirect';
import { RouteErrorPage } from '../components/layout/RouteErrorPage';
import { NotFoundRoute } from '../components/layout/NotFoundRoute';
import { routePaths } from './routeRegistry/routes';

const lazyRoute = (load: () => Promise<Record<string, unknown>>, exportName: string) => async () => {
  const module = await load();
  return { Component: module[exportName] as ComponentType };
};

export const router = createBrowserRouter([{
  path: '/',
  element: <AppShell />,
  errorElement: <RouteErrorPage />,
  children: [
    { index: true, lazy: lazyRoute(() => import('../features/community/routes/CommunityHomeRoute'), 'CommunityHomeRoute') },
    { path: 'explore/comparisons', lazy: lazyRoute(() => import('../features/community/routes/CommunityHomeRoute'), 'CommunityHomeRoute') },
    { path: 'explore/templates', lazy: lazyRoute(() => import('../features/community/routes/CommunityHomeRoute'), 'CommunityHomeRoute') },
    { path: 'explore/characters', lazy: lazyRoute(() => import('../features/profiles/routes/CharacterDirectoryRoute'), 'CharacterDirectoryRoute') },
    { path: 'posts/:postId', lazy: lazyRoute(() => import('../features/community/routes/CommunityPostRoute'), 'CommunityPostRoute') },
    { path: 'characters/:characterId', lazy: lazyRoute(() => import('../features/profiles/routes/CharacterProfileRoute'), 'CharacterProfileRoute') },
    { path: 'profiles/:handle/:profileTab?', lazy: lazyRoute(() => import('../features/profiles/routes/CreatorProfileRoute'), 'CreatorProfileRoute') },
    { path: 'me/characters', lazy: lazyRoute(() => import('../features/profiles/routes/CharacterOwnerDirectoryRoute'), 'CharacterOwnerDirectoryRoute') },
    { path: 'me/:profileTab?', lazy: lazyRoute(() => import('../features/profiles/routes/MyProfileRoute'), 'MyProfileRoute') },
    { path: 'me/characters/:characterId', lazy: lazyRoute(() => import('../features/profiles/routes/CharacterProfileRoute'), 'CharacterOwnerProfileRoute') },

    { path: 'create/playground', lazy: lazyRoute(() => import('../features/playground/routes/PlaygroundRoute'), 'PlaygroundRoute') },
    { path: 'create/studio/face', lazy: lazyRoute(() => import('../features/studio/routes/StudioRoute'), 'StudioRoute') },
    { path: 'create/studio/character', lazy: lazyRoute(() => import('../features/studio/routes/StudioRoute'), 'StudioRoute') },
    { path: 'create/studio/scene', lazy: lazyRoute(() => import('../features/scene-builder/routes/SceneBuilderRoute'), 'SceneBuilderRoute') },
    { path: 'create/fashion', lazy: lazyRoute(() => import('../features/fashion-blueprint/routes/FashionBlueprintRoute'), 'FashionBlueprintRoute') },

    { path: 'library/recent', lazy: lazyRoute(() => import('../features/history/routes/HistoryRoute'), 'HistoryRoute') },
    { path: 'library/recent/:jobId', lazy: lazyRoute(() => import('../features/history/routes/HistoryDetailRoute'), 'HistoryDetailRoute') },
    { path: 'library/collections', lazy: lazyRoute(() => import('../features/collections/routes/CollectionsRoute'), 'CollectionsRoute') },
    { path: 'library/collections/:collectionId', lazy: lazyRoute(() => import('../features/collections/routes/CollectionDetailRoute'), 'CollectionDetailRoute') },

    { path: 'comparisons', lazy: lazyRoute(() => import('../features/comparisons/routes/ComparisonsRoute'), 'ComparisonsRoute') },
    { path: 'comparisons/:setId', lazy: lazyRoute(() => import('../features/comparisons/routes/ComparisonDetailRoute'), 'ComparisonDetailRoute') },
    { path: 'credits', lazy: lazyRoute(() => import('../features/credits/routes/CreditsRoute'), 'CreditsRoute') },
    { path: 'admin', lazy: lazyRoute(() => import('../features/admin/routes/AdminRoute'), 'AdminRoute') },

    { path: 'home', element: <LegacyRouteRedirect to={routePaths.explore} /> },
    { path: 'community', element: <LegacyRouteRedirect to={routePaths.explore} /> },
    { path: 'community/characters', element: <LegacyRouteRedirect to={routePaths.exploreCharacters} /> },
    { path: 'community/characters/:characterId', element: <LegacyRouteRedirect to="/characters/:characterId" /> },
    { path: 'community/:postId', element: <LegacyRouteRedirect to="/posts/:postId" /> },
    { path: 'creators/:handle/:profileTab?', element: <LegacyRouteRedirect to="/profiles/:handle/:profileTab?" /> },
    { path: 'creator/characters', element: <LegacyRouteRedirect to="/me/characters" /> },
    { path: 'creator/characters/:characterId', element: <LegacyRouteRedirect to="/me/characters/:characterId" /> },
    { path: 'library', element: <LegacyRouteRedirect to={routePaths.libraryRecent} /> },
    { path: 'library/images', element: <LegacyRouteRedirect to={routePaths.libraryRecent} /> },
    { path: 'history', element: <LegacyRouteRedirect to={routePaths.libraryRecent} /> },
    { path: 'history/:jobId', element: <LegacyRouteRedirect to="/library/recent/:jobId" /> },
    { path: 'recent-generations', element: <LegacyRouteRedirect to={routePaths.libraryRecent} /> },
    { path: 'recent-generations/:jobId', element: <LegacyRouteRedirect to="/library/recent/:jobId" /> },
    { path: 'collections', element: <LegacyRouteRedirect to={routePaths.libraryCollections} /> },
    { path: 'collections/:collectionId', element: <LegacyRouteRedirect to="/library/collections/:collectionId" /> },
    { path: 'compare', element: <LegacyRouteRedirect to={routePaths.exploreComparisons} /> },
    { path: 'playground', element: <LegacyRouteRedirect to={routePaths.createPlayground} /> },
    { path: 'studio', element: <LegacyStudioRedirect /> },
    { path: 'studio/scene', element: <LegacyRouteRedirect to={routePaths.createStudioScene} /> },
    { path: 'create/simple', element: <LegacyRouteRedirect to={routePaths.createStudioFace} /> },
    { path: 'create/characters', element: <LegacyRouteRedirect to={routePaths.createStudioCharacter} /> },
    { path: 'create/scenes', element: <LegacyRouteRedirect to={routePaths.createStudioScene} /> },
    { path: '*', element: <NotFoundRoute /> }
  ]
}]);
