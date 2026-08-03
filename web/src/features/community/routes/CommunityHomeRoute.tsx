import { useMemo, type ReactNode } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MediaCard } from '../../../components/media/MediaCard';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { listCommunityPosts, type CommunityFilters } from '../api/communityApi';
import { useActor } from '../../../lib/auth/ActorProvider';
import { CommunityHero } from '../components/CommunityHero';
import { routePaths } from '../../../app/routeRegistry/routes';

const postTypes = ['all', 'image', 'template', 'comparison', 'collection'] as const;
const periods = ['latest', 'week', 'month', 'year'] as const;

export function CommunityHomeRoute() {
  const { t } = useTranslation(['community', 'shell']);
  const { actor } = useActor();
  const location = useLocation();
  const navigate = useNavigate();
  const actorId = actor?.userId || 'loading';
  const [params, setParams] = useSearchParams();
  const filters = useMemo<CommunityFilters>(() => {
    const periodValue = params.get('period');
    const sortValue = params.get('sort');
    const routeType = location.pathname === routePaths.exploreTemplates
      ? 'template'
      : location.pathname === routePaths.exploreComparisons
        ? 'comparison'
        : null;
    const typeValue = routeType || params.get('type');
    return {
      sort: sortValue === 'trending' || periodValue ? 'trending' : 'latest',
      period: periodValue === 'month' || periodValue === 'year' ? periodValue : 'week',
      postType: postTypes.includes(typeValue as typeof postTypes[number])
        ? typeValue as CommunityFilters['postType']
        : 'all',
      officialTag: String(params.get('category') || '').trim(),
      search: String(params.get('search') || '').trim()
    };
  }, [location.pathname, params]);
  const query = useInfiniteQuery({
    queryKey: ['community-posts', actorId, filters],
    queryFn: ({ pageParam }) => listCommunityPosts(filters, pageParam),
    enabled: Boolean(actor),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor || undefined
  });
  const posts = query.data?.pages.flatMap(page => page.items) || [];
  const categories = query.data?.pages[0]?.facets?.officialTags || [];

  function updateFilter(name: 'type' | 'period' | 'category', value: string) {
    const next = new URLSearchParams(params);
    if (name === 'type') {
      next.delete('type');
      const target = value === 'template'
        ? routePaths.exploreTemplates
        : value === 'comparison'
          ? routePaths.exploreComparisons
          : routePaths.explore;
      if (value !== 'all' && value !== 'template' && value !== 'comparison') next.set('type', value);
      navigate(`${target}${next.size ? `?${next}` : ''}`, { replace: true });
      return;
    } else if (name === 'category') {
      if (!value) next.delete('category');
      else next.set('category', value);
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
    <main className="community-home">
      {!filters.search ? <CommunityHero posts={posts} /> : null}

      <section className="community-discovery" aria-labelledby="community-discovery-title">
        <div className="community-discovery__heading">
          <div>
            <span>{t('community.home.discoveryEyebrow')}</span>
            <h2 id="community-discovery-title">{t('community.feed.title')}</h2>
          </div>
          {filters.search ? (
            <p>
              {t('community.feed.searchLabel')}: <strong>{filters.search}</strong>
            </p>
          ) : null}
        </div>
        <div className="community-discovery__filters" aria-label={t('community.feed.typeLabel')}>
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
        <div className="community-discovery__periods">
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
        {categories.length || filters.officialTag ? (
          <div
            className="community-discovery__categories"
            aria-label={t('community.feed.categoryLabel')}
          >
            <FilterButton
              active={!filters.officialTag}
              onClick={() => updateFilter('category', '')}
            >
              {t('community.feed.categoryAll')}
            </FilterButton>
            {categories.map(category => (
              <FilterButton
                key={category.id}
                active={filters.officialTag === category.id}
                onClick={() => updateFilter('category', category.id)}
              >
                {formatCategoryLabel(category.id)}
              </FilterButton>
            ))}
          </div>
        ) : null}
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
      <section className="community-feed-grid" aria-live="polite">
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

function formatCategoryLabel(value: string) {
  return value
    .replace(/^[a-z0-9_-]+[.:/]/i, '')
    .replace(/[._/-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
    .trim();
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
      className="community-discovery__filter-button shrink-0"
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
