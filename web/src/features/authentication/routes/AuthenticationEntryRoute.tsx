import { useCallback, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useActor } from '../../../lib/auth/ActorProvider';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { RegistrationRoute } from './RegistrationRoute';
import { LoginRoute } from './LoginRoute';
import { ResetPasswordRoute } from './ResetPasswordRoute';
import { SocialCallbackRoute } from './SocialCallbackRoute';
import { AuthenticationFlowProvider } from '../authenticationFlow';
import { safeAuthenticationReturnPath } from '../components/AuthenticationGate';
import { getIdentitySnapshot } from '../../../lib/auth/actorStore';
import { ApiError } from '../../../lib/api/apiError';

// Method forms are supplied by the owning credential/enrollment tasks.
export function AuthenticationEntryRoute() {
  const { config, identityScope, isLoading, error, refresh } = useActor();
  const { t } = useTranslation('authentication');
  const location = useLocation();
  const navigate = useNavigate();
  const mounted = useRef(false), currentLocation = useRef(location.key);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { currentLocation.current = location.key; }, [location.key]);
  // Actor confirmation intentionally remounts credential forms. Keep the final
  // redirect here so their cleanup cannot cancel successful session navigation.
  const confirmSession = useCallback(async (path: string, signal: AbortSignal) => {
    if (signal.aborted) return;
    const initiatingLocation = location.key;
    await refresh();
    if (!mounted.current || currentLocation.current !== initiatingLocation) return;
    const identity = getIdentitySnapshot();
    if (identity.ready && identity.actorId && identity.authMode === 'session') navigate(safeAuthenticationReturnPath(path), { replace: true });
    else throw new ApiError({ status: 409, code: 'auth_session_unconfirmed', message: 'Session confirmation is unavailable.' });
  }, [location.key, navigate, refresh]);
  if (isLoading && !config) return <LoadingState label={t('auth.resolving')} />;
  if (error) return <ErrorState title={t('auth.unavailable')} description={t('auth.retryDescription')}
    retryLabel={t('auth.retry')} onRetry={() => void refresh()} />;
  if (/^\/(login|forgot-password|reset-password|register|auth\/(verify|complete|callback))\/?$/i.test(location.pathname)) return <>
    {isLoading && <LoadingState label={t('auth.resolving')} />}
    <div key={identityScope} hidden={isLoading} inert={isLoading || undefined} style={{ display: isLoading ? 'none' : 'contents' }}>
      <AuthenticationFlowProvider returnPath={safeAuthenticationReturnPath(new URLSearchParams(location.search).get('returnTo'))} confirmSession={confirmSession}>
        {/^\/(login|forgot-password)\/?$/i.test(location.pathname) ? <LoginRoute key={location.pathname} codeOnly={/^\/forgot-password\/?$/i.test(location.pathname)} />
          : /^\/reset-password\/?$/i.test(location.pathname) ? <ResetPasswordRoute />
            : /^\/auth\/callback\/?$/i.test(location.pathname) ? <SocialCallbackRoute /> : <RegistrationRoute />}
      </AuthenticationFlowProvider>
    </div>
  </>;
  return <section className="mpf-section-surface mx-auto my-8 w-full max-w-lg p-6" aria-labelledby="auth-entry-title">
    <h1 id="auth-entry-title" className="mb-3 text-xl">{t('auth.signIn')}</h1>
    <p role="status" className="mb-5 text-sm text-[var(--mpf-text-muted)]">{t(config?.authMode === 'development_bypass' ? 'auth.bypassGuidance' : 'auth.methodsUnavailable')}</p>
    <Link to="/" className="text-sm text-[var(--theme-primary)] underline">{t('auth.backHome')}</Link>
  </section>;
}
