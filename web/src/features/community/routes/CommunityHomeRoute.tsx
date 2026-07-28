import { useMemo, type ReactNode } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MediaCard } from '../../../components/media/MediaCard';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { listCommunityPosts, type CommunityFilters } from '../api/communityApi';
import { useActor } from '../../../lib/auth/ActorProvider';

const postTypes = ['all', 'image', 'template', 'comparison', 'collection'] as const;
const periods = ['latest', 'week', 'month', 'year'] as const;

export function CommunityHomeRoute() {
  const { t } = useTranslation(['community', 'shell']);
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const [params, setParams] = useSearchParams();
  const filters = useMemo<CommunityFilters>(() => {
    const periodValue = params.get('period');
    const sortValue = params.get('sort');
    const typeValue = params.get('type');
    return {
      sort: sortValue === 'trending' || periodValue ? 'trending' : 'latest',
      period: periodValue === 'month' || periodValue === 'year' ? periodValue : 'week',
      postType: postTypes.includes(typeValue as typeof postTypes[number])
        ? typeValue as CommunityFilters['postType']
        : 'all',
      search: String(params.get('search') || '').trim()
    };
  }, [params]);
  const query = useInfiniteQuery({
    queryKey: ['community-posts', actorId, filters],
    queryFn: ({ pageParam }) => listCommunityPosts(filters, pageParam),
    enabled: Boolean(actor),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor || undefined
  });
  const posts = query.data?.pages.flatMap(page => page.items) || [];

  function updateFilter(name: 'type' | 'period', value: string) {
    const next = new URLSearchParams(params);
    if (name === 'type') {
      if (value === 'all') next.delete('type');
      else next.set('type', value);
    } else if (value === 'latest') {
      next.delete('period');
      next.delete('sort');
    } else {
      next.set('period', value);
      next.set('sort', 'trending');
    }
    setParams(next, { replace: true });
  }

  return (
    <main>
      <section className="mb-5 border-b border-[var(--mpf-border)] pb-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-normal text-cyan-300">{t('shell.navigation.items.home', { ns: 'shell' })}</p>
        <h1 className="m-0 text-2xl sm:text-3xl">{t('community.feed.title')}</h1>
        {filters.search ? (
          <p className="mb-0 text-sm text-[var(--mpf-text-muted)]">
            {t('community.feed.searchLabel')}: <strong className="text-white">{filters.search}</strong>
          </p>
        ) : null}
      </section>

      <section className="mb-6 space-y-3" aria-label={t('community.feed.typeLabel')}>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {postTypes.map(type => (
            <FilterButton
              key={type}
              active={filters.postType === type}
              onClick={() => updateFilter('type', type)}
            >
              {t(`community.feed.type.${type}`)}
            </FilterButton>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {periods.map(period => (
            <FilterButton
              key={period}
              active={period === 'latest' ? filters.sort === 'latest' : filters.sort === 'trending' && filters.period === period}
              onClick={() => updateFilter('period', period)}
            >
              {t(`community.feed.${period}`)}
            </FilterButton>
          ))}
        </div>
      </section>

      {query.isLoading ? <LoadingState label={t('community.feed.loading')} /> : null}
      {query.isError ? (
        <ErrorState
          title={t('community.feed.error')}
          description={query.error.message}
          retryLabel={t('community.feed.retry')}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {!query.isLoading && !query.isError && !posts.length ? (
        <EmptyState title={t('community.feed.empty')} />
      ) : null}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
        {posts.map(post => <MediaCard key={post.id} post={post} />)}
      </section>
      {query.hasNextPage ? (
        <div className="mt-7 flex justify-center">
          <Button
            onClick={() => void query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage
              ? t('community.feed.loadingMore')
              : t('community.feed.loadMore')}
          </Button>
        </div>
      ) : null}
    </main>
  );
}

function FilterButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      variant={active ? 'primary' : 'secondary'}
      className="shrink-0"
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
