import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

export function CinematicWritingConsent({ trigger, title, description, scope, pending, onConfirm }: {
  trigger: ReactNode; title: string; description?: string; scope: string; pending?: boolean; onConfirm: () => void;
}) {
  const { t } = useTranslation('cinematic');
  return <ConfirmDialog trigger={trigger} title={title} description={description || t('cinematic.bulk.proposalDescription')}
    confirmLabel={t('cinematic.regeneration.confirm')} pending={pending} onConfirm={onConfirm}>
    <p>{scope}</p><p className="cinematic-bulk-credit-total">{t('cinematic.bulk.unbilled')}</p>
  </ConfirmDialog>;
}
