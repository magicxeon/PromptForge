import * as Dialog from '@radix-ui/react-dialog';
import { Coins, LoaderCircle, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';

export function CreditExhaustedDialog({
  open,
  requiredCredits,
  availableCredits,
  canGrantMockCredits,
  grantPending,
  grantError,
  onOpenChange,
  onGrantMockCredits
}: {
  open: boolean;
  requiredCredits?: number;
  availableCredits?: number;
  canGrantMockCredits: boolean;
  grantPending: boolean;
  grantError?: string | null;
  onOpenChange: (open: boolean) => void;
  onGrantMockCredits: () => void;
}) {
  const { t } = useTranslation('credits');
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[91] w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--mpf-radius-md)] border border-amber-300/35 bg-[var(--mpf-surface-strong)] p-5 shadow-[0_0_42px_rgb(251_191_36_/_0.16)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--theme-warning)] bg-amber-300/10 text-[var(--theme-warning)]">
                <Coins className="size-5" aria-hidden="true" />
              </span>
              <div>
                <Dialog.Title className="m-0 text-xl">{t('dialog.exhausted.title')}</Dialog.Title>
                <Dialog.Description className="mb-0 mt-2 text-sm leading-6 text-[var(--mpf-text-muted)]">
                  {t('dialog.exhausted.description')}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button
                size="icon"
                variant="ghost"
                title={t('dialog.exhausted.close')}
                aria-label={t('dialog.exhausted.close')}
                icon={<X className="size-4" />}
              />
            </Dialog.Close>
          </div>
          <dl className="my-5 grid grid-cols-2 gap-3 border-y border-[var(--mpf-border)] py-4 text-sm">
            <div>
              <dt className="text-[var(--mpf-text-muted)]">{t('dialog.exhausted.available')}</dt>
              <dd className="m-0 mt-1 text-lg font-semibold text-[var(--theme-text)]">
                {availableCredits ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--mpf-text-muted)]">{t('dialog.exhausted.required')}</dt>
              <dd className="m-0 mt-1 text-lg font-semibold text-[var(--theme-warning)]">
                {requiredCredits ?? 0}
              </dd>
            </div>
          </dl>
          {grantError ? <p role="alert" className="text-sm text-red-300">{grantError}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              to="/credits"
              className="inline-flex min-h-10 items-center justify-center rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border-strong)] px-4 text-[0.75rem] font-semibold text-[var(--theme-text)] no-underline"
              onClick={() => onOpenChange(false)}
            >
              {t('dialog.exhausted.viewCredits')}
            </Link>
            {canGrantMockCredits ? (
              <Button
                variant="primary"
                disabled={grantPending}
                icon={grantPending
                  ? <LoaderCircle className="size-4 animate-spin" />
                  : <Plus className="size-4" />}
                onClick={onGrantMockCredits}
              >
                {grantPending
                  ? t('dialog.exhausted.adding')
                  : t('dialog.exhausted.addMock')}
              </Button>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
