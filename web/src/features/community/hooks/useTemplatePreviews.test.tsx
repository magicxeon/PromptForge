import { act, renderHook, waitFor } from '@testing-library/react';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getTemplatePreviews } from '../api/communityApi';
import { useTemplatePreviews } from './useTemplatePreviews';

const viewer = vi.hoisted(() => ({ id: 'actor-a' as string | null }));
vi.mock('../../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: viewer.id ? { userId: viewer.id } : null })
}));
vi.mock('../api/communityApi', () => ({ getTemplatePreviews: vi.fn() }));
const response = (ids: string[]) => ({ items: ids.map(templatePostId => ({ templatePostId, items: [], hasMore: false })) });
const clients: QueryClient[] = [];

beforeEach(() => {
  viewer.id = 'actor-a';
  vi.mocked(getTemplatePreviews).mockReset().mockImplementation(async ids => response(ids));
  focusManager.setFocused(false);
});
afterEach(() => {
  clients.forEach(client => client.clear());
  clients.length = 0;
  focusManager.setFocused(undefined);
});

function setup(pages: string[][]) {
  const client = new QueryClient({ defaultOptions: { queries: {
    retry: false, staleTime: 30_000, refetchOnWindowFocus: false
  } } });
  clients.push(client);
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...renderHook(({ pages }) => useTemplatePreviews(pages), { wrapper, initialProps: { pages } }) };
}

it('caps batches at 24, deduplicates roots and fetches only the appended page', async () => {
  const ids = Array.from({ length: 25 }, (_, index) => `root-${index}`);
  const view = setup([[...ids, 'root-0']]);
  await waitFor(() => expect(view.result.current.items.size).toBe(25));
  expect(getTemplatePreviews).toHaveBeenCalledTimes(2);
  expect(getTemplatePreviews).toHaveBeenNthCalledWith(1, ids.slice(0, 24));
  expect(getTemplatePreviews).toHaveBeenNthCalledWith(2, ids.slice(24));
  view.rerender({ pages: [[...ids, 'root-0'], ['next']] });
  await waitFor(() => expect(view.result.current.items.size).toBe(26));
  expect(getTemplatePreviews).toHaveBeenCalledTimes(3);
  expect(getTemplatePreviews).toHaveBeenLastCalledWith(['next']);
});

it('overrides the global focus policy only for stale previews', async () => {
  const view = setup([['root']]);
  await waitFor(() => expect(view.result.current.items.has('root')).toBe(true));
  await act(async () => { focusManager.setFocused(true); });
  expect(getTemplatePreviews).toHaveBeenCalledOnce();
  focusManager.setFocused(false);
  act(() => {
    view.client.setQueryData(['community-template-previews', 'actor-a', ['root'], 'v1'], response(['root']), {
      updatedAt: Date.now() - 31_000
    });
  });
  await act(async () => { focusManager.setFocused(true); });
  await waitFor(() => expect(getTemplatePreviews).toHaveBeenCalledTimes(2));
  expect(view.client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
});

it('invalidates only the selected actor preview namespace, preserving Detail and other actors', async () => {
  const view = setup([['root']]);
  const otherActor = ['community-template-previews', 'actor-b', ['root'], 'v1'];
  const detail = ['community-template-detail', 'actor-a', 'root', 'likes', 12];
  view.client.setQueryData(otherActor, response(['root']));
  view.client.setQueryData(detail, { template: null, items: [] });
  await waitFor(() => expect(view.result.current.items.has('root')).toBe(true));
  await act(async () => { await view.client.invalidateQueries({ queryKey: ['community-template-previews', 'actor-a'] }); });
  expect(getTemplatePreviews).toHaveBeenCalledTimes(2);
  expect(view.client.getQueryState(otherActor)?.isInvalidated).toBe(false);
  expect(view.client.getQueryState(detail)?.isInvalidated).toBe(false);
});

it('does not read without an actor or display a late previous-actor response', async () => {
  viewer.id = null;
  const view = setup([['root']]);
  expect(getTemplatePreviews).not.toHaveBeenCalled();
  let complete!: (value: ReturnType<typeof response>) => void;
  vi.mocked(getTemplatePreviews).mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
  viewer.id = 'actor-a';
  view.rerender({ pages: [['root']] });
  await waitFor(() => expect(getTemplatePreviews).toHaveBeenCalledOnce());
  viewer.id = 'actor-b';
  view.client.clear();
  view.rerender({ pages: [['root']] });
  await waitFor(() => expect(view.result.current.items.has('root')).toBe(true));
  await act(async () => { complete(response(['old-actor-only'])); });
  expect(view.result.current.items.has('old-actor-only')).toBe(false);
  expect(view.client.getQueryData(['community-template-previews', 'actor-a', ['root'], 'v1'])).toBeUndefined();
});

it('retries only failed preview batches while retaining successful families', async () => {
  vi.mocked(getTemplatePreviews).mockRejectedValueOnce(new Error('Invalid response'));
  const view = setup([['failed'], ['ready']]);
  await waitFor(() => expect(view.result.current.failed).toBe(true));
  await waitFor(() => expect(view.result.current.items.has('ready')).toBe(true));
  act(() => { view.result.current.retry(); });
  await waitFor(() => expect(view.result.current.failed).toBe(false));
  expect(view.result.current.items.size).toBe(2);
  expect(getTemplatePreviews).toHaveBeenCalledTimes(3);
  expect(getTemplatePreviews).toHaveBeenLastCalledWith(['failed']);
});
