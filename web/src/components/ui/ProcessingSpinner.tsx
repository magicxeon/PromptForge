import { LoaderCircle, type LucideProps } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export function ProcessingSpinner({ className, style, variant, ...props }: LucideProps & { variant?: 'wave' }) {
  if (variant === 'wave') return <svg aria-hidden="true" data-processing-spinner="true" className={className} style={style} width="42" height="24" viewBox="0 0 42 24">
    {[8, 15, 22, 16, 9].map((height, i) => <rect key={i} x={2 + i * 8} y={(24-height)/2} width="4" height={height} rx="2" fill="currentColor" style={{animationDelay: `${-i * 0.14}s`}} />)}
  </svg>;
  return <LoaderCircle {...props} aria-hidden="true" data-processing-spinner="true"
    className={cn('mpf-processing-spinner shrink-0 animate-spin motion-reduce:animate-none', className)}
    style={{ ...style, color: 'var(--theme-warning)' }} />;
}
