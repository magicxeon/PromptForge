import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useGenerationJobCenter } from './useGenerationJobCenter';

const mocks = vi.hoisted(() => ({ actor: { userId: 'usr_alice' }, get: vi.fn() }));
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: mocks.actor }) }));
vi.mock('./generationJobCenterApi', () => ({ getGenerationJobCenter: mocks.get }));

describe('useGenerationJobCenter', () => {
  afterEach(() => { mocks.actor.userId = 'usr_alice'; mocks.get.mockReset(); });

  it('discovers accepted work through canonical actor invalidation while idle and isolates actor changes', async () => {
    const client = new QueryClient();
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    let activeCount = 0;
    mocks.get.mockImplementation(async () => ({ items: [], activeCount, reviewRequiredCount: 0, terminalCount: 0, polledAt: 'now' }));
    const { result, rerender, unmount } = renderHook(() => useGenerationJobCenter(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.activeCount).toBe(0);
    activeCount = 31;
    await act(() => client.invalidateQueries({ queryKey: queryKeys.generationJobCenter('usr_alice') }));
    await waitFor(() => expect(result.current.data?.activeCount).toBe(31));
    expect(mocks.get).toHaveBeenCalledTimes(2);
    activeCount = 0;
    mocks.actor.userId = 'usr_bob';
    rerender();
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data?.activeCount).toBe(0));
    unmount(); client.clear();
  });

  it('finishes bounded connection retries while preserving known active data', async () => {
    const client = new QueryClient();
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    mocks.get.mockResolvedValue({ items: [], activeCount: 1, reviewRequiredCount: 0, terminalCount: 0, polledAt: 'now' });
    const { result, unmount } = renderHook(() => useGenerationJobCenter(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    mocks.get.mockRejectedValue(new Error('offline'));
    await act(async () => { await client.invalidateQueries({ queryKey: queryKeys.generationJobCenter('usr_alice') }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data?.activeCount).toBe(1);
    expect(mocks.get).toHaveBeenCalledTimes(4);
    unmount(); client.clear();
  }, 10_000);
});
