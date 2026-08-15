import { useQuery } from '@tanstack/react-query';
import { getGenerationGroupStatus } from '../api/generationApi';
import { useActor } from '../../../lib/auth/ActorProvider';

const TERMINAL = new Set(['completed', 'partially_completed', 'failed']);

export function useGenerationGroup(groupId: string | null) {
  const { actor } = useActor();
  return useQuery({
    queryKey: ['generation-group', actor?.userId || 'loading', groupId],
    queryFn: ({ signal }) => {
      if (!groupId) throw new Error('A generation group ID is required.');
      return getGenerationGroupStatus(groupId, signal);
    },
    enabled: Boolean(groupId && actor),
    refetchInterval: query => TERMINAL.has(query.state.data?.status || '') ? false : 1_200,
    retry: (count, error) => {
      const status = 'status' in error ? Number(error.status) : 0;
      return status !== 401 && status !== 403 && status !== 404 && count < 3;
    }
  });
}
