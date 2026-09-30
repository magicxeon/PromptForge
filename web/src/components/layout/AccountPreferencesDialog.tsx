import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { ProcessingSpinner } from '../ui/ProcessingSpinner';
import { useUserPreferences } from '../../lib/auth/userPreferences';

export function AccountPreferencesDialog({ actorId, onClose }: { actorId: string; onClose: () => void }) {
  const { t } = useTranslation('react-ui');
  const preferences = useUserPreferences(actorId);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  return <Dialog.Root open onOpenChange={open => { if (!open && !saving) onClose(); }}><Dialog.Portal>
    <Dialog.Overlay className="app-confirm-dialog__overlay fixed inset-0 bg-[var(--theme-overlay)]" />
    <Dialog.Content className="app-confirm-dialog__content fixed left-1/2 top-1/2 w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--mpf-border)] bg-[var(--mpf-surface-strong)] p-5">
      <Dialog.Title className="m-0 text-lg">{t('ui.creditConsent.settings')}</Dialog.Title>
      <Dialog.Description className="my-3 text-sm text-[var(--mpf-text-muted)]">{t('ui.creditConsent.settingsDescription')}</Dialog.Description>
      {preferences.isLoading ? <ProcessingSpinner /> : <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={preferences.data?.confirmCreditUsage ?? true} disabled={saving}
        onChange={async event => { const enabled = event.target.checked; setSaving(true); setFailed(false);
          try { await preferences.save(enabled); } catch { setFailed(true); } finally { setSaving(false); } }} />{t('ui.creditConsent.ask')}</label>}
      {failed || preferences.isError ? <p role="alert" className="mt-3 text-sm">{t('ui.creditConsent.settingsFailed')}</p> : null}
      <div className="mt-5 flex justify-end"><Button disabled={saving} loading={saving} onClick={onClose}>{t('ui.action.close')}</Button></div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
