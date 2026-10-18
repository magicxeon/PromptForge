import { useLayoutEffect, useRef, type PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useActor } from '../../../lib/auth/ActorProvider';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';

export function isPublicAuthenticationRoute(pathname: string) {
  // Match React Router's case-insensitive and trailing-slash route semantics.
  pathname = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return pathname === '/'
    || /^\/(home|community|compare)$/.test(pathname)
    || /^\/community\/(characters(\/[^/]+)?|[^/]+)$/.test(pathname)
    || /^\/creators\/[^/]+(\/[^/]+)?$/.test(pathname)
    || /^\/(login|register|forgot-password|reset-password)$/.test(pathname)
    || /^\/auth\/(verify|complete|callback)$/.test(pathname)
    || pathname === '/auth/facebook/data-deletion'
    || /^\/explore\/(comparisons|templates|characters)(\/[^/]+)?$/.test(pathname)
    || /^\/(posts|characters)\/[^/]+$/.test(pathname)
    || /^\/profiles\/[^/]+(\/[^/]+)?$/.test(pathname);
}

export function safeAuthenticationReturnPath(value: string | null) {
  // eslint-disable-next-line no-control-regex -- Return destinations must reject controls and backslashes.
  if (!value || value.length > 1024 || !value.startsWith('/') || /[\\\x00-\x20]/.test(value)) return '/';
  try {
    const decoded = decodeURIComponent(value);
    // eslint-disable-next-line no-control-regex -- Encoded control characters are equally unsafe.
    if (decoded.startsWith('//') || /[\\\x00-\x20]/.test(decoded)
      || /^\/(auth|login|register|forgot-password|reset-password|admin)(\/|\?|$)/i.test(decoded)) return '/';
    const url = new URL(value, 'https://momelo.invalid');
    const normalized = decodeURIComponent(url.pathname);
    if (/^\/(auth|login|register|forgot-password|reset-password|admin)(\/|$)/i.test(normalized)) return '/';
    return url.origin === 'https://momelo.invalid' ? `${url.pathname}${url.search}` : '/';
  } catch { return '/'; }
}

export function AuthenticationGate({ children }: PropsWithChildren) {
  const { actor, identityScope, isLoading, error, refresh } = useActor();
  const location = useLocation();
  const { t } = useTranslation('authentication');
  const contentRef = useRef<HTMLDivElement>(null);
  const lastHeight = useRef(0);
  const lastFocus = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (isLoading || !actor || !contentRef.current) return;
    const measure = () => {
      if (!contentRef.current) return;
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      lastHeight.current = typeof range.getBoundingClientRect === 'function'
        ? range.getBoundingClientRect().height : contentRef.current.scrollHeight;
    };
    measure();
    if (lastFocus.current?.isConnected && document.activeElement === document.body)
      lastFocus.current.focus({ preventScroll: true });
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(document.documentElement);
    return () => observer?.disconnect();
  }, [actor?.userId, identityScope, isLoading]);
  if (isPublicAuthenticationRoute(location.pathname)) return children;
  if (error) return <ErrorState title={t('auth.unavailable')} description={t('auth.retryDescription')}
    retryLabel={t('auth.retry')} onRetry={() => void refresh()} />;
  if (isLoading && !actor) return <LoadingState label={t('auth.resolving')} />;
  if (!actor) return <Navigate replace to={`/login?returnTo=${encodeURIComponent(safeAuthenticationReturnPath(`${location.pathname}${location.search}`))}`} />;
  // Retain only the last confirmed owner's in-memory work during revalidation.
  // Identity changes replace this keyed tree; failures and logout discard it.
  return <>
    {isLoading && <div style={{ minHeight: lastHeight.current }} aria-busy="true"><LoadingState label={t('auth.resolving')} /></div>}
    <div key={identityScope} ref={contentRef} hidden={isLoading} inert={isLoading || undefined}
      onFocusCapture={event => { lastFocus.current = event.target as HTMLElement; }}
      style={{ display: isLoading ? 'none' : 'contents' }}>{children}</div>
  </>;
}
