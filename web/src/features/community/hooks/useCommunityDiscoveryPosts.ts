import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useActor } from '../../../lib/auth/ActorProvider';
import { listCommunityPosts, type CommunityFilters } from '../api/communityApi';

type FixedPostType = Exclude<CommunityFilters['postType'], 'all'>;

export function useCommunityDiscoveryPosts(fixedPostType: FixedPostType | null = null) {
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const [params, setParams] = useSearchParams();
  const filters = useMemo<CommunityFilters>(() => {
    const period = params.get('period');
    const routeType = fixedPostType || params.get('type');
    const postType = isPostType(routeType) ? routeType : 'all';
    return {
      sort: params.get('sort') === 'trending' || period ? 'trending' : 'latest',
      period: period === 'month' || period === 'year' ? period : 'week',
      postType,
      officialTag: String(params.get('category') || '').trim(),
      search: String(params.get('search') || '').trim()
    };
  }, [fixedPostType, params]);
  const [searchDraft, setSearchDraft] = useState(filters.search);

  useEffect(() => setSearchDraft(filters.search), [filters.search]);

  const query = useInfiniteQuery({
    queryKey: ['community-posts', actorId, filters],
    queryFn: ({ pageParam }) => listCommunityPosts(filters, pageParam),
    enabled: Boolean(actor),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor || undefined
  });

  const posts = [...new Map((query.data?.pages.flatMap(page => page.items) || [])
    .map(post => [post.id, post])).values()];
  const categories = query.data?.pages[0]?.facets?.officialTags || [];
  const periodValue = filters.sort === 'latest' ? 'latest' : filters.period;

  function setParam(name: 'category' | 'type', value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  }

  function setPeriod(value: string) {
    const next = new URLSearchParams(params);
    if (value === 'latest') {
      next.delete('period');
      next.delete('sort');
    } else {
      next.set('period', value);
      next.set('sort', 'trending');
    }
    setParams(next, { replace: true });
  }

  function submitSearch() {
    const next = new URLSearchParams(params);
    const value = searchDraft.trim();
    if (value) next.set('search', value);
    else next.delete('search');
    setParams(next, { replace: true });
  }

  function clearSearch() {
    setSearchDraft('');
    const next = new URLSearchParams(params);
    next.delete('search');
    setParams(next, { replace: true });
  }

  function resetFilters() {
    setSearchDraft('');
    setParams({}, { replace: true });
  }

  return {
    actor,
    actorId,
    filters,
    periodValue,
    searchDraft,
    setSearchDraft,
    setParam,
    setPeriod,
    submitSearch,
    clearSearch,
    resetFilters,
    posts,
    categories,
    query
  };
}

function isPostType(value: string | null): value is CommunityFilters['postType'] {
  return value === 'all'
    || value === 'image'
    || value === 'video'
    || value === 'template'
    || value === 'comparison'
    || value === 'collection';
}

export function formatDiscoveryCategory(value: string) {
  return value
    .replace(/^[a-z0-9_-]+[.:/]/i, '')
    .replace(/[._/-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
    .trim();
}
