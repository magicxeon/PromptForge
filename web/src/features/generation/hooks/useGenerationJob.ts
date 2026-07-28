import { useQuery } from '@tanstack/react-query';
import { getJobStatus } from '../api/generationApi';
import { useActor } from '../../../lib/auth/ActorProvider';

const terminal = new Set(['completed', 'succeeded', 'failed', 'cancelled', 'expired']);

export function useGenerationJob(jobId: string | null) {
  const { actor } = useActor();
  return useQuery({
    queryKey: ['generation-job', actor?.userId || 'loading', jobId],
    queryFn: ({ signal }) => {
      if (!jobId) throw new Error('A generation job ID is required.');
      return getJobStatus(jobId, signal);
    },
    enabled: Boolean(jobId && actor),
    refetchInterval: query => terminal.has(query.state.data?.status || '') ? false : 1400,
    retry: (count, error) => {
      const status = 'status' in error ? Number(error.status) : 0;
      return status !== 401 && status !== 403 && status !== 404 && count < 3;
    }
  });
}
