import { LoaderCircle, type LucideProps } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export function ProcessingSpinner({ className, style, ...props }: LucideProps) {
  return <LoaderCircle {...props} aria-hidden="true" data-processing-spinner="true"
    className={cn('mpf-processing-spinner shrink-0 animate-spin motion-reduce:animate-none', className)}
    style={{ ...style, color: 'var(--theme-warning)' }} />;
}
