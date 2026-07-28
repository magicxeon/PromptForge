import { AlertCircle, LoaderCircle } from 'lucide-react';
import { Button } from './Button';

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-[var(--mpf-text-muted)]" role="status">
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center border border-dashed border-[var(--mpf-border)] p-8 text-center">
      <strong>{title}</strong>
      {description ? <p className="mt-2 max-w-xl text-sm text-[var(--mpf-text-muted)]">{description}</p> : null}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry
}: {
  title: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center border border-red-400/25 bg-red-500/5 p-8 text-center">
      <AlertCircle className="mb-3 size-6 text-red-300" aria-hidden="true" />
      <strong>{title}</strong>
      {description ? <p className="mt-2 max-w-xl text-sm text-[var(--mpf-text-muted)]">{description}</p> : null}
      {onRetry ? <Button className="mt-5" onClick={onRetry}>{retryLabel || 'Retry'}</Button> : null}
    </div>
  );
}
