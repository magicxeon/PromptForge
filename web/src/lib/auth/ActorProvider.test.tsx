import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActorProvider, useActor } from './ActorProvider';
import { apiRequest } from '../api/apiClient';
import { getActiveActorId, getIdentitySnapshot } from './actorStore';
import { writeActorScopedDraft } from '../persistence/actorScopedStorage';
import { authConfigSchema } from './actorSchemas';

vi.mock('../api/apiClient', () => ({ apiRequest: vi.fn() }));

const config = (authMode: 'session' | 'development_bypass' = 'session') => ({
  contractVersion: 1 as const, authMode,
  methods: { password: false, emailOtp: false, google: false, facebook: false }, csrfToken: 'fixture-csrf',
  policy: { otpDigits: 6 as const, otpExpiresSeconds: 300, resendSeconds: 60, passwordMinLength: 15, passwordMaxLength: 128 },
  legal: { termsVersion: null, privacyVersion: null }
});
const actor = (authMode: 'session' | 'development_bypass' = 'session', userId = 'owner') => ({
  userId, username: userId, displayName: 'Fixture', role: 'user', authMode
});

function State() {
  const state = useActor();
  return <><output data-testid="actor">{state.isLoading ? 'resolving' : state.error ? 'error' : state.actor?.userId || 'guest'}</output>
    <output data-testid="mode">{state.config?.authMode || 'unresolved'}</output>
    <button onClick={() => void state.refresh()}>Refresh</button></>;
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ActorProvider><State /></ActorProvider></QueryClientProvider>);
  return client;
}

describe('server-resolved actor lifecycle', () => {
  beforeEach(() => { vi.mocked(apiRequest).mockReset(); localStorage.clear(); sessionStorage.clear(); });

  it('accepts null guests without consulting mock-user storage or listing', async () => {
    localStorage.setItem('mpf_active_mock_user_id', 'admin');
    vi.mocked(apiRequest).mockResolvedValueOnce(config()).mockResolvedValueOnce(null);
    mount();
    await waitFor(() => expect(screen.getByTestId('actor')).toHaveTextContent('guest'));
    expect(getActiveActorId()).toBe('');
    expect(vi.mocked(apiRequest).mock.calls.map(call => call[0])).toEqual(['/api/auth/config', '/api/me']);
  });

  it('gates stale actor and cached private presentation on refresh failure', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(config()).mockResolvedValueOnce(actor());
    const client = mount();
    await waitFor(() => expect(screen.getByTestId('actor')).toHaveTextContent('owner'));
    client.setQueryData(['private', 'owner'], { secret: 'old' });
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(screen.getByText('Refresh'));
    await waitFor(() => expect(screen.getByTestId('actor')).toHaveTextContent('error'));
    expect(getActiveActorId()).toBe('');
    expect(getIdentitySnapshot().csrfToken).toBe('');
    expect(client.getQueryData(['private', 'owner'])).toBeUndefined();
  });
  it('retains the confirmed actor and cache while same-owner focus revalidation suspends authority', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(config()).mockResolvedValueOnce(actor());
    const client = mount();
    await waitFor(() => expect(screen.getByTestId('actor')).toHaveTextContent('owner'));
    client.setQueryData(['private', 'owner'], { draft: 'kept' });
    let finish!: (value: unknown) => void;
    vi.mocked(apiRequest).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce(actor());
    fireEvent(window, new Event('focus'));
    await waitFor(() => expect(screen.getByTestId('actor')).toHaveTextContent('resolving'));
    expect(getActiveActorId()).toBe('');
    expect(getIdentitySnapshot().csrfToken).toBe('');
    expect(screen.getByTestId('mode')).toHaveTextContent('session');
    expect(client.getQueryData(['private', 'owner'])).toEqual({ draft: 'kept' });
    await act(async () => { finish(config()); });
    await waitFor(() => expect(screen.getByTestId('actor')).toHaveTextContent('owner'));
    expect(client.getQueryData(['private', 'owner'])).toEqual({ draft: 'kept' });
  });

  it('clears prior mode drafts and cache even when the actor ID is equal', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(config('development_bypass')).mockResolvedValueOnce(actor('development_bypass'));
    const client = mount();
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('development_bypass'));
    writeActorScopedDraft({ actorId: 'owner', feature: 'playground', schemaVersion: 1, payload: { private: 'fixture' } });
    client.setQueryData(['private', 'owner'], { old: true });
    vi.mocked(apiRequest).mockResolvedValueOnce(config()).mockResolvedValueOnce(actor());
    fireEvent.click(screen.getByText('Refresh'));
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('session'));
    expect(client.getQueryData(['private', 'owner'])).toBeUndefined();
    expect(Object.keys(localStorage).filter(key => key.startsWith('mpf.react.draft:'))).toEqual([]);
  });

  it('ignores an older refresh response arriving after the new guest result', async () => {
    let finish!: (value: unknown) => void;
    vi.mocked(apiRequest).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    mount();
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
    vi.mocked(apiRequest).mockResolvedValueOnce(config()).mockResolvedValueOnce(null);
    fireEvent.click(screen.getByText('Refresh'));
    await waitFor(() => expect(screen.getByTestId('actor')).toHaveTextContent('guest'));
    await act(async () => { finish(config('development_bypass')); });
    expect(screen.getByTestId('actor')).toHaveTextContent('guest');
    expect(screen.getByTestId('mode')).toHaveTextContent('session');
    expect(apiRequest).toHaveBeenCalledTimes(3);
  });

  it('rejects null CSRF with bypass or an enabled method', () => {
    expect(authConfigSchema.safeParse({ ...config(), csrfToken: null }).success).toBe(true);
    expect(authConfigSchema.safeParse({ ...config('development_bypass'), csrfToken: null }).success).toBe(false);
    expect(authConfigSchema.safeParse({ ...config(), csrfToken: null, methods: { ...config().methods, password: true } }).success).toBe(false);
  });
});
