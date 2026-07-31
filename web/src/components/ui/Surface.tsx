import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

export function Surface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--mpf-radius-md)] border border-[var(--theme-border)] bg-[var(--theme-surface)]',
        className
      )}
      {...props}
    />
  );
}
