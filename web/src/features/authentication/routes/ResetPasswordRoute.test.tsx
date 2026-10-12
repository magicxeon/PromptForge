import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationEntryRoute } from './AuthenticationEntryRoute';
import { useActor } from '../../../lib/auth/ActorProvider';
import { commitPasswordReset, getAuthenticationOperation, preparePasswordReset, requestPasswordReset, verifyPasswordReset } from '../authenticationApi';
import type { AuthConfig } from '../../../lib/auth/actorSchemas';

vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: vi.fn() }));
vi.mock('../authenticationApi', () => ({ requestRegistration: vi.fn(), verifyRegistration: vi.fn(), completeRegistration: vi.fn(),
  requestPasswordLogin: vi.fn(), requestLoginCode: vi.fn(), verifyLoginCode: vi.fn(), acceptEnrollmentIntent: vi.fn(),
  requestPasswordReset: vi.fn(), verifyPasswordReset: vi.fn(), preparePasswordReset: vi.fn(), commitPasswordReset: vi.fn(), getAuthenticationOperation: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const config: AuthConfig = { contractVersion: 1, authMode: 'session', methods: { password: true, emailOtp: true, google: false, facebook: false },
  csrfToken: 'fixture', policy: { otpDigits: 6, otpExpiresSeconds: 300, resendSeconds: 60, passwordMinLength: 15, passwordMaxLength: 128 },
  legal: { termsVersion: 'terms-v1', privacyVersion: 'privacy-v1' } };
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/reset-password?returnTo=%2Fcreate%2Fplayground&operationId=foreign']}><Routes>
    <Route path="/create/playground" element={<p>Private workspace</p>} />
    <Route path="*" element={<AuthenticationEntryRoute />} />
  </Routes></MemoryRouter></QueryClientProvider>);
}
async function passwordPhase() {
  fireEvent.change(screen.getByLabelText('form.email'), { target: { value: 'member@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'form.sendCode' }));
  await vi.waitFor(() => expect(screen.getByLabelText('form.code')).not.toBeDisabled());
  fireEvent.change(screen.getByLabelText('form.code'), { target: { value: '001234' } });
  fireEvent.click(screen.getByRole('button', { name: 'form.verify' }));
  await vi.waitFor(() => expect(screen.getByLabelText('form.password')).not.toBeDisabled());
}
function passwords(confirmation = 'new private password') {
  fireEvent.change(screen.getByLabelText('form.password'), { target: { value: 'new private password' } });
  fireEvent.change(screen.getByLabelText('form.confirmPassword'), { target: { value: confirmation } });
}
describe('purpose-bound reset and bounded outcome reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
    vi.mocked(useActor).mockReturnValue({ actor: null, config, identityScope: 'session:guest', mockUsers: [], mockSwitcherEnabled: false,
      isLoading: false, error: null, refresh: vi.fn(async () => undefined), switchActor: vi.fn() });
    vi.mocked(requestPasswordReset).mockResolvedValue({ contractVersion: 1, challengeId: 'reset_1', expiresAt: new Date(Date.now() + 300000).toISOString(), resendAt: new Date(Date.now() + 60000).toISOString() });
    vi.mocked(verifyPasswordReset).mockResolvedValue({ contractVersion: 1, nextAction: 'reset_password', contextId: 'reset_context' });
    vi.mocked(preparePasswordReset).mockResolvedValue({ contractVersion: 1, operationId: 'operation_1', expiresAt: new Date(Date.now() + 300000).toISOString() });
    vi.mocked(commitPasswordReset).mockResolvedValue({ contractVersion: 1, operationId: 'operation_1', status: 'succeeded', nextAction: 'sign_in' });
    vi.mocked(getAuthenticationOperation).mockResolvedValue({ contractVersion: 1, operationId: 'operation_1', status: 'pending', nextAction: null });
  });
  afterEach(() => { vi.useRealTimers(); });
  it('prepares and commits one exact password payload/key, then offers normal login without authenticating', async () => {
    mount(); expect(getAuthenticationOperation).not.toHaveBeenCalled(); await passwordPhase(); passwords();
    fireEvent.click(screen.getByRole('button', { name: 'reset.save' }));
    await screen.findByText('reset.success');
    expect(requestPasswordReset).toHaveBeenCalledWith('member@example.invalid', expect.any(String), expect.any(AbortSignal));
    expect(verifyPasswordReset).toHaveBeenCalledWith('reset_1', '001234', expect.any(AbortSignal));
    const preparedKey = vi.mocked(preparePasswordReset).mock.calls[0]![2];
    expect(commitPasswordReset).toHaveBeenCalledWith('operation_1', 'new private password', 'new private password', preparedKey, expect.any(AbortSignal));
    expect(commitPasswordReset).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Private workspace')).not.toBeInTheDocument();
    expect(vi.mocked(useActor).mock.results.at(-1)?.value.refresh).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  });
  it('keeps generated passwords on local mismatch without preparing an operation', async () => {
    mount(); await passwordPhase(); passwords('mismatch');
    fireEvent.click(screen.getByRole('button', { name: 'reset.save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('form.passwordInvalid');
    expect(screen.getByLabelText('form.password')).toHaveValue('new private password');
    expect(preparePasswordReset).not.toHaveBeenCalled();
  });
  it('renders the same neutral exit for unavailable reset without claiming credential presence', async () => {
    vi.mocked(verifyPasswordReset).mockResolvedValue({ contractVersion: 1, nextAction: 'unavailable' });
    mount();
    fireEvent.change(screen.getByLabelText('form.email'), { target: { value: 'member@example.invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'form.sendCode' }));
    fireEvent.change(await screen.findByLabelText('form.code'), { target: { value: '001234' } });
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'form.verify' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'form.verify' }));
    await screen.findByText('reset.neutralHelp');
    expect(screen.queryByLabelText('form.password')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'form.useCode' })).toHaveAttribute('href', '/forgot-password?returnTo=%2Fcreate%2Fplayground');
    expect(preparePasswordReset).not.toHaveBeenCalled();
  });
  it('clears rejected secrets and keeps reset context available for correction before commit', async () => {
    vi.mocked(preparePasswordReset).mockRejectedValue(new Error('policy denied'));
    mount(); await passwordPhase(); passwords(); fireEvent.click(screen.getByRole('button', { name: 'reset.save' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('form.password')).toHaveValue(''); expect(screen.getByLabelText('form.confirmPassword')).toHaveValue('');
    expect(commitPasswordReset).not.toHaveBeenCalled();
    expect(getAuthenticationOperation).not.toHaveBeenCalled();
  });
  it('reconciles lost commit success using receipt lookup and never replays the password change', async () => {
    vi.mocked(commitPasswordReset).mockRejectedValue(new Error('connection lost'));
    vi.mocked(getAuthenticationOperation).mockResolvedValue({ contractVersion: 1, operationId: 'operation_1', status: 'succeeded', nextAction: 'sign_in' });
    mount(); await passwordPhase(); passwords(); fireEvent.click(screen.getByRole('button', { name: 'reset.save' }));
    await screen.findByText('reset.success');
    expect(getAuthenticationOperation).toHaveBeenCalledWith('operation_1', expect.any(AbortSignal));
    expect(commitPasswordReset).toHaveBeenCalledTimes(1); expect(preparePasswordReset).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Private workspace')).not.toBeInTheDocument();
  });
  it('ends pending reconciliation after ten attempts without guessing success or resubmitting', async () => {
    vi.useFakeTimers(); vi.mocked(commitPasswordReset).mockRejectedValue(new Error('connection lost'));
    const view = mount(); await passwordPhase(); passwords(); fireEvent.click(screen.getByRole('button', { name: 'reset.save' }));
    for (let index = 0; index < 12; index += 1) await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(getAuthenticationOperation).toHaveBeenCalledTimes(10);
    expect(screen.getByText('reset.unknown')).toBeInTheDocument();
    expect(screen.queryByText('reset.success')).not.toBeInTheDocument(); expect(commitPasswordReset).toHaveBeenCalledTimes(1);
    view.unmount(); await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(getAuthenticationOperation).toHaveBeenCalledTimes(10);
  });
  it('ends reconciliation at original expiry before ten attempts without replaying commit', async () => {
    vi.useFakeTimers(); vi.mocked(commitPasswordReset).mockRejectedValue(new Error('connection lost'));
    vi.mocked(preparePasswordReset).mockImplementation(async () => ({ contractVersion: 1, operationId: 'operation_1', expiresAt: new Date(Date.now() + 1000).toISOString() }));
    const view = mount(); await passwordPhase(); passwords(); fireEvent.click(screen.getByRole('button', { name: 'reset.save' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(screen.getByText('reset.checking')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(screen.getByText('reset.unknown')).toBeInTheDocument();
    expect(getAuthenticationOperation).toHaveBeenCalledTimes(1);
    expect(commitPasswordReset).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('reset.success')).not.toBeInTheDocument();
    view.unmount(); await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(getAuthenticationOperation).toHaveBeenCalledTimes(1);
  });
});
