import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FacebookDeletionReceiptRoute } from './FacebookDeletionReceiptRoute';
import { getFacebookDeletionReceipt } from '../authenticationApi';
import { useActor } from '../../../lib/auth/ActorProvider';
import { isPublicAuthenticationRoute } from '../components/AuthenticationGate';

vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: vi.fn() }));
vi.mock('../authenticationApi', () => ({ getFacebookDeletionReceipt: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const code = '94ac3d11-4bba-4a00-bc00-32688da82e94';
function mount(search = `?confirmation_code=${code}`) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={['/auth/facebook/data-deletion' + search]}><FacebookDeletionReceiptRoute /></MemoryRouter>
  </QueryClientProvider>);
}
describe('received-only Facebook receipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useActor).mockReturnValue({ actor: null, identityScope: 'session:guest', isLoading: false, error: null } as ReturnType<typeof useActor>);
    vi.mocked(getFacebookDeletionReceipt).mockResolvedValue({ contractVersion: 1, status: 'received' });
  });
  afterEach(() => { vi.useRealTimers(); });
  it('allows guest receipt display without login, account details or a deletion-completed claim', async () => {
    mount(); await screen.findByText('social.deletionReceived');
    expect(isPublicAuthenticationRoute('/auth/facebook/data-deletion')).toBe(true);
    expect(getFacebookDeletionReceipt).toHaveBeenCalledWith(code, expect.any(AbortSignal));
    expect(screen.queryByText(code)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'social.backToLogin' })).toHaveAttribute('href', '/login');
  });
  it('rejects malformed or added caller claims without lookup', () => {
    mount(`?confirmation_code=${code}&deleted=true`);
    expect(screen.getByRole('alert')).toHaveTextContent('social.deletionUnavailable');
    expect(getFacebookDeletionReceipt).not.toHaveBeenCalled();
  });
  it('ends an unavailable lookup after ten seconds and removes processing', async () => {
    vi.useFakeTimers(); vi.mocked(getFacebookDeletionReceipt).mockImplementation(() => new Promise(() => {}));
    mount(); expect(screen.getByText('social.deletionChecking')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(10100); });
    expect(screen.queryByText('social.deletionChecking')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('social.deletionUnavailable');
    expect(getFacebookDeletionReceipt).toHaveBeenCalledTimes(1);
  });
});
