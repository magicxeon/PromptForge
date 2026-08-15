import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  fill?: boolean;
  centerContent?: boolean;
};

export function Surface({
  className,
  fill = false,
  centerContent = false,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--mpf-radius-md)] border border-[var(--theme-border)] bg-[var(--theme-surface)]',
        fill && 'surface--fill',
        centerContent && 'surface--center-content',
        className
      )}
      {...props}
    />
  );
}
