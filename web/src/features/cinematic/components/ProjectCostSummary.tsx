import * as Dialog from '@radix-ui/react-dialog';
import { ChevronUp, Coins, ReceiptText, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';

const costGroups = [
  { key: 'setup', spent: 3, reserved: 0 },
  { key: 'story-plan', spent: 5, reserved: 0 },
  { key: 'storyboard', spent: 24, reserved: 8 },
  { key: 'produce', spent: 16, reserved: 12 },
  { key: 'finish', spent: 0, reserved: 0 }
] as const;

export function ProjectCostSummary() {
  const { t } = useTranslation('cinematic');
  return (
    <Dialog.Root>
      <div className="cinematic-project-cost" data-testid="cinematic-project-cost">
        <div className="cinematic-project-cost__title">
          <Coins aria-hidden="true" />
          <div><strong>{t('cinematic.cost.title')}</strong><small>{t('cinematic.cost.hint')}</small></div>
        </div>
        <CostMetric label={t('cinematic.cost.spent')} value="48" />
        <CostMetric label={t('cinematic.cost.processing')} value="12" tone="warning" />
        <CostMetric label={t('cinematic.cost.next')} value="8" />
        <CostMetric label={t('cinematic.cost.refunded')} value="0" tone="success" />
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
            {costGroups.map(group => (
              <div key={group.key}>
                <span><ReceiptText aria-hidden="true" />{t(`cinematic.stages.${group.key}`)}</span>
                <span>{group.spent} {t('cinematic.cost.credits')}</span>
                <small>{group.reserved ? `${group.reserved} ${t('cinematic.cost.reserved')}` : t('cinematic.cost.settled')}</small>
              </div>
            ))}
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
