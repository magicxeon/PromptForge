import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

type GenerationEngineShellProps = HTMLAttributes<HTMLElement>;

export function GenerationEngineShell({
  className,
  ...props
}: GenerationEngineShellProps) {
  return (
    <section
      className={cn('studio-step-card studio-step-card--generation', className)}
      {...props}
    />
  );
}
