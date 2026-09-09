import { Coins, LockKeyhole, Sparkles } from 'lucide-react';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';

type ContextualOperationDockProps = {
  title: string;
  description: string;
  operation: string;
  credits?: number;
  actionLabel: string;
  children?: ReactNode;
  media?: boolean;
  disabled?: boolean;
  loading?: boolean;
  notice?: string;
  onAction?: () => void;
};

export function ContextualOperationDock({
  title,
  description,
  operation,
  credits,
  actionLabel,
  children,
  media = false,
  disabled = true,
  loading = false,
  notice,
  onAction
}: ContextualOperationDockProps) {
  const { t } = useTranslation('cinematic');
  return (
    <aside className={`cinematic-operation-dock${media ? ' is-media' : ''}`} data-testid="cinematic-operation-dock">
      <header>
        <span><Sparkles aria-hidden="true" /></span>
        <div><p>{operation}</p><h3>{title}</h3><small>{description}</small></div>
      </header>
      {children ? <div className="cinematic-operation-dock__controls">{children}</div> : null}
      <div className="cinematic-operation-dock__quote">
        <span><Coins aria-hidden="true" />{t('cinematic.operation.estimate')}</span>
        <strong>{credits === undefined ? '-' : `${credits} ${t('cinematic.cost.credits')}`}</strong>
      </div>
      <Button
        className="w-full"
        data-testid="cinematic-operation-submit"
        variant="primary"
        icon={loading ? <ProcessingSpinner className="animate-spin" aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
        disabled={disabled || loading}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
      <p className="cinematic-operation-dock__notice">{notice || t('cinematic.operation.previewOnly')}</p>
    </aside>
  );
}
