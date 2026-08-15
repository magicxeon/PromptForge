import momeloMark from '../../assets/brand/momelo-mark.svg';
import { cn } from '../../lib/utils/cn';

export function MomeloBrand({
  compact = false,
  className
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('momelo-brand', compact && 'momelo-brand--compact', className)}>
      <img className="momelo-brand__mark" src={momeloMark} alt="" aria-hidden="true" />
      <span className="momelo-brand__wordmark">momelo</span>
    </span>
  );
}
