import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationEntryRoute } from './AuthenticationEntryRoute';
import { useActor } from '../../../lib/auth/ActorProvider';
import { beginIdentityResolution, publishIdentity } from '../../../lib/auth/actorStore';
import { ApiError } from '../../../lib/api/apiError';
import { acceptEnrollmentIntent, requestLoginCode, requestPasswordLogin, verifyLoginCode, completeRegistration } from '../authenticationApi';
import type { AuthConfig } from '../../../lib/auth/actorSchemas';

vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: vi.fn() }));
vi.mock('../authenticationApi', () => ({ requestRegistration: vi.fn(), verifyRegistration: vi.fn(), completeRegistration: vi.fn(), requestPasswordLogin: vi.fn(), requestLoginCode: vi.fn(), verifyLoginCode: vi.fn(), acceptEnrollmentIntent: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const config: AuthConfig = {
  contractVersion: 1, authMode: 'session', methods: { password: true, emailOtp: true, google: false, facebook: false },
  csrfToken: 'fixture', policy: { otpDigits: 6, otpExpiresSeconds: 300, resendSeconds: 60, passwordMinLength: 15, passwordMaxLength: 128 },
  legal: { termsVersion: 'terms-v1', privacyVersion: 'privacy-v1' }
};
function actorState() {
  return { actor: null, config, identityScope: 'session:guest', mockUsers: [], mockSwitcherEnabled: false,
    isLoading: false, error: null, switchActor: vi.fn(), refresh: vi.fn(async () => {
      const epoch = beginIdentityResolution(); publishIdentity(epoch, { actorId: 'owner', authMode: 'session', csrfToken: 'rotated' });
    }) };
}
function mount() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/login?returnTo=%2Fcreate%2Fplayground']}><Routes>
    <Route path="/create/playground" element={<p>Confirmed workspace</p>} />
    <Route path="*" element={<AuthenticationEntryRoute />} />
  </Routes></MemoryRouter></QueryClientProvider>);
}
async function sendCode() {
  fireEvent.change(screen.getByLabelText('form.email'), { target: { value: 'member@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'form.useCode' }));
  const code = await screen.findByLabelText('form.code');
  await waitFor(() => expect(code).not.toBeDisabled());
  fireEvent.change(code, { target: { value: '001234' } });
  fireEvent.click(screen.getByRole('button', { name: 'form.verify' }));
}
describe('password and original-browser code login', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
    const epoch = beginIdentityResolution(); publishIdentity(epoch, { actorId: '', authMode: 'session', csrfToken: 'fixture' });
    vi.mocked(useActor).mockReturnValue(actorState());
    vi.mocked(requestPasswordLogin).mockResolvedValue({ contractVersion: 1, nextAction: 'authenticated', returnPath: '/create/playground' });
    vi.mocked(requestLoginCode).mockResolvedValue({ contractVersion: 1, challengeId: 'login_1', expiresAt: new Date(Date.now() + 300000).toISOString(), resendAt: new Date(Date.now() + 60000).toISOString() });
    vi.mocked(verifyLoginCode).mockResolvedValue({ contractVersion: 1, nextAction: 'authenticated', returnPath: '/create/playground' });
    vi.mocked(acceptEnrollmentIntent).mockResolvedValue({ contractVersion: 1, nextAction: 'complete_registration', contextId: 'new_context' });
  });
  it('submits password once, defaults remember off and waits for confirmed server identity', async () => {
    mount();
    expect(screen.getByLabelText('form.remember')).not.toBeChecked();
    fireEvent.change(screen.getByLabelText('form.email'), { target: { value: 'member@example.invalid' } });
    fireEvent.change(screen.getByLabelText('form.password'), { target: { value: 'private login password' } });
    const button = screen.getByRole('button', { name: 'auth.signIn' });
    fireEvent.click(button); fireEvent.click(button);
    await screen.findByText('Confirmed workspace');
    expect(requestPasswordLogin).toHaveBeenCalledTimes(1);
    expect(requestPasswordLogin).toHaveBeenCalledWith('member@example.invalid', 'private login password', false, '/create/playground', expect.any(AbortSignal));
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  });
  it('clears a rejected password but preserves email and never refreshes identity on generic denial', async () => {
    const state = actorState(); vi.mocked(useActor).mockReturnValue(state);
    vi.mocked(requestPasswordLogin).mockRejectedValue(new ApiError({ status: 401, code: 'auth_invalid_credentials', message: 'denied' }));
    mount();
    fireEvent.change(screen.getByLabelText('form.email'), { target: { value: 'member@example.invalid' } });
    fireEvent.change(screen.getByLabelText('form.password'), { target: { value: 'private login password' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.signIn' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('form.credentialsRejected');
    expect(screen.getByLabelText('form.email')).toHaveValue('member@example.invalid');
    expect(screen.getByLabelText('form.password')).toHaveValue('');
    expect(state.refresh).not.toHaveBeenCalled();
  });
  it('uses code without a password and logs in only after original-flow verification', async () => {
    mount(); await sendCode(); await screen.findByText('Confirmed workspace');
    expect(requestPasswordLogin).not.toHaveBeenCalled();
    expect(requestLoginCode).toHaveBeenCalledWith('member@example.invalid', false, '/create/playground', expect.any(String), expect.any(AbortSignal));
    expect(verifyLoginCode).toHaveBeenCalledWith('login_1', '001234', expect.any(AbortSignal));
    expect(acceptEnrollmentIntent).not.toHaveBeenCalled();
  });
  it('requires a separate explicit create-account action for an unknown verified email', async () => {
    let resolveIntent!: (result: { contractVersion: 1; nextAction: 'complete_registration'; contextId: string }) => void;
    vi.mocked(acceptEnrollmentIntent).mockReturnValue(new Promise(done => { resolveIntent = done; }));
    const state = actorState(); vi.mocked(useActor).mockReturnValue(state);
    vi.mocked(verifyLoginCode).mockResolvedValue({ contractVersion: 1, nextAction: 'offer_registration', contextId: 'login_context' });
    mount(); await sendCode();
    const create = await screen.findByRole('button', { name: 'form.createAccount' });
    await waitFor(() => expect(create).not.toBeDisabled());
    expect(screen.getByRole('heading', { name: 'form.createAccount' })).toHaveFocus();
    expect(acceptEnrollmentIntent).not.toHaveBeenCalled(); expect(state.refresh).not.toHaveBeenCalled();
    fireEvent.click(create);
    await waitFor(() => expect(create).toHaveAttribute('data-loading', 'true'));
    expect(create).toBeDisabled();
    resolveIntent({ contractVersion: 1, nextAction: 'complete_registration', contextId: 'new_context' });
    await screen.findByLabelText('form.name');
    expect(acceptEnrollmentIntent).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(screen.getByLabelText('form.acceptTerms')).not.toBeChecked();
    expect(completeRegistration).not.toHaveBeenCalled();
    expect(screen.queryByText('Confirmed workspace')).not.toBeInTheDocument();
  });
  it('does not navigate or publish identity when an in-flight form is unmounted', async () => {
    let resolve!: (result: { contractVersion: 1; nextAction: 'authenticated'; returnPath: string }) => void;
    vi.mocked(requestPasswordLogin).mockReturnValue(new Promise(done => { resolve = done; }));
    const state = actorState(); vi.mocked(useActor).mockReturnValue(state);
    const view = mount();
    fireEvent.change(screen.getByLabelText('form.email'), { target: { value: 'member@example.invalid' } });
    fireEvent.change(screen.getByLabelText('form.password'), { target: { value: 'private login password' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.signIn' }));
    await waitFor(() => expect(requestPasswordLogin).toHaveBeenCalledTimes(1));
    const signal = vi.mocked(requestPasswordLogin).mock.calls[0]![4];
    view.unmount(); expect(signal?.aborted).toBe(true);
    resolve({ contractVersion: 1, nextAction: 'authenticated', returnPath: '/create/playground' });
    await Promise.resolve(); expect(state.refresh).not.toHaveBeenCalled();
  });
  it('does not enter the workspace if session confirmation remains guest', async () => {
    const state = actorState(); state.refresh.mockImplementation(async () => undefined); vi.mocked(useActor).mockReturnValue(state);
    mount();
    fireEvent.change(screen.getByLabelText('form.email'), { target: { value: 'member@example.invalid' } });
    fireEvent.change(screen.getByLabelText('form.password'), { target: { value: 'private login password' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.signIn' }));
    await waitFor(() => expect(state.refresh).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('alert')).toHaveTextContent('form.confirmationFailed');
    expect(screen.queryByText('Confirmed workspace')).not.toBeInTheDocument();
    expect(screen.getByLabelText('form.password')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'auth.signIn' })).not.toBeInTheDocument();
    state.refresh.mockImplementation(async () => {
      const epoch = beginIdentityResolution(); publishIdentity(epoch, { actorId: 'owner', authMode: 'session', csrfToken: 'rotated' });
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.retry' }));
    await screen.findByText('Confirmed workspace');
    expect(requestPasswordLogin).toHaveBeenCalledTimes(1);
  });
  it('forgot-password preserves email and destination while offering OTP access without password replacement', async () => {
    mount();
    fireEvent.change(screen.getByLabelText('form.email'), { target: { value: 'member@example.invalid' } });
    fireEvent.click(screen.getByRole('link', { name: 'form.forgotPassword' }));
    expect(await screen.findByText('form.recoverAccess')).toBeInTheDocument();
    expect(screen.queryByLabelText('form.password')).not.toBeInTheDocument();
    expect(screen.getByLabelText('form.email')).toHaveValue('member@example.invalid');
    fireEvent.click(screen.getByRole('button', { name: 'form.sendLoginCode' }));
    const code = await screen.findByLabelText('form.code');
    await waitFor(() => expect(code).not.toBeDisabled());
    fireEvent.change(code, { target: { value: '001234' } });
    fireEvent.click(screen.getByRole('button', { name: 'form.verify' }));
    await screen.findByText('Confirmed workspace');
    expect(requestLoginCode).toHaveBeenCalledWith('member@example.invalid', false, '/create/playground', expect.any(String), expect.any(AbortSignal));
    expect(requestPasswordLogin).not.toHaveBeenCalled();
  });
});
