import { useQuery } from '@tanstack/react-query';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getCatalogConfig } from '../api/contentCatalogApi';

export function useCatalogAccess() {
  const { actor, isLoading } = useActor();
  const authorized = !isLoading && actor?.role === 'admin';
  const config = useQuery({
    queryKey: ['content-catalog', actor?.userId, 'config'],
    queryFn: ({ signal }) => getCatalogConfig(signal), enabled: authorized,
    staleTime: 30_000, retry: false
  });
  return { actor, authorized, resolvingActor: isLoading, config, enabled: authorized && config.data?.enabled === true };
}
