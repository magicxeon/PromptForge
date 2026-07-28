import { Suspense, useState, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActorProvider } from '../../lib/auth/ActorProvider';
import { LoadingState } from '../../components/ui/AsyncState';
import { useTranslation } from 'react-i18next';
import { FeaturePolicyProvider } from '../../lib/permissions/FeaturePolicyProvider';

export function AppProviders({ children }: PropsWithChildren) {
  const { t } = useTranslation('common');
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          const status = (error as { status?: number }).status;
          return status === 401 || status === 403 || status === 404
            ? false
            : failureCount < 2;
        },
        refetchOnWindowFocus: false
      },
      mutations: {
        retry: false
      }
    }
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <FeaturePolicyProvider>
        <ActorProvider>
          <Suspense fallback={<LoadingState label={t('common.status.loadingApplication')} />}>
            {children}
          </Suspense>
        </ActorProvider>
      </FeaturePolicyProvider>
    </QueryClientProvider>
  );
}
