import { Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function TemplatePricingBadge({
  accessCredits,
  className = ''
}: {
  accessCredits: number;
  className?: string;
}) {
  const { t } = useTranslation('react-ui');
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-[var(--mpf-text-muted)] ${className}`.trim()}>
      <Coins className="size-3.5 text-amber-300" aria-hidden="true" />
      {t('ui.template.pricePerUse', { count: Math.max(0, accessCredits) })}
    </span>
  );
}
