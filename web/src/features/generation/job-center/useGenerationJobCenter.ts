import { useQuery } from '@tanstack/react-query';
import { useActor } from '../../../lib/auth/ActorProvider';
import { queryKeys } from '../../../lib/api/queryKeys';
import { getGenerationJobCenter } from './generationJobCenterApi';

export function useGenerationJobCenter(limit = 12) {
  const { actor } = useActor();
  return useQuery({
    queryKey: queryKeys.generationJobCenter(actor?.userId || 'loading'),
    queryFn: () => getGenerationJobCenter(limit),
    enabled: Boolean(actor?.userId),
    refetchInterval: query => (query.state.data?.activeCount || 0) > 0 ? 3_000 : false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2
  });
}

