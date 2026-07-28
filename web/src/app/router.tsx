import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { RouteErrorPage } from '../components/layout/RouteErrorPage';
import { NotFoundRoute } from '../components/layout/NotFoundRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/community" replace /> },
      { path: 'home', element: <Navigate to="/community" replace /> },
      { path: 'library', element: <Navigate to="/history" replace /> },
      { path: 'library/images', element: <Navigate to="/history" replace /> },
      { path: 'compare', element: <Navigate to="/comparisons" replace /> },
      { path: 'create/simple', element: <Navigate to="/studio" replace /> },
      { path: 'create/characters', element: <Navigate to="/studio?mode=character-sheet" replace /> },
      { path: 'create/playground', element: <Navigate to="/playground" replace /> },
      {
        path: 'community',
        lazy: async () => {
          const module = await import('../features/community/routes/CommunityHomeRoute');
          return { Component: module.CommunityHomeRoute };
        }
      },
      {
        path: 'community/characters',
        lazy: async () => {
          const module = await import('../features/profiles/routes/CharacterDirectoryRoute');
          return { Component: module.CharacterDirectoryRoute };
        }
      },
      {
        path: 'community/characters/:characterId',
        lazy: async () => {
          const module = await import('../features/profiles/routes/CharacterProfileRoute');
          return { Component: module.CharacterProfileRoute };
        }
      },
      {
        path: 'community/:postId',
        lazy: async () => {
          const module = await import('../features/community/routes/CommunityPostRoute');
          return { Component: module.CommunityPostRoute };
        }
      },
      {
        path: 'creators/:handle/:profileTab?',
        lazy: async () => {
          const module = await import('../features/profiles/routes/CreatorProfileRoute');
          return { Component: module.CreatorProfileRoute };
        }
      },
      {
        path: 'history',
        lazy: async () => {
          const module = await import('../features/history/routes/HistoryRoute');
          return { Component: module.HistoryRoute };
        }
      },
      {
        path: 'history/:jobId',
        lazy: async () => {
          const module = await import('../features/history/routes/HistoryDetailRoute');
          return { Component: module.HistoryDetailRoute };
        }
      },
      {
        path: 'collections',
        lazy: async () => {
          const module = await import('../features/collections/routes/CollectionsRoute');
          return { Component: module.CollectionsRoute };
        }
      },
      {
        path: 'collections/:collectionId',
        lazy: async () => {
          const module = await import('../features/collections/routes/CollectionDetailRoute');
          return { Component: module.CollectionDetailRoute };
        }
      },
      {
        path: 'comparisons',
        lazy: async () => {
          const module = await import('../features/comparisons/routes/ComparisonsRoute');
          return { Component: module.ComparisonsRoute };
        }
      },
      {
        path: 'comparisons/:setId',
        lazy: async () => {
          const module = await import('../features/comparisons/routes/ComparisonDetailRoute');
          return { Component: module.ComparisonDetailRoute };
        }
      },
      {
        path: 'admin',
        lazy: async () => {
          const module = await import('../features/admin/routes/AdminRoute');
          return { Component: module.AdminRoute };
        }
      },
      {
        path: 'playground',
        lazy: async () => {
          const module = await import('../features/playground/routes/PlaygroundRoute');
          return { Component: module.PlaygroundRoute };
        }
      },
      {
        path: 'studio',
        lazy: async () => {
          const module = await import('../features/studio/routes/StudioRoute');
          return { Component: module.StudioRoute };
        }
      },
      {
        path: 'studio/scene',
        lazy: async () => {
          const module = await import('../features/scene-builder/routes/SceneBuilderRoute');
          return { Component: module.SceneBuilderRoute };
        }
      },
      {
        path: 'create/scenes',
        lazy: async () => {
          const module = await import('../features/scene-builder/routes/SceneBuilderRoute');
          return { Component: module.SceneBuilderRoute };
        }
      },
      {
        path: 'create/fashion',
        lazy: async () => {
          const module = await import('../features/fashion-blueprint/routes/FashionBlueprintRoute');
          return { Component: module.FashionBlueprintRoute };
        }
      },
      {
        path: 'credits',
        lazy: async () => {
          const module = await import('../features/credits/routes/CreditsRoute');
          return { Component: module.CreditsRoute };
        }
      },
      { path: '*', element: <NotFoundRoute /> }
    ]
  }
]);
