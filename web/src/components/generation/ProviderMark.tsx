import {
  Aperture,
  Boxes,
  BrainCircuit,
  Palette,
  Sparkles,
  Telescope,
  type LucideIcon
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';

const providerIcons: Record<string, LucideIcon> = {
  gemini: Sparkles,
  openai: BrainCircuit,
  xai: Telescope,
  modelark: Aperture,
  'meta-muse': Palette
};

export function ProviderMark({ providerId, className }: { providerId: string; className?: string }) {
  const normalizedId = providerId.trim().toLowerCase();
  const Icon = providerIcons[normalizedId] || Boxes;

  return (
    <span
      className={cn('provider-mark', className)}
      data-provider-mark={normalizedId || 'unknown'}
      aria-hidden="true"
    >
      <Icon />
    </span>
  );
}
