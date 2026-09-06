import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useTemplateDetail } from './useTemplateDetail';
import { templateDetailPageSchema } from '../schemas/communitySchemas';

const mocks = vi.hoisted(() => ({ actor: null as { userId: string } | null, get: vi.fn() }));
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: mocks.actor }) }));
vi.mock('../api/communityApi', () => ({ getTemplateDetail: mocks.get }));
const page = templateDetailPageSchema.parse({ template: { id: 'root', postType: 'template', creator: {}, engagementSummary: {} }, items: [], nextCursor: 'next', hasMore: true });
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => { vi.clearAllMocks(); mocks.actor = null; mocks.get.mockResolvedValue(page); });

it('waits for actor context and uses bounded preview size', async () => {
  const hook = renderHook(() => useTemplateDetail('root', 'likes', 4), { wrapper: wrapper() });
  expect(mocks.get).not.toHaveBeenCalled();
  mocks.actor = { userId: 'alice' };
  hook.rerender();
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  expect(mocks.get).toHaveBeenCalledWith('root', 'likes', 4, null);
});
it('passes opaque cursors and resets pages on sorting', async () => {
  mocks.actor = { userId: 'alice' };
  const hook = renderHook(({ sort }: { sort: 'likes' | 'latest' }) => useTemplateDetail('root', sort), { initialProps: { sort: 'likes' }, wrapper: wrapper() });
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  mocks.get.mockResolvedValueOnce({ ...page, hasMore: false, nextCursor: null });
  await act(() => hook.result.current.fetchNextPage());
  expect(mocks.get).toHaveBeenLastCalledWith('root', 'likes', 12, 'next');
  hook.rerender({ sort: 'latest' });
  await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith('root', 'latest', 12, null));
});
it('does not show a previous actor response while a new actor query loads', async () => {
  mocks.actor = { userId: 'alice' };
  const hook = renderHook(() => useTemplateDetail('root'), { wrapper: wrapper() });
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  let resolve: (value: typeof page) => void = () => {};
  mocks.get.mockImplementationOnce(() => new Promise<typeof page>(done => { resolve = done; }));
  mocks.actor = { userId: 'bob' }; hook.rerender();
  expect(hook.result.current.data).toBeUndefined();
  await act(async () => resolve({ ...page, template: null }));
  await waitFor(() => expect(hook.result.current.data?.pages[0]?.template).toBeNull());
});
