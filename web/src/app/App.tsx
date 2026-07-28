import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import { AppErrorBoundary } from './ErrorBoundary';
import { router } from './router';

export function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </AppErrorBoundary>
  );
}
