import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { expect, it, vi } from 'vitest';
import { useUserPreferences, userPreferencesKey } from './userPreferences';
import { beginIdentityResolution, publishIdentity } from './actorStore';
import { apiRequest } from '../api/apiClient';

vi.mock('../api/apiClient', () => ({ apiRequest: vi.fn() }));

it('does not publish a late preference result into another mode with an equal account ID', async () => {
  publishIdentity(beginIdentityResolution(), { actorId: 'same-owner', authMode: 'session', csrfToken: 'fixture-csrf' });
  vi.mocked(apiRequest).mockResolvedValue({ confirmCreditUsage: true });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useUserPreferences('same-owner'), { wrapper });
  await waitFor(() => expect(result.current.data).toEqual({ confirmCreditUsage: true }));
  let release!: () => void;
  const cancel = vi.spyOn(client, 'cancelQueries').mockResolvedValueOnce(undefined)
    .mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
  const pending = result.current.save(false);
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  await waitFor(() => expect(cancel).toHaveBeenCalledTimes(2));
  await act(async () => {
    publishIdentity(beginIdentityResolution(), { actorId: 'same-owner', authMode: 'development_bypass', csrfToken: 'new-fixture-csrf' });
    release();
  });
  await rejected;
  expect(client.getQueryData(userPreferencesKey('same-owner'))).toBeUndefined();
});
