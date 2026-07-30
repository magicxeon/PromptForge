import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';
import { TemplatePricingBadge } from './TemplatePricingBadge';

export function TemplateUseBanner({
  authoringMode,
  accessCredits,
  onClear
}: {
  authoringMode: 'guided' | 'manual';
  accessCredits: number;
  onClear: () => void;
}) {
  const { t } = useTranslation('react-ui');
  return (
    <Surface className="studio-template-status">
      <span>
        <BookOpen className="size-4 text-cyan-300" />
        <span>
          <strong>{t('ui.scene.templateLoaded', { mode: authoringMode })}</strong>
          <small>{t('ui.scene.templateFixedHelp')}</small>
        </span>
        <TemplatePricingBadge accessCredits={accessCredits} />
      </span>
      <Button size="sm" variant="ghost" onClick={onClear}>
        {t('ui.action.clearTemplate')}
      </Button>
    </Surface>
  );
}
