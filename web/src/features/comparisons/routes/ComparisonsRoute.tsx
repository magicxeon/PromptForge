import { useInfiniteQuery } from '@tanstack/react-query';
import { Columns3 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Surface } from '../../../components/ui/Surface';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { listComparisons } from '../api/comparisonApi';
import { createReturnNavigationState } from '../../../lib/navigation/returnNavigation';
import { useActor } from '../../../lib/auth/ActorProvider';

export function ComparisonsRoute() {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const location = useLocation();
  const comparisons = useInfiniteQuery({
    queryKey: ['comparisons', actorId],
    queryFn: ({ pageParam }) => listComparisons(pageParam),
    enabled: Boolean(actor),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor || undefined
  });
  const items = comparisons.data?.pages.flatMap(page => page.items) || [];
  return (
    <main>
      <header className="mb-5 border-b border-[var(--mpf-border)] pb-5">
        <span className="text-xs font-bold uppercase text-cyan-300">{t('ui.comparisons.kicker')}</span>
        <h1 className="mb-0 mt-2 text-3xl">{t('ui.comparisons.title')}</h1>
        <p className="mb-0 text-sm text-[var(--mpf-text-muted)]">{t('ui.comparisons.description')}</p>
      </header>
      {comparisons.isLoading ? <LoadingState label={t('ui.comparisons.loading')} /> : null}
      {comparisons.isError ? <ErrorState title={t('ui.comparisons.unavailable')} description={comparisons.error.message} onRetry={() => void comparisons.refetch()} /> : null}
      {!comparisons.isLoading && !items.length ? <EmptyState title={t('ui.comparisons.empty')} /> : null}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(set => {
          const run = set.runs.at(-1);
          const slots = run?.slots.filter(slot => slot.result?.imageUrl).slice(0, 4) || [];
          return (
            <Link key={set.id} to={`/comparisons/${set.id}`} state={createReturnNavigationState(location)} className="text-inherit no-underline">
              <Surface className="overflow-hidden p-0 hover:border-cyan-400/50">
                <div className={`grid aspect-[16/9] bg-black ${slots.length > 1 ? 'grid-cols-2' : ''}`}>
                  {slots.length ? slots.map(slot => <img key={slot.id} src={apiMediaUrl(slot.thumbnailUrl || slot.result?.imageUrl) || ''} alt="" className="h-full min-h-0 w-full object-cover object-top" />) : <span className="grid place-items-center"><Columns3 className="size-8 text-[var(--mpf-text-muted)]" /></span>}
                </div>
                <div className="p-4">
                  <h2 className="m-0 truncate text-base">{set.name}</h2>
                  <p className="mb-0 mt-2 text-xs text-[var(--mpf-text-muted)]">{t('ui.comparisons.summary', { count: run?.slots.length || 0, status: run?.status || 'draft' })}</p>
                </div>
              </Surface>
            </Link>
          );
        })}
      </section>
      {comparisons.hasNextPage ? <div className="mt-6 flex justify-center"><Button disabled={comparisons.isFetchingNextPage} onClick={() => void comparisons.fetchNextPage()}>{t('ui.action.loadMore')}</Button></div> : null}
    </main>
  );
}
