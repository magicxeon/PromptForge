import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { useActor } from '../../../lib/auth/ActorProvider';
import { ApiError } from '../../../lib/api/apiError';
import { useAuthenticationFlow } from '../authenticationFlow';
import { requestLoginCode, requestPasswordLogin, startSocialLogin } from '../authenticationApi';
import { redirectToSocialProvider } from '../socialNavigation';
import { SocialLoginButtons } from '../components/SocialLoginButtons';

const inputClass = 'mt-2 min-h-10 w-full rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3 text-sm text-[var(--mpf-text)]';
export function LoginRoute({ codeOnly = false }: { codeOnly?: boolean }) {
  const { config } = useActor();
  const flow = useAuthenticationFlow();
  const { t } = useTranslation('authentication');
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [problem, setProblem] = useState('');
  const request = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const heading = useRef<HTMLHeadingElement | null>(null);
  const emailInput = useRef<HTMLInputElement | null>(null);
  const confirmedDestination = useRef(flow.returnPath);
  const passwordAvailable = !codeOnly && config?.methods.password === true;
  useEffect(() => { heading.current?.focus(); return () => { request.current?.abort(); }; }, []);
  useEffect(() => { if (!config?.methods.password) setPassword(''); }, [config?.methods.password]);
  useEffect(() => () => { request.current?.abort(); }, [config?.authMode, config?.methods.password,
    config?.methods.emailOtp, config?.methods.google, config?.methods.facebook]);
  const mutation = useMutation({
    retry: false,
    mutationFn: async (method: 'password' | 'code' | 'confirm' | 'google' | 'facebook') => {
      if (busy.current || config?.authMode !== 'session'
        || !(method === 'confirm' ? true : method === 'password' ? config.methods.password
          : method === 'code' ? config.methods.emailOtp : config.methods[method])) return;
      busy.current = true; setProblem('');
      const controller = new AbortController(); request.current = controller;
      try {
        if (method === 'confirm') {
          await flow.confirmSession(confirmedDestination.current, controller.signal);
        } else if (method === 'google' || method === 'facebook') {
          setPassword('');
          const result = await startSocialLogin(method, flow.remember, flow.returnPath, controller.signal);
          if (controller.signal.aborted) return;
          redirectToSocialProvider(method, result.authorizationUrl);
        } else if (method === 'code') {
          const result = await requestLoginCode(flow.email, flow.remember, flow.returnPath, crypto.randomUUID(), controller.signal);
          if (controller.signal.aborted) return;
          setPassword(''); flow.setProvider(null); flow.setPurpose('login'); flow.setVerified(false); flow.setOffered(false); flow.setChallenge(result);
          navigate('/auth/verify');
        } else {
          const result = await requestPasswordLogin(flow.email, password, flow.remember, flow.returnPath, controller.signal);
          if (controller.signal.aborted) return;
          confirmedDestination.current = result.returnPath;
          setPassword(''); await flow.confirmSession(result.returnPath, controller.signal);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setPassword('');
        setProblem(error instanceof ApiError && error.code === 'auth_invalid_credentials' ? 'form.credentialsRejected'
          : error instanceof ApiError && error.code === 'auth_session_unconfirmed' ? 'form.confirmationFailed'
          : error instanceof ApiError && error.code === 'auth_rate_limited' ? 'form.rateLimited' : 'form.failed');
      } finally { if (request.current === controller) busy.current = false; }
    }
  });
  function submit(event: FormEvent) { event.preventDefault(); if ((passwordAvailable || config?.methods.emailOtp) && !mutation.isPending && !busy.current && problem !== 'form.confirmationFailed') mutation.mutate(passwordAvailable ? 'password' : 'code'); }
  const emailAvailable = passwordAvailable || config?.methods.emailOtp;
  const available = config?.authMode === 'session' && (emailAvailable || !codeOnly && (config.methods.google || config.methods.facebook));
  if (!available) return <section className="mpf-section-surface mx-auto my-8 w-full max-w-lg p-6">
    <h1 className="mb-3 text-xl">{t('auth.signIn')}</h1>
    <p role="status" className="mb-5 text-sm">{t(config?.authMode === 'development_bypass' ? 'auth.bypassGuidance' : 'auth.methodsUnavailable')}</p>
    <Link to="/" className="inline-flex min-h-10 items-center text-sm underline">{t('auth.backHome')}</Link>
  </section>;
  return <section className="mpf-section-surface mx-auto my-8 w-full max-w-lg p-6" aria-labelledby="login-title">
    <h1 ref={heading} tabIndex={-1} id="login-title" className="mb-5 text-xl">{t(codeOnly ? 'form.forgotPassword' : 'auth.signIn')}</h1>
    {codeOnly ? <p className="mb-5 text-sm text-[var(--mpf-text-muted)]">{t('form.recoverAccess')}</p> : null}
    {new URLSearchParams(location.search).get('notice') === 'sign_in_existing' ? <p role="status" className="mb-5 text-sm">{t('form.existingSignIn')}</p> : null}
    <form onSubmit={submit} className="space-y-5" aria-busy={mutation.isPending}>
      <fieldset disabled={mutation.isPending} className="m-0 min-w-0 space-y-5 border-0 p-0">
        {!codeOnly && config ? <SocialLoginButtons methods={config.methods} disabled={mutation.isPending || problem === 'form.confirmationFailed'}
          pending={mutation.isPending && (mutation.variables === 'google' || mutation.variables === 'facebook') ? mutation.variables : undefined}
          onStart={provider => mutation.mutate(provider)} /> : null}
        {emailAvailable ? <label className="block text-sm">{t('form.email')}<input ref={emailInput} className={inputClass} type="email" autoComplete="username" required maxLength={254} value={flow.email} onChange={event => flow.setEmail(event.target.value)} /></label> : null}
        {passwordAvailable ? <>
          <label className="block text-sm">{t('form.password')}<input className={inputClass} type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={show} onChange={event => setShow(event.target.checked)} />{t('form.showPassword')}</label>
        </> : null}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={flow.remember} onChange={event => flow.setRemember(event.target.checked)} />{t('form.remember')}</label>
        {problem ? <p role="alert" className="text-sm text-[var(--theme-danger)]">{t(problem)}</p> : null}
        {problem === 'form.confirmationFailed' ? <Button type="button" variant="primary" className="w-full" loading={mutation.isPending} onClick={() => mutation.mutate('confirm')}>{t('auth.retry')}</Button>
          : emailAvailable ? <Button type="submit" variant="primary" className="w-full" loading={mutation.isPending}>{t(mutation.isPending ? 'form.pending' : passwordAvailable ? 'auth.signIn' : 'form.sendLoginCode')}</Button> : null}
        {problem !== 'form.confirmationFailed' && passwordAvailable && config?.methods.emailOtp ? <Button type="button" className="w-full" onClick={() => {
          if (emailInput.current?.reportValidity()) mutation.mutate('code');
        }}>{t('form.useCode')}</Button> : null}
      </fieldset>
      <p role="status" aria-live="polite" className="sr-only">{mutation.isPending ? t('form.pending') : ''}</p>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {codeOnly && config?.methods.password ? <Link to={`/reset-password?returnTo=${encodeURIComponent(flow.returnPath)}`} className="inline-flex min-h-10 items-center underline">{t('reset.title')}</Link> : null}
        <Link to={`/register?returnTo=${encodeURIComponent(flow.returnPath)}`} className="inline-flex min-h-10 items-center underline">{t('form.register')}</Link>
        {codeOnly ? <Link to={`/login?returnTo=${encodeURIComponent(flow.returnPath)}`} className="inline-flex min-h-10 items-center underline">{t('auth.signIn')}</Link>
          : passwordAvailable ? <Link to={`/forgot-password?returnTo=${encodeURIComponent(flow.returnPath)}`} className="inline-flex min-h-10 items-center underline">{t('form.forgotPassword')}</Link> : null}
      </div>
    </form>
  </section>;
}
