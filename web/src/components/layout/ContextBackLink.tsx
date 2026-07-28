import { ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { getActiveActorId } from '../../lib/auth/actorStore';
import { isSafeInternalPath, type ReturnNavigationState } from '../../lib/navigation/returnNavigation';

export function ContextBackLink({
  fallbackTo,
  children,
  className = ''
}: {
  fallbackTo: string;
  children: ReactNode;
  className?: string;
}) {
  const location = useLocation();
  const state = location.state as ReturnNavigationState | null;
  const candidate = state?.mpfReturn;
  const safeReturn = candidate?.actorId === getActiveActorId()
    && isSafeInternalPath(candidate.to)
    ? candidate.to
    : fallbackTo;

  return (
    <Link
      to={safeReturn}
      className={`inline-flex min-h-10 items-center gap-2 rounded-[var(--mpf-radius-sm)] px-3 text-sm text-cyan-300 no-underline hover:bg-white/5 ${className}`}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}
