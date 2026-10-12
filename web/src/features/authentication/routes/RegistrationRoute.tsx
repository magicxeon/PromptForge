import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { useActor } from '../../../lib/auth/ActorProvider';
import { ApiError } from '../../../lib/api/apiError';
import { acceptEnrollmentIntent, completeRegistration, requestLoginCode, requestRegistration, startSocialLogin, verifyLoginCode, verifyRegistration } from '../authenticationApi';
import { useAuthenticationFlow } from '../authenticationFlow';
import { SocialLoginButtons } from '../components/SocialLoginButtons';
import { redirectToSocialProvider } from '../socialNavigation';

const inputClass = 'mt-2 min-h-10 w-full rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3 text-sm text-[var(--mpf-text)]';

// Restricted proof lives only in the server HttpOnly flow cookie. This route's
// component state helps the form; it cannot authorize verification or activation.
export function RegistrationRoute() {
  const { config } = useActor();
  const { t } = useTranslation('authentication');
  const location = useLocation();
  const navigate = useNavigate();
  const flow = useAuthenticationFlow();
  const { email, setEmail, remember, setRemember, challenge, setChallenge, verified, setVerified, offered, setOffered } = flow;
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptedVersion, setAcceptedVersion] = useState('');
  const [problem, setProblem] = useState('');
  const [now, setNow] = useState(Date.now());
  const controller = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);
  const busy = useRef(false);
  const issueKey = useRef(crypto.randomUUID());
  const returnPath = useRef(flow.returnPath);
  const path = location.pathname.toLowerCase().replace(/\/+$/, '');
  const phase = path === '/auth/verify' ? 'verify' : path === '/auth/complete' ? 'complete' : 'register';
  const legalReady = Boolean(config?.legal.termsVersion && config.legal.privacyVersion);
  const legalVersion = `${config?.legal.termsVersion}:${config?.legal.privacyVersion}:${config?.legal.termsUrl ?? ''}:${config?.legal.privacyUrl ?? ''}`;
  const currentConsent = accepted && acceptedVersion === legalVersion;
  const methodReady = config?.authMode === 'session' && (phase === 'verify'
    ? config.methods.emailOtp && (flow.purpose === 'login' || legalReady)
    : legalReady && (phase === 'complete' && flow.provider ? config.methods[flow.provider]
      : config.methods.emailOtp || phase === 'register' && (config.methods.google || config.methods.facebook)));
  const effectivePassword = passwordEnabled && config?.methods.password === true;

  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => () => { controller.current?.abort(); }, [config?.authMode, config?.methods.password,
    config?.methods.emailOtp, config?.methods.google, config?.methods.facebook]);
  useEffect(() => { heading.current?.focus(); }, [phase, offered]);
  useEffect(() => {
    if (config?.methods.password) return;
    setPasswordEnabled(false); setPassword(''); setConfirmation('');
    setProblem(value => value === 'form.passwordInvalid' ? '' : value);
  }, [config?.methods.password]);
  useEffect(() => {
    if (!challenge || phase !== 'verify') return;
    const expires = Date.parse(challenge.expiresAt);
    const timer = window.setInterval(() => {
      const time = Date.now(); setNow(time);
      if (time >= expires) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [challenge, phase]);

  function clearSecrets() { setCode(''); setPassword(''); setConfirmation(''); }
  function restart() {
    controller.current?.abort(); busy.current = false;
    clearSecrets(); setChallenge(null); setVerified(false); setOffered(false); setAccepted(false); setProblem('');
    issueKey.current = crypto.randomUUID();
    const destination = flow.provider || flow.purpose === 'login' ? '/login' : '/register'; flow.setProvider(null);
    navigate(`${destination}?returnTo=${encodeURIComponent(returnPath.current)}`, { replace: true });
  }
  const mutation = useMutation({
    retry: false,
    mutationFn: async (action: 'send' | 'verify' | 'complete' | 'enroll' | 'confirm' | 'google' | 'facebook') => {
      if (busy.current || !methodReady) return;
      busy.current = true;
      const request = new AbortController(); controller.current = request;
      setProblem('');
      try {
        if (action === 'google' || action === 'facebook') {
          if (!config?.methods[action]) return;
          clearSecrets();
          const result = await startSocialLogin(action, remember, returnPath.current, request.signal);
          if (request.signal.aborted) return;
          redirectToSocialProvider(action, result.authorizationUrl);
        } else if (action === 'confirm') {
          await flow.confirmSession(returnPath.current, request.signal);
        } else if (action === 'send') {
          const purpose = phase === 'register' ? 'registration' : flow.purpose;
          const send = purpose === 'login' ? requestLoginCode : requestRegistration;
          const result = await send(email, remember, returnPath.current, issueKey.current, request.signal);
          if (request.signal.aborted) return;
          if (phase === 'register') flow.setProvider(null);
          flow.setPurpose(purpose); setChallenge(result); setVerified(false); setOffered(false); setCode(''); setNow(Date.now());
          issueKey.current = crypto.randomUUID();
          navigate('/auth/verify');
        } else if (action === 'verify') {
          if (!challenge) return;
          const verify = flow.purpose === 'login' ? verifyLoginCode : verifyRegistration;
          const result = await verify(challenge.challengeId, code, request.signal);
          if (request.signal.aborted) return;
          setCode('');
          if (result.nextAction === 'authenticated') {
            await flow.confirmSession(result.returnPath, request.signal);
          } else if (result.nextAction === 'offer_registration') {
            setOffered(true);
          } else if (result.nextAction === 'complete_registration') {
            setVerified(true); navigate('/auth/complete');
          } else setProblem('form.stepUnavailable');
        } else if (action === 'enroll') {
          if (!offered) return;
          const result = await acceptEnrollmentIntent(request.signal);
          if (request.signal.aborted) return;
          setOffered(false);
          if (result.nextAction === 'complete_registration') {
            flow.setPurpose('registration'); setVerified(true); navigate('/auth/complete');
          } else navigate(`/login?notice=sign_in_existing&returnTo=${encodeURIComponent(returnPath.current)}`, { replace: true });
        } else {
          if (!verified || !config?.legal.termsVersion || !config.legal.privacyVersion || !currentConsent) return;
          const result = await completeRegistration({
            displayName: name, termsAccepted: true,
            termsVersion: config.legal.termsVersion, privacyVersion: config.legal.privacyVersion,
            ...(effectivePassword ? { password, passwordConfirmation: confirmation } : {})
          }, request.signal);
          if (request.signal.aborted) return;
          clearSecrets();
          if (result.nextAction === 'sign_in_existing') {
            setVerified(false);
            navigate(`/login?notice=sign_in_existing&returnTo=${encodeURIComponent(returnPath.current)}`, { replace: true });
          } else {
            await flow.confirmSession(result.returnPath, request.signal);
          }
        }
      } catch (error) {
        if (request.signal.aborted) return;
        if (action === 'verify') setCode('');
        if (action === 'complete') { setPassword(''); setConfirmation(''); }
        setProblem(error instanceof ApiError && error.code === 'auth_rate_limited' ? 'form.rateLimited'
          : error instanceof ApiError && error.code === 'auth_session_unconfirmed' ? 'form.confirmationFailed' : 'form.failed');
      } finally { if (controller.current === request) busy.current = false; }
    }
  });
  const pending = mutation.isPending;
  const remaining = challenge ? Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - now) / 1000)) : 0;
  const expired = challenge ? now >= Date.parse(challenge.expiresAt) : true;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || busy.current || problem === 'form.confirmationFailed' || phase === 'register' && !config?.methods.emailOtp) return;
    if (phase === 'complete' && effectivePassword && (password !== confirmation
      || Array.from(password).length < (config?.policy.passwordMinLength || 15)
      || Array.from(password).length > (config?.policy.passwordMaxLength || 128))) {
      setProblem('form.passwordInvalid'); return;
    }
    mutation.mutate(phase === 'register' ? 'send' : phase === 'verify' ? 'verify' : 'complete');
  }

  if (!methodReady) return <section className="mpf-section-surface mx-auto my-8 w-full max-w-lg p-6">
    <h1 className="mb-3 text-xl">{t('form.register')}</h1>
    <p role="status" className="mb-5 text-sm">{t(config?.authMode === 'development_bypass' ? 'auth.bypassGuidance' : 'auth.methodsUnavailable')}</p>
    <Link to="/login" className="text-sm underline">{t('auth.signIn')}</Link>
  </section>;
  if (phase === 'verify' && !challenge || phase === 'complete' && !verified) return <section className="mpf-section-surface mx-auto my-8 w-full max-w-lg p-6">
    <h1 className="mb-3 text-xl">{t('form.restartTitle')}</h1>
    <p className="mb-5 text-sm">{t('form.restartDescription')}</p>
    <Button onClick={restart}>{t('form.restart')}</Button>
  </section>;
  return <section className="mpf-section-surface mx-auto my-8 w-full max-w-lg p-6" aria-labelledby="registration-title">
    <h1 ref={heading} tabIndex={-1} id="registration-title" className="mb-5 text-xl">{t(offered ? 'form.createAccount' : phase === 'verify' ? 'form.verify' : phase === 'complete' ? 'form.complete' : 'form.register')}</h1>
    <form onSubmit={submit} className="space-y-5" aria-busy={pending}>
      <fieldset disabled={pending} className="m-0 min-w-0 space-y-5 border-0 p-0">
        {phase === 'register' ? <>
          {config ? <SocialLoginButtons methods={config.methods} disabled={pending}
            pending={pending && (mutation.variables === 'google' || mutation.variables === 'facebook') ? mutation.variables : undefined}
            onStart={provider => mutation.mutate(provider)} /> : null}
          {config?.methods.emailOtp ? <label className="block text-sm">{t('form.email')}<input className={inputClass} type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label> : null}
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} />{t('form.remember')}</label>
          <p className="text-sm text-[var(--mpf-text-muted)]">{t('form.registrationNotice')}</p>
        </> : phase === 'verify' && offered ? <>
          <p role="status" aria-live="polite" className="break-words text-sm">{t('form.offerRegistration', { email })}</p>
          {expired ? <p role="status" className="text-sm">{t('form.expired')}</p> : null}
          <Button type="button" variant="primary" loading={pending} disabled={expired || !legalReady} onClick={() => mutation.mutate('enroll')}>{t('form.createAccount')}</Button>
        </> : phase === 'verify' ? <>
          <p className="break-words text-sm">{t('form.codeSent', { email })}</p>
          <label className="block text-sm">{t('form.code')}<input className={inputClass} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))} /></label>
          {expired ? <p role="status" className="text-sm">{t('form.expired')}</p> : null}
          <Button type="button" disabled={remaining > 0} onClick={() => mutation.mutate('send')}>{remaining > 0 ? t('form.resendWait', { seconds: remaining }) : t('form.resend')}</Button>
        </> : <>
          <label className="block text-sm">{t('form.name')}<input className={inputClass} autoComplete="nickname" required maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>
          {!effectivePassword ? <p className="text-sm text-[var(--mpf-text-muted)]">{t(flow.provider && !config?.methods.emailOtp ? 'social.passwordlessGuidance' : 'form.passwordlessGuidance', { provider: flow.provider ? t(`social.name.${flow.provider}`) : '' })}</p> : null}
          {config?.methods.password ? <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={passwordEnabled} onChange={event => { setPasswordEnabled(event.target.checked); setPassword(''); setConfirmation(''); }} />{t('form.addPassword')}</label> : null}
          {passwordEnabled && config?.methods.password ? <>
            <p className="text-sm text-[var(--mpf-text-muted)]">{t('form.passwordPolicy', { min: config.policy.passwordMinLength, max: config.policy.passwordMaxLength })}</p>
            <label className="block text-sm">{t('form.password')}<input className={inputClass} type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
            <label className="block text-sm">{t('form.confirmPassword')}<input className={inputClass} type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showPassword} onChange={event => setShowPassword(event.target.checked)} />{t('form.showPassword')}</label>
          </> : null}
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={currentConsent} onChange={event => { setAccepted(event.target.checked); setAcceptedVersion(legalVersion); }} />{t('form.acceptTerms')}</label>
          <p className="text-xs text-[var(--mpf-text-muted)]">{t('form.legalVersions', { terms: config?.legal.termsVersion, privacy: config?.legal.privacyVersion })}</p>
          {config?.legal.termsUrl || config?.legal.privacyUrl ? <p className="flex flex-wrap gap-x-4 text-sm">
            {config.legal.termsUrl ? <a href={config.legal.termsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center underline">{t('form.termsLink')}</a> : null}
            {config.legal.privacyUrl ? <a href={config.legal.privacyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center underline">{t('form.privacyLink')}</a> : null}
          </p> : null}
        </>}
        {problem ? <p role="alert" className="text-sm text-[var(--theme-danger)]">{t(problem)}</p> : null}
        {problem === 'form.confirmationFailed' ? <Button type="button" loading={pending} onClick={() => mutation.mutate('confirm')}>{t('auth.retry')}</Button> : null}
        {!offered && problem !== 'form.confirmationFailed' && (phase !== 'register' || config?.methods.emailOtp) && <Button type="submit" variant="primary" className="w-full" loading={pending} disabled={phase === 'verify' && (expired || code.length !== 6) || phase === 'complete' && !currentConsent}>{t(pending ? 'form.pending' : phase === 'register' ? 'form.sendCode' : phase === 'verify' ? 'form.verify' : 'form.createAccount')}</Button>}
      </fieldset>
      <p role="status" aria-live="polite" className="sr-only">{pending ? t('form.pending') : ''}</p>
      {phase !== 'register' ? <Button type="button" variant="ghost" disabled={pending} onClick={restart}>{t(flow.provider && !email ? 'social.backToLogin' : 'form.editEmail')}</Button> : <Link to={`/login?returnTo=${encodeURIComponent(returnPath.current)}`} className="inline-flex min-h-10 items-center text-sm underline">{t('form.alreadyAccount')}</Link>}
    </form>
  </section>;
}
