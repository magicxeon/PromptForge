import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationEntryRoute } from './AuthenticationEntryRoute';
import { useActor } from '../../../lib/auth/ActorProvider';
import { beginIdentityResolution, publishIdentity } from '../../../lib/auth/actorStore';
import { getSocialLoginResult, startSocialLogin, requestSocialEmail, completeRegistration } from '../authenticationApi';
import { redirectToSocialProvider } from '../socialNavigation';
import type { AuthConfig } from '../../../lib/auth/actorSchemas';

vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: vi.fn() }));
vi.mock('../socialNavigation', () => ({ redirectToSocialProvider: vi.fn() }));
vi.mock('../authenticationApi', () => ({ requestRegistration: vi.fn(), verifyRegistration: vi.fn(), completeRegistration: vi.fn(),
  requestPasswordLogin: vi.fn(), requestLoginCode: vi.fn(), verifyLoginCode: vi.fn(), acceptEnrollmentIntent: vi.fn(),
  getSocialLoginResult: vi.fn(), startSocialLogin: vi.fn(), requestSocialEmail: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const config: AuthConfig = { contractVersion: 1, authMode: 'session', methods: { password: true, emailOtp: true, google: true, facebook: true },
  csrfToken: 'fixture', policy: { otpDigits: 6, otpExpiresSeconds: 300, resendSeconds: 60, passwordMinLength: 15, passwordMaxLength: 128 },
  legal: { termsVersion: 'terms-v1', privacyVersion: 'privacy-v1' } };
function state(activeConfig = config) {
  return { actor: null, config: activeConfig, identityScope: 'session:guest', mockUsers: [], mockSwitcherEnabled: false,
    isLoading: false, error: null, switchActor: vi.fn(), refresh: vi.fn(async () => {
      const epoch = beginIdentityResolution(); publishIdentity(epoch, { actorId: 'owner', authMode: 'session', csrfToken: 'rotated' });
    }) };
}
function tree(route: string, client: QueryClient) {
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}><Routes>
    <Route path="/create/playground" element={<p>Confirmed workspace</p>} />
    <Route path="*" element={<AuthenticationEntryRoute />} />
  </Routes></MemoryRouter></QueryClientProvider>;
}
function mount(route = '/auth/callback?provider=google') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(tree(route, client)); return { ...view, update: () => view.rerender(tree(route, client)) };
}
describe('server-bound social entry and callback', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
    const epoch = beginIdentityResolution(); publishIdentity(epoch, { actorId: '', authMode: 'session', csrfToken: 'fixture' });
    vi.mocked(useActor).mockReturnValue(state());
    vi.mocked(getSocialLoginResult).mockResolvedValue({ contractVersion: 1, nextAction: 'authenticated', returnPath: '/create/playground', rememberDevice: false });
    vi.mocked(startSocialLogin).mockResolvedValue({ contractVersion: 1, authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=fixture', operationId: 'social_1', expiresAt: new Date(Date.now() + 300000).toISOString() });
    vi.mocked(requestSocialEmail).mockResolvedValue({ contractVersion: 1, challengeId: 'social_email_1', expiresAt: new Date(Date.now() + 300000).toISOString(), resendAt: new Date(Date.now() + 60000).toISOString() });
  });
  afterEach(() => { vi.useRealTimers(); });
  it('confirms actual session before returning to the recorded workspace without starting OAuth again', async () => {
    const actor = state(); vi.mocked(useActor).mockReturnValue(actor); mount();
    await screen.findByText('Confirmed workspace');
    expect(getSocialLoginResult).toHaveBeenCalledWith('google', expect.any(AbortSignal));
    expect(actor.refresh).toHaveBeenCalledTimes(1); expect(startSocialLogin).not.toHaveBeenCalled();
  });
  it('rejects caller-supplied callback claims without lookup or workspace access', () => {
    mount('/auth/callback?provider=google&authenticated=true&contextId=foreign');
    expect(screen.getByText('social.failed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'social.backToLogin' })).toHaveAttribute('href', '/login');
    expect(getSocialLoginResult).not.toHaveBeenCalled(); expect(screen.queryByText('Confirmed workspace')).not.toBeInTheDocument();
  });
  it('uses verified social registration without a challenge and still requires explicit current consent', async () => {
    vi.mocked(useActor).mockReturnValue(state({ ...config, methods: { password: false, emailOtp: false, google: true, facebook: false } }));
    vi.mocked(getSocialLoginResult).mockResolvedValue({ contractVersion: 1, nextAction: 'complete_registration', contextId: 'registration_1', returnPath: '/create/playground', rememberDevice: true });
    vi.mocked(completeRegistration).mockResolvedValue({ contractVersion: 1, nextAction: 'authenticated', returnPath: '/create/playground' });
    mount(); await screen.findByLabelText('form.name');
    expect(screen.queryByLabelText('form.code')).not.toBeInTheDocument();
    expect(screen.getByText('social.passwordlessGuidance')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'form.createAccount' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('form.name'), { target: { value: 'Creator' } });
    fireEvent.click(screen.getByLabelText('form.acceptTerms')); fireEvent.click(screen.getByRole('button', { name: 'form.createAccount' }));
    await screen.findByText('Confirmed workspace');
    expect(completeRegistration).toHaveBeenCalledWith({ displayName: 'Creator', termsAccepted: true, termsVersion: 'terms-v1', privacyVersion: 'privacy-v1' }, expect.any(AbortSignal));
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  });
  it('asks for application email only after Facebook result then enters ordinary OTP verification', async () => {
    vi.mocked(getSocialLoginResult).mockResolvedValue({ contractVersion: 1, nextAction: 'verify_email', returnPath: '/create/playground', rememberDevice: true });
    mount('/auth/callback?provider=facebook'); await screen.findByText('social.emailExplanation');
    fireEvent.change(screen.getByLabelText('form.email'), { target: { value: 'creator@example.invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'form.sendCode' }));
    await screen.findByLabelText('form.code');
    expect(requestSocialEmail).toHaveBeenCalledWith('facebook', 'creator@example.invalid', expect.any(String), expect.any(AbortSignal));
    expect(completeRegistration).not.toHaveBeenCalled(); expect(startSocialLogin).not.toHaveBeenCalled();
  });
  it('retries only callback lookup after uncertainty and never restarts provider exchange', async () => {
    vi.mocked(getSocialLoginResult).mockRejectedValueOnce(new Error('connection lost'));
    mount(); await screen.findByRole('alert');
    let resolve!: (value: Awaited<ReturnType<typeof getSocialLoginResult>>) => void;
    vi.mocked(getSocialLoginResult).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    fireEvent.click(screen.getByRole('button', { name: 'auth.retry' }));
    await screen.findByText('social.checking');
    expect(screen.queryByRole('button', { name: 'auth.retry' })).not.toBeInTheDocument();
    expect(getSocialLoginResult).toHaveBeenCalledTimes(2);
    await act(async () => { resolve({ contractVersion: 1, nextAction: 'authenticated', returnPath: '/create/playground', rememberDevice: false }); });
    await screen.findByText('Confirmed workspace');
    expect(getSocialLoginResult).toHaveBeenCalledTimes(2); expect(startSocialLogin).not.toHaveBeenCalled();
  });
  it('ends an unresponsive callback lookup after ten seconds with safe exits', async () => {
    vi.useFakeTimers(); vi.mocked(getSocialLoginResult).mockImplementation(() => new Promise(() => {}));
    mount(); expect(screen.getByText('social.checking')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(10100); });
    expect(screen.queryByText('social.checking')).not.toBeInTheDocument();
    expect(screen.getByText('social.failed')).toBeInTheDocument(); expect(startSocialLogin).not.toHaveBeenCalled();
  });
  it('renders social-only login with remember off and no required email', async () => {
    vi.mocked(useActor).mockReturnValue(state({ ...config, methods: { password: false, emailOtp: false, google: true, facebook: false } }));
    mount('/login?returnTo=%2Fcreate%2Fplayground');
    expect(screen.queryByLabelText('form.email')).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'social.facebook' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('form.remember')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'social.google' }));
    await waitFor(() => expect(redirectToSocialProvider).toHaveBeenCalledTimes(1));
    expect(startSocialLogin).toHaveBeenCalledWith('google', false, '/create/playground', expect.any(AbortSignal));
  });
  it('blocks other methods while starting and discards a late redirect after method configuration changes', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof startSocialLogin>>) => void;
    vi.mocked(startSocialLogin).mockImplementation(() => new Promise(done => { resolve = done; }));
    const view = mount('/login'); fireEvent.click(screen.getByRole('button', { name: 'social.google' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'social.facebook' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'form.pending' })).toBeDisabled();
    vi.mocked(useActor).mockReturnValue(state({ ...config, methods: { ...config.methods, google: false } })); view.update();
    await act(async () => { resolve({ contractVersion: 1, authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=fixture', operationId: 'social_1', expiresAt: new Date(Date.now() + 300000).toISOString() }); });
    expect(redirectToSocialProvider).not.toHaveBeenCalled(); expect(startSocialLogin).toHaveBeenCalledTimes(1);
  });
});
