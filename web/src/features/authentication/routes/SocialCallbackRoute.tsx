import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { useActor } from '../../../lib/auth/ActorProvider';
import { useAuthenticationFlow } from '../authenticationFlow';
import { getSocialLoginResult, requestSocialEmail, type SocialProvider } from '../authenticationApi';
import { safeAuthenticationReturnPath } from '../components/AuthenticationGate';

export function SocialCallbackRoute() {
  const { config, identityScope } = useActor(), flow = useAuthenticationFlow();
  const { t } = useTranslation('authentication'), location = useLocation(), navigate = useNavigate();
  const client = useQueryClient();
  const params = new URLSearchParams(location.search), hints = params.getAll('provider');
  const provider: SocialProvider | null = hints.length === 1 && [...params.keys()].every(key => key === 'provider')
    && (hints[0] === 'google' || hints[0] === 'facebook') ? hints[0] : null;
  const available = config?.authMode === 'session' && provider && config.methods[provider];
  const [problem, setProblem] = useState(false), [confirming, setConfirming] = useState(false);
  const [emailInterrupted, setEmailInterrupted] = useState(false);
  const heading = useRef<HTMLHeadingElement | null>(null), request = useRef<AbortController | null>(null);
  const busy = useRef(false), emailKey = useRef(crypto.randomUUID());
  const { setProvider, setPurpose, setChallenge, setVerified, setOffered, setRemember, setReturnPath, confirmSession } = flow;
  const result = useQuery({ queryKey: ['authentication-social-result', identityScope, provider],
    enabled: Boolean(available), retry: false, gcTime: 0, refetchOnWindowFocus: false, refetchOnReconnect: false,
    queryFn: async ({ signal }) => {
      if (!provider) throw new Error('Provider is unavailable.');
      const controller = new AbortController();
      const abort = () => controller.abort(); signal.addEventListener('abort', abort, { once: true });
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([getSocialLoginResult(provider, controller.signal), new Promise<never>((_, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new Error('Social result lookup ended.')); }, 10000);
        })]);
      } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
    }
  });
  useEffect(() => { heading.current?.focus(); }, [result.data?.nextAction, result.isError]);
  useEffect(() => () => { request.current?.abort(); }, []);
  useEffect(() => {
    if (!available) {
      request.current?.abort();
      void client.cancelQueries({ queryKey: ['authentication-social-result', identityScope, provider], exact: true });
    }
  }, [available, client, identityScope, provider]);
  useEffect(() => {
    if (!available || !provider || !result.data) return;
    const outcome = result.data;
    setRemember(outcome.rememberDevice); setReturnPath(safeAuthenticationReturnPath(outcome.returnPath));
    if (outcome.nextAction === 'complete_registration') {
      if (!outcome.contextId) { setProblem(true); return; }
      setProvider(provider); setPurpose('registration'); setChallenge(null); setVerified(true); setOffered(false);
      navigate('/auth/complete', { replace: true });
    } else if (outcome.nextAction === 'sign_in_existing') {
      setVerified(false); setChallenge(null); setProvider(null);
      navigate(`/login?notice=sign_in_existing&returnTo=${encodeURIComponent(outcome.returnPath)}`, { replace: true });
    } else if (outcome.nextAction === 'authenticated') {
      const controller = new AbortController(); request.current = controller;
      setConfirming(true);
      void confirmSession(outcome.returnPath, controller.signal).catch(() => {
        if (!controller.signal.aborted) { setConfirming(false); setProblem(true); }
      });
      return () => controller.abort();
    }
  }, [available, confirmSession, navigate, provider, result.data, setChallenge, setOffered, setProvider, setPurpose, setRemember, setReturnPath, setVerified]);
  const email = useMutation({ retry: false, mutationFn: async () => {
    if (!available || !provider || busy.current || result.data?.nextAction !== 'verify_email' || !config?.methods.emailOtp) return;
    busy.current = true; setProblem(false);
    const controller = new AbortController(); request.current = controller;
    try {
      const challenge = await requestSocialEmail(provider, flow.email, emailKey.current, controller.signal);
      if (controller.signal.aborted) return;
      setProvider(provider); setPurpose('registration'); setChallenge(challenge); setVerified(false); setOffered(false);
      navigate('/auth/verify', { replace: true });
    } catch {
      if (!controller.signal.aborted) { setProblem(true); setEmailInterrupted(true); }
    } finally { if (request.current === controller) busy.current = false; }
  } });
  const pending = Boolean(available && (result.isPending || result.isFetching || confirming));
  const missingEmail = available && !emailInterrupted && result.data?.nextAction === 'verify_email';
  function submit(event: FormEvent) { event.preventDefault(); if (!email.isPending && !busy.current) email.mutate(); }
  return <section className="mpf-section-surface mx-auto my-8 w-full max-w-lg p-6" aria-labelledby="social-callback-title">
    <h1 ref={heading} tabIndex={-1} id="social-callback-title" className="mb-5 text-xl">{t(missingEmail ? 'social.emailTitle' : 'social.callbackTitle')}</h1>
    {pending ? <p role="status" aria-live="polite" className="mb-5 flex items-center gap-2 text-sm"><ProcessingSpinner className="size-4 shrink-0" />{t('social.checking')}</p>
      : missingEmail && config?.methods.emailOtp ? <form onSubmit={submit} aria-busy={email.isPending} className="space-y-5">
        <p className="text-sm">{t('social.emailExplanation')}</p>
        <fieldset disabled={email.isPending} className="m-0 min-w-0 space-y-5 border-0 p-0">
          <label className="block text-sm">{t('form.email')}<input className="mt-2 min-h-10 w-full rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3 text-sm text-[var(--mpf-text)]"
            type="email" autoComplete="email" required maxLength={254} value={flow.email} onChange={event => flow.setEmail(event.target.value)} /></label>
          {problem ? <p role="alert" className="text-sm text-[var(--theme-danger)]">{t('social.emailFailed')}</p> : null}
          <Button type="submit" variant="primary" className="w-full" loading={email.isPending}>{t('form.sendCode')}</Button>
        </fieldset>
        <p role="status" aria-live="polite" className="sr-only">{email.isPending ? t('form.pending') : ''}</p>
      </form> : <>
        <p role={problem || result.isError ? 'alert' : 'status'} className="mb-5 text-sm">{t(config?.authMode === 'development_bypass' ? 'auth.bypassGuidance' : emailInterrupted ? 'social.emailFailed' : 'social.failed')}</p>
        {available && !emailInterrupted ? <Button type="button" onClick={() => {
          if (result.isFetching || confirming) return;
          setProblem(false);
          if (result.data?.nextAction === 'authenticated') {
            const controller = new AbortController(); request.current = controller; setConfirming(true);
            void confirmSession(result.data.returnPath, controller.signal).catch(() => {
              if (!controller.signal.aborted) { setConfirming(false); setProblem(true); }
            });
          } else void result.refetch();
        }}>{t('auth.retry')}</Button> : null}
      </>}
    <Link to="/login" className="mt-5 inline-flex min-h-10 items-center text-sm underline">{t('social.backToLogin')}</Link>
  </section>;
}
