import { useQueries } from '@tanstack/react-query';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getTemplatePreviews } from '../api/communityApi';

export function useTemplatePreviews(pages: string[][]) {
  const { actor } = useActor();
  const batches = pages.flatMap(page => {
    const ids = [...new Set(page)];
    const result: string[][] = [];
    for (let i = 0; i < ids.length; i += 24) result.push(ids.slice(i, i + 24));
    return result;
  });
  const queries = useQueries({ queries: batches.map(batch => ({
    queryKey: ['community-template-previews', actor?.userId || 'loading', batch, 'v1'],
    queryFn: () => getTemplatePreviews(batch),
    enabled: Boolean(actor),
    staleTime: 30_000,
    refetchOnWindowFocus: true
  })) });
  return {
    items: new Map(queries.flatMap(query => query.data?.items || []).map(item => [item.templatePostId, item])),
    loading: queries.some(query => query.isLoading),
    failed: queries.some(query => query.isError),
    retry: () => { queries.filter(query => query.isError).forEach(query => { void query.refetch(); }); }
  };
}
