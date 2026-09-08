import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { useCommunityDiscoveryPosts } from './useCommunityDiscoveryPosts';

const list = vi.hoisted(() => vi.fn());
vi.mock('../api/communityApi', () => ({ listCommunityPosts: list }));
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: 'alice' } }) }));

it('deduplicates overlapping pages by ID without removing entries or changing filters', async () => {
  list.mockResolvedValueOnce({ items: [{ id: 'a' }, { id: 'b', title: 'old' }], nextCursor: 'page2', hasMore: true })
    .mockResolvedValueOnce({ items: [{ id: 'b', title: 'updated' }, { id: 'c' }], nextCursor: null, hasMore: false });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { result } = renderHook(() => useCommunityDiscoveryPosts(), { wrapper: ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={client}><MemoryRouter initialEntries={['/?category=portrait&search=quiet']}>{children}</MemoryRouter></QueryClientProvider> });
  await waitFor(() => expect(result.current.posts).toHaveLength(2));
  await act(async () => { await result.current.query.fetchNextPage(); });
  await waitFor(() => expect(result.current.posts.map(post => post.id)).toEqual(['a', 'b', 'c']));
  expect(result.current.posts[1]?.title).toBe('updated');
  expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ officialTag: 'portrait', search: 'quiet' }), 'page2');
  expect(client.getQueryCache().getAll()[0]?.queryKey[1]).toBe('alice');
});
