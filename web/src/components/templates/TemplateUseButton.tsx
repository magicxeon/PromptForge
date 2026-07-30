import { LayoutTemplate } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

export function TemplateUseButton({
  onUse,
  disabled = false,
  className = ''
}: {
  onUse: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useTranslation('react-ui');
  return (
    <Button
      className={className}
      size="sm"
      icon={<LayoutTemplate className="size-4" aria-hidden="true" />}
      disabled={disabled}
      onClick={onUse}
    >
      {t('ui.action.useTemplate')}
    </Button>
  );
}
