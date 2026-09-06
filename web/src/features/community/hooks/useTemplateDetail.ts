import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getTemplateDetail } from '../api/communityApi';

export function useTemplateDetail(postId: string, sort: 'likes' | 'latest' = 'likes', limit = 12) {
  const { actor } = useActor();
  return useInfiniteQuery({
    queryKey: queryKeys.templateDetail(actor?.userId || 'loading', postId, sort, limit),
    queryFn: ({ pageParam }) => getTemplateDetail(postId, sort, limit, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.hasMore ? page.nextCursor : undefined,
    enabled: Boolean(actor && postId),
    staleTime: 30_000,
    maxPages: 10
  });
}

export type TemplateDetailQuery = ReturnType<typeof useTemplateDetail>;
