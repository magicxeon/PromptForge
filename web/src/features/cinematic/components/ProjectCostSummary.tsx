import * as Dialog from '@radix-ui/react-dialog';
import { ChevronUp, Coins, ReceiptText, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';

export type ProjectCostReadModel = {
  spentCredits: number;
  processingCredits: number;
  nextEstimateCredits: number | null;
  refundedCredits: number;
  groups: Array<{ key: string; spentCredits: number; reservedCredits: number }>;
};

export function ProjectCostSummary({ summary }: { summary?: ProjectCostReadModel }) {
  const { t } = useTranslation('cinematic');
  const unavailable = '--';
  return (
    <Dialog.Root>
      <div className="cinematic-project-cost" data-testid="cinematic-project-cost">
        <div className="cinematic-project-cost__title">
          <Coins aria-hidden="true" />
          <div><strong>{t('cinematic.cost.title')}</strong><small>{t('cinematic.cost.hint')}</small></div>
        </div>
        <CostMetric label={t('cinematic.cost.spent')} value={summary ? String(summary.spentCredits) : unavailable} />
        <CostMetric label={t('cinematic.cost.processing')} value={summary ? String(summary.processingCredits) : unavailable} tone="warning" />
        <CostMetric label={t('cinematic.cost.next')} value={summary?.nextEstimateCredits != null ? String(summary.nextEstimateCredits) : unavailable} />
        <CostMetric label={t('cinematic.cost.refunded')} value={summary ? String(summary.refundedCredits) : unavailable} tone="success" />
        <Dialog.Trigger asChild>
          <Button size="sm" variant="ghost" icon={<ChevronUp aria-hidden="true" />}>
            {t('cinematic.cost.details')}
          </Button>
        </Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="cinematic-dialog__overlay" />
        <Dialog.Content className="cinematic-dialog__content cinematic-dialog__content--compact">
          <DialogHeader title={t('cinematic.cost.breakdown')} description={t('cinematic.cost.breakdownHint')} />
          <div className="cinematic-cost-ledger">
            {(summary?.groups || []).map(group => (
              <div key={group.key}>
                <span><ReceiptText aria-hidden="true" />{t(`cinematic.stages.${group.key}`)}</span>
                <span>{group.spentCredits} {t('cinematic.cost.credits')}</span>
                <small>{group.reservedCredits ? `${group.reservedCredits} ${t('cinematic.cost.reserved')}` : t('cinematic.cost.settled')}</small>
              </div>
            ))}
            {!summary ? <p>{t('cinematic.cost.hint')}</p> : null}
          </div>
          <div className="cinematic-dialog__footer"><Dialog.Close asChild><Button>{t('cinematic.actions.close')}</Button></Dialog.Close></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CostMetric({ label, value, tone }: { label: string; value: string; tone?: 'warning' | 'success' }) {
  return <div className={`cinematic-project-cost__metric${tone ? ` is-${tone}` : ''}`}><small>{label}</small><strong>{value}</strong></div>;
}

export function DialogHeader({ title, description }: { title: string; description: string }) {
  const { t } = useTranslation('cinematic');
  return (
    <header className="cinematic-dialog__header">
      <div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description></div>
      <Dialog.Close asChild><Button size="icon" variant="ghost" title={t('cinematic.actions.close')} icon={<X aria-hidden="true" />} /></Dialog.Close>
    </header>
  );
}
