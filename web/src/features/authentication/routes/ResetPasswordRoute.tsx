import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { useActor } from '../../../lib/auth/ActorProvider';
import { ApiError } from '../../../lib/api/apiError';
import { useAuthenticationFlow } from '../authenticationFlow';
import { commitPasswordReset, getAuthenticationOperation, preparePasswordReset, requestPasswordReset, verifyPasswordReset,
  type PreparedReset, type RegistrationChallenge } from '../authenticationApi';

const inputClass = 'mt-2 min-h-10 w-full rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3 text-sm text-[var(--mpf-text)]';
export function ResetPasswordRoute() {
  const { config, identityScope } = useActor(), flow = useAuthenticationFlow();
  const { t } = useTranslation('authentication'), client = useQueryClient();
  const [phase, setPhase] = useState<'email' | 'verify' | 'password' | 'reconcile' | 'success' | 'help'>('email');
  const [challenge, setChallenge] = useState<RegistrationChallenge | null>(null);
  const [operation, setOperation] = useState<PreparedReset | null>(null);
  const [code, setCode] = useState(''), [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false), [problem, setProblem] = useState(''), [now, setNow] = useState(Date.now());
  const [pollCount, setPollCount] = useState(0);
  const attempts = useRef(0), busy = useRef(false), key = useRef(crypto.randomUUID());
  const request = useRef<AbortController | null>(null), heading = useRef<HTMLHeadingElement | null>(null);
  const available = config?.authMode === 'session' && config.methods.password && config.methods.emailOtp;
  const expired = Boolean(challenge && now >= Date.parse(challenge.expiresAt));
  const remaining = challenge ? Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - now) / 1000)) : 0;
  function clearSecrets() { setCode(''); setPassword(''); setConfirmation(''); }
  useEffect(() => () => { request.current?.abort(); }, []);
  useEffect(() => { if (!available) { request.current?.abort(); clearSecrets(); } }, [available]);
  useEffect(() => { heading.current?.focus(); }, [phase]);
  useEffect(() => {
    if (!challenge || !['verify', 'password'].includes(phase)) return;
    const timer = window.setInterval(() => {
      const time = Date.now(); setNow(time);
      if (time >= Date.parse(challenge.expiresAt)) { clearSecrets(); window.clearInterval(timer); }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [challenge, phase]);
  useEffect(() => {
    if (phase !== 'reconcile' || !operation) return;
    const timer = window.setTimeout(() => {
      setNow(Date.now());
      void client.cancelQueries({ queryKey: ['authentication-operation', identityScope, operation.operationId], exact: true });
    }, Math.max(0, Date.parse(operation.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [client, identityScope, operation, phase]);
  const outcome = useQuery({
    queryKey: ['authentication-operation', identityScope, operation?.operationId],
    enabled: phase === 'reconcile' && Boolean(operation && now < Date.parse(operation.expiresAt)), retry: false, gcTime: 300000,
    queryFn: async ({ signal }) => {
      if (!operation || attempts.current >= 10 || Date.now() >= Date.parse(operation.expiresAt)) throw new Error('Operation lookup ended.');
      attempts.current += 1; setPollCount(attempts.current);
      return getAuthenticationOperation(operation.operationId, signal);
    },
    refetchInterval: query => {
      if (phase !== 'reconcile' || !operation || attempts.current >= 10 || Date.now() >= Date.parse(operation.expiresAt)) return false;
      if (query.state.data && query.state.data.status !== 'pending') return false;
      if (query.state.error instanceof ApiError && query.state.error.status === 403) return false;
      return 2000;
    },
    refetchOnWindowFocus: false, refetchOnReconnect: false
  });
  useEffect(() => {
    if (phase !== 'reconcile' || !outcome.data || outcome.data.status === 'pending') return;
    setPhase(outcome.data.status === 'succeeded' && outcome.data.nextAction === 'sign_in' ? 'success' : 'help');
  }, [outcome.data, phase]);
  function restart() {
    request.current?.abort(); busy.current = false;
    if (operation) client.removeQueries({ queryKey: ['authentication-operation', identityScope, operation.operationId], exact: true });
    clearSecrets(); setOperation(null); setChallenge(null); setProblem(''); setPhase('email');
    attempts.current = 0; setPollCount(0); key.current = crypto.randomUUID();
  }
  const mutation = useMutation({ retry: false, mutationFn: async (action: 'send' | 'verify' | 'save') => {
    if (!available || busy.current) return;
    busy.current = true; setProblem('');
    const controller = new AbortController(); request.current = controller;
    let commitStarted = false;
    try {
      if (action === 'send') {
        const result = await requestPasswordReset(flow.email, key.current, controller.signal);
        if (controller.signal.aborted) return;
        clearSecrets(); setChallenge(result); setNow(Date.now()); key.current = crypto.randomUUID(); setPhase('verify');
      } else if (action === 'verify') {
        if (!challenge || expired) return;
        const result = await verifyPasswordReset(challenge.challengeId, code, controller.signal);
        if (controller.signal.aborted) return;
        setCode(''); setPhase(result.nextAction === 'reset_password' ? 'password' : 'help');
      } else {
        if (phase !== 'password' || expired) return;
        const payload = { password, confirmation };
        const prepared = await preparePasswordReset(payload.password, payload.confirmation, key.current, controller.signal);
        if (controller.signal.aborted) return;
        setOperation(prepared); clearSecrets(); commitStarted = true;
        const result = await commitPasswordReset(prepared.operationId, payload.password, payload.confirmation, key.current, controller.signal);
        if (controller.signal.aborted) return;
        setPhase(result.status === 'succeeded' && result.nextAction === 'sign_in' ? 'success' : 'reconcile');
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      clearSecrets();
      if (commitStarted) setPhase('reconcile');
      else {
        key.current = crypto.randomUUID();
        setProblem(error instanceof ApiError && error.code === 'auth_rate_limited' ? 'form.rateLimited' : 'form.failed');
      }
    } finally { if (request.current === controller) busy.current = false; }
  } });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending || busy.current || !['email', 'verify', 'password'].includes(phase)) return;
    if (phase === 'password' && (password !== confirmation || Array.from(password).length < (config?.policy.passwordMinLength || 15)
      || Array.from(password).length > (config?.policy.passwordMaxLength || 128))) { setProblem('form.passwordInvalid'); return; }
    mutation.mutate(phase === 'email' ? 'send' : phase === 'verify' ? 'verify' : 'save');
  }
  const polling = phase === 'reconcile' && operation && now < Date.parse(operation.expiresAt) && (outcome.isFetching || pollCount < 10
    && !(outcome.error instanceof ApiError && outcome.error.status === 403));
  return <section className="mpf-section-surface mx-auto my-8 w-full max-w-lg p-6" aria-labelledby="reset-title">
    <h1 ref={heading} id="reset-title" tabIndex={-1} className="mb-5 text-xl">{t(phase === 'success' ? 'reset.successTitle' : 'reset.title')}</h1>
    {!available ? <p role="status" className="mb-5 text-sm">{t(config?.authMode === 'development_bypass' ? 'auth.bypassGuidance' : 'auth.methodsUnavailable')}</p>
      : phase === 'success' ? <p role="status" className="mb-5 text-sm">{t('reset.success')}</p>
      : phase === 'help' ? <p role="status" className="mb-5 text-sm">{t('reset.neutralHelp')}</p>
      : phase === 'reconcile' ? <p role="status" aria-live="polite" className="mb-5 flex items-center gap-2 text-sm">
        {polling ? <ProcessingSpinner className="size-4 shrink-0" /> : null}{t(polling ? 'reset.checking' : 'reset.unknown')}
      </p> : <form onSubmit={submit} aria-busy={mutation.isPending} className="space-y-5">
        <fieldset disabled={mutation.isPending} className="m-0 min-w-0 space-y-5 border-0 p-0">
          {phase === 'email' ? <>
            <p className="text-sm">{t('reset.notice')}</p>
            <label className="block text-sm">{t('form.email')}<input className={inputClass} type="email" required autoComplete="email" maxLength={254} value={flow.email} onChange={event => flow.setEmail(event.target.value)} /></label>
          </> : phase === 'verify' ? <>
            <p className="break-words text-sm">{t('form.codeSent', { email: flow.email })}</p>
            <label className="block text-sm">{t('form.code')}<input className={inputClass} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))} /></label>
            <Button type="button" disabled={remaining > 0 || expired} onClick={() => mutation.mutate('send')}>{t(remaining > 0 ? 'form.resendWait' : 'form.resend', { seconds: remaining })}</Button>
          </> : <>
            <p className="text-sm">{t('reset.revocation')}</p>
            <p className="text-sm text-[var(--mpf-text-muted)]">{t('form.passwordPolicy', { min: config?.policy.passwordMinLength, max: config?.policy.passwordMaxLength })}</p>
            <label className="block text-sm">{t('form.password')}<input className={inputClass} type={show ? 'text' : 'password'} autoComplete="new-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
            <label className="block text-sm">{t('form.confirmPassword')}<input className={inputClass} type={show ? 'text' : 'password'} autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={show} onChange={event => setShow(event.target.checked)} />{t('form.showPassword')}</label>
          </>}
          {expired ? <p role="status" className="text-sm">{t('form.expired')}</p> : null}
          {problem ? <p role="alert" className="text-sm text-[var(--theme-danger)]">{t(problem)}</p> : null}
          <Button type="submit" variant="primary" className="w-full" loading={mutation.isPending} disabled={phase !== 'email' && (expired || phase === 'verify' && code.length !== 6)}>{t(phase === 'email' ? 'form.sendCode' : phase === 'verify' ? 'form.verify' : 'reset.save')}</Button>
        </fieldset>
        <p role="status" aria-live="polite" className="sr-only">{mutation.isPending ? t('form.pending') : ''}</p>
      </form>}
    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <Link to={`/login?returnTo=${encodeURIComponent(flow.returnPath)}`} className="inline-flex min-h-10 items-center underline">{t('auth.signIn')}</Link>
      <Link to={`/forgot-password?returnTo=${encodeURIComponent(flow.returnPath)}`} className="inline-flex min-h-10 items-center underline">{t('form.useCode')}</Link>
      {available && phase !== 'email' && phase !== 'success' && phase !== 'reconcile' ? <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={restart}>{t('form.restart')}</Button> : null}
    </div>
  </section>;
}
