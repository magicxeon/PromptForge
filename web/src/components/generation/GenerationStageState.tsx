import { LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import momeloMark from '../../assets/brand/momelo-mark.svg';
import { cn } from '../../lib/utils/cn';

export function GenerationLoadingIndicator({
  className,
  iconClassName = 'size-10'
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={cn('generation-loading-indicator', className)} aria-hidden="true">
      <span className="generation-loading-indicator__pulse" />
      <span className="generation-loading-indicator__glow" />
      <LoaderCircle className={cn('generation-loading-indicator__spinner animate-spin', iconClassName)} />
    </span>
  );
}

export function GenerationStageState({
  loading = false,
  title,
  description,
  className,
  children
}: {
  loading?: boolean;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn('generation-stage-state', className)}
      role={loading ? 'status' : undefined}
      aria-live={loading ? 'polite' : undefined}
      aria-busy={loading}
    >
      {loading ? (
        <GenerationLoadingIndicator />
      ) : (
        <img
          className="generation-result__momelo-mark"
          src={momeloMark}
          alt=""
          aria-hidden="true"
        />
      )}
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {children}
    </div>
  );
}
