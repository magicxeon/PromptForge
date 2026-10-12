import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationEntryRoute } from './AuthenticationEntryRoute';
import { useActor } from '../../../lib/auth/ActorProvider';
import { beginIdentityResolution, publishIdentity } from '../../../lib/auth/actorStore';
import { completeRegistration, requestRegistration, verifyRegistration } from '../authenticationApi';
import type { AuthConfig } from '../../../lib/auth/actorSchemas';

vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: vi.fn() }));
vi.mock('../authenticationApi', () => ({ requestRegistration: vi.fn(), verifyRegistration: vi.fn(), completeRegistration: vi.fn(), requestPasswordLogin: vi.fn(), requestLoginCode: vi.fn(), verifyLoginCode: vi.fn(), acceptEnrollmentIntent: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const config: AuthConfig = {
  contractVersion: 1, authMode: 'session', methods: { password: true, emailOtp: true, google: false, facebook: false },
  csrfToken: 'fixture', policy: { otpDigits: 6, otpExpiresSeconds: 300, resendSeconds: 60, passwordMinLength: 15, passwordMaxLength: 128 },
  legal: { termsVersion: 'terms-v1', privacyVersion: 'privacy-v1' }
};
const state = () => ({ actor: null, config, identityScope: 'session:guest', mockUsers: [], mockSwitcherEnabled: false,
  isLoading: false, error: null, switchActor: vi.fn(), refresh: vi.fn(async () => {
    const epoch = beginIdentityResolution(); publishIdentity(epoch, { actorId: 'new-owner', authMode: 'session', csrfToken: 'rotated' });
  }) });
function mount(path = '/register?returnTo=%2Fcreate%2Fplayground') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/create/playground" element={<p>Confirmed workspace</p>} />
    <Route path="*" element={<AuthenticationEntryRoute />} />
  </Routes></MemoryRouter></QueryClientProvider>);
}
async function verify() {
  fireEvent.change(screen.getByLabelText('form.email'), { target: { value: 'new@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'form.sendCode' }));
  const input = await screen.findByLabelText('form.code');
  fireEvent.change(input, { target: { value: '012345' } });
  fireEvent.click(screen.getByRole('button', { name: 'form.verify' }));
  await screen.findByLabelText('form.name');
  await waitFor(() => expect(screen.getByLabelText('form.name')).not.toBeDisabled());
}
function consent() {
  fireEvent.change(screen.getByLabelText('form.name'), { target: { value: 'New Creator' } });
  fireEvent.click(screen.getByLabelText('form.acceptTerms'));
}
describe('registration entry and original-flow completion', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
    vi.mocked(useActor).mockReturnValue(state());
    vi.mocked(requestRegistration).mockResolvedValue({ contractVersion: 1, challengeId: 'challenge_1', expiresAt: new Date(Date.now() + 300000).toISOString(), resendAt: new Date(Date.now() + 60000).toISOString() });
    vi.mocked(verifyRegistration).mockResolvedValue({ contractVersion: 1, nextAction: 'complete_registration', contextId: 'context_1' });
    vi.mocked(completeRegistration).mockResolvedValue({ contractVersion: 1, nextAction: 'authenticated', returnPath: '/create/playground' });
  });
  it('verifies leading-zero code and activates only after explicit consent without a required password', async () => {
    mount();
    expect(screen.getByLabelText('form.remember')).not.toBeChecked();
    await verify();
    expect(verifyRegistration).toHaveBeenCalledWith('challenge_1', '012345', expect.any(AbortSignal));
    expect(requestRegistration).toHaveBeenCalledWith('new@example.invalid', false, '/create/playground', expect.any(String), expect.any(AbortSignal));
    expect(screen.getByLabelText('form.acceptTerms')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'form.createAccount' })).toBeDisabled();
    consent();
    fireEvent.click(screen.getByRole('button', { name: 'form.createAccount' }));
    await screen.findByText('Confirmed workspace');
    expect(vi.mocked(completeRegistration).mock.calls[0]?.[0]).toEqual({ displayName: 'New Creator', termsAccepted: true, termsVersion: 'terms-v1', privacyVersion: 'privacy-v1' });
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  });
  it('retains optional passwords for local mismatch, then clears rejected secrets without losing the name', async () => {
    vi.mocked(completeRegistration).mockRejectedValue(new Error('rejected'));
    mount(); await verify(); consent();
    fireEvent.click(screen.getByLabelText('form.addPassword'));
    fireEvent.change(screen.getByLabelText('form.password'), { target: { value: 'a long private password' } });
    fireEvent.change(screen.getByLabelText('form.confirmPassword'), { target: { value: 'mismatch' } });
    fireEvent.click(screen.getByRole('button', { name: 'form.createAccount' }));
    expect(screen.getByRole('alert')).toHaveTextContent('form.passwordInvalid');
    expect(screen.getByLabelText('form.password')).toHaveValue('a long private password');
    expect(completeRegistration).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('form.confirmPassword'), { target: { value: 'a long private password' } });
    fireEvent.click(screen.getByRole('button', { name: 'form.createAccount' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('form.failed'));
    expect(screen.getByLabelText('form.password')).toHaveValue('');
    expect(screen.getByLabelText('form.confirmPassword')).toHaveValue('');
    expect(screen.getByLabelText('form.name')).toHaveValue('New Creator');
    expect(JSON.stringify(Object.values(localStorage))).not.toContain('private password');
  });
  it('clears a rejected code, preserves email and respects the server resend cooldown', async () => {
    vi.mocked(verifyRegistration).mockRejectedValue(new Error('invalid'));
    mount();
    fireEvent.change(screen.getByLabelText('form.email'), { target: { value: 'new@example.invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'form.sendCode' }));
    fireEvent.change(await screen.findByLabelText('form.code'), { target: { value: '001234' } });
    expect(screen.getByRole('button', { name: 'form.resendWait' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'form.verify' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('form.code')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'form.editEmail' }));
    expect(await screen.findByLabelText('form.email')).toHaveValue('new@example.invalid');
  });
  it('routes an existing-email handoff to fresh sign-in without creating local authority', async () => {
    const actorState = state(); vi.mocked(useActor).mockReturnValue(actorState);
    vi.mocked(completeRegistration).mockResolvedValue({ contractVersion: 1, nextAction: 'sign_in_existing' });
    mount(); await verify(); consent();
    fireEvent.click(screen.getByRole('button', { name: 'form.createAccount' }));
    await screen.findByRole('heading', { name: 'auth.signIn' });
    expect(screen.getByText('form.existingSignIn')).toBeInTheDocument();
    expect(actorState.refresh).not.toHaveBeenCalled();
    expect(screen.queryByText('Confirmed workspace')).not.toBeInTheDocument();
  });
  it('does not render registration controls when method/legal configuration is unavailable', () => {
    vi.mocked(useActor).mockReturnValue({ ...state(), config: { ...config, methods: { ...config.methods, emailOtp: false } } });
    mount(); expect(screen.queryByLabelText('form.email')).not.toBeInTheDocument();
    expect(requestRegistration).not.toHaveBeenCalled();
  });
  it('clears unsupported optional passwords and requires renewed consent when legal versions change', async () => {
    const view = mount(); await verify(); consent();
    fireEvent.click(screen.getByLabelText('form.addPassword'));
    fireEvent.change(screen.getByLabelText('form.password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('form.confirmPassword'), { target: { value: 'mismatch' } });
    fireEvent.click(screen.getByRole('button', { name: 'form.createAccount' }));
    expect(screen.getByRole('alert')).toHaveTextContent('form.passwordInvalid');
    vi.mocked(useActor).mockReturnValue({ ...state(), config: { ...config, methods: { ...config.methods, password: false }, legal: { ...config.legal, termsVersion: 'terms-v2' } } });
    // Preserve the same route tree while replacing the trusted config projection.
    fireEvent(window, new Event('focus'));
    view.rerender(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/auth/complete']}><Routes>
      <Route path="/create/playground" element={<p>Confirmed workspace</p>} />
      <Route path="*" element={<AuthenticationEntryRoute />} />
    </Routes></MemoryRouter></QueryClientProvider>);
    expect(screen.queryByLabelText('form.password')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('form.acceptTerms')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'form.createAccount' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText('form.acceptTerms'));
    fireEvent.click(screen.getByRole('button', { name: 'form.createAccount' }));
    await screen.findByText('Confirmed workspace');
    expect(vi.mocked(completeRegistration).mock.calls[0]?.[0]).toEqual({ displayName: 'New Creator', termsAccepted: true, termsVersion: 'terms-v2', privacyVersion: 'privacy-v1' });
  });
  it('direct verification URLs restart safely without promoting URL values into proof', () => {
    mount('/auth/verify?challengeId=foreign&code=012345');
    expect(screen.getByText('form.restartDescription')).toBeInTheDocument();
    expect(verifyRegistration).not.toHaveBeenCalled();
  });
  it('offers the published legal documents and renews consent when a document URL changes', async () => {
    vi.mocked(useActor).mockReturnValue({ ...state(), config: { ...config, legal: { ...config.legal, termsUrl: 'https://example.com/terms', privacyUrl: 'https://example.com/privacy' } } });
    const view = mount(); await verify(); consent();
    expect(screen.getByRole('link', { name: 'form.termsLink' })).toHaveAttribute('href', 'https://example.com/terms');
    expect(screen.getByRole('link', { name: 'form.privacyLink' })).toHaveAttribute('rel', 'noopener noreferrer');
    vi.mocked(useActor).mockReturnValue({ ...state(), config: { ...config, legal: { ...config.legal, termsUrl: 'https://example.com/terms-v2', privacyUrl: 'https://example.com/privacy' } } });
    view.rerender(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/auth/complete']}><Routes>
      <Route path="*" element={<AuthenticationEntryRoute />} />
    </Routes></MemoryRouter></QueryClientProvider>);
    expect(screen.getByLabelText('form.acceptTerms')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'form.createAccount' })).toBeDisabled();
    expect(completeRegistration).not.toHaveBeenCalled();
  });
  it('retries confirmation without replaying committed account activation', async () => {
    const actorState = state(); actorState.refresh.mockImplementation(async () => {
      const epoch = beginIdentityResolution(); publishIdentity(epoch, { actorId: '', authMode: 'session', csrfToken: 'fixture' });
    });
    vi.mocked(useActor).mockReturnValue(actorState);
    mount(); await verify(); consent();
    fireEvent.click(screen.getByRole('button', { name: 'form.createAccount' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('form.confirmationFailed');
    expect(screen.queryByRole('button', { name: 'form.createAccount' })).not.toBeInTheDocument();
    actorState.refresh.mockImplementation(async () => {
      const epoch = beginIdentityResolution(); publishIdentity(epoch, { actorId: 'new-owner', authMode: 'session', csrfToken: 'rotated' });
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.retry' }));
    await screen.findByText('Confirmed workspace');
    expect(completeRegistration).toHaveBeenCalledTimes(1);
    expect(verifyRegistration).toHaveBeenCalledTimes(1);
  });
});
