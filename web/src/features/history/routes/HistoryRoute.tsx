import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { FolderOpen, Image as ImageIcon } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { listCollections, listHistory } from '../api/historyApi';
import { useActor } from '../../../lib/auth/ActorProvider';
import { createReturnNavigationState } from '../../../lib/navigation/returnNavigation';

export function HistoryRoute() {
  const { t } = useTranslation(['shell', 'common', 'react-ui']);
  const { actor } = useActor();
  const location = useLocation();
  const actorId = actor?.userId || 'loading';
  const [params, setParams] = useSearchParams();
  const collectionId = params.get('collection') || 'all';
  const collections = useQuery({ queryKey: ['collections', actorId], queryFn: listCollections, enabled: Boolean(actor) });
  const history = useInfiniteQuery({
    queryKey: ['history', actorId, collectionId],
    queryFn: ({ pageParam }) => listHistory(pageParam, collectionId),
    enabled: Boolean(actor),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor || undefined
  });
  const items = history.data?.pages.flatMap(page => page.items) || [];

  return (
    <main>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--mpf-border)] pb-5">
        <div>
          <span className="text-xs font-bold uppercase text-cyan-300">{t('ui.history.kicker', { ns: 'react-ui' })}</span>
          <h1 className="mb-0 mt-2 text-3xl">{t('shell.navigation.items.myImages')}</h1>
        </div>
        <label className="grid gap-1 text-xs text-[var(--mpf-text-muted)]">
          <span className="flex items-center gap-1"><FolderOpen className="size-3" />{t('ui.history.collection', { ns: 'react-ui' })}</span>
          <select
            value={collectionId}
            onChange={event => {
              const next = new URLSearchParams(params);
              if (event.target.value === 'all') next.delete('collection');
              else next.set('collection', event.target.value);
              setParams(next);
            }}
            className="h-10 rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3 text-white"
          >
            <option value="all">{t('ui.history.all', { ns: 'react-ui' })}</option>
            {collections.data?.collections.map(collection => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
          </select>
        </label>
      </header>
      {history.isLoading ? <LoadingState label={t('common.status.loading', { ns: 'common' })} /> : null}
      {history.isError ? <ErrorState title={t('common.status.failed', { ns: 'common' })} description={history.error.message} onRetry={() => void history.refetch()} /> : null}
      {!history.isLoading && !items.length ? <EmptyState title={t('ui.history.empty', { ns: 'react-ui' })} /> : null}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map(item => (
          <Link key={item.id} to={`/history/${encodeURIComponent(item.id)}`} state={createReturnNavigationState(location)} className="overflow-hidden rounded-[var(--mpf-radius-md)] border border-[var(--mpf-border)] bg-[var(--mpf-surface)] text-inherit no-underline hover:border-cyan-400/50">
            <div className="aspect-[4/5] bg-black">
              <img src={apiMediaUrl(item.thumbnailUrl || item.imageUrl) || ''} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
            </div>
            <div className="p-3">
              <strong className="line-clamp-1 text-sm">{item.submodel || item.provider}</strong>
              <span className="mt-2 flex items-center gap-2 text-xs text-[var(--mpf-text-muted)]"><ImageIcon className="size-3" />{new Date(item.timestamp).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
      </section>
      {history.hasNextPage ? <div className="mt-6 flex justify-center"><Button disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>{t('common.action.loadMore', { ns: 'common' })}</Button></div> : null}
    </main>
  );
}
