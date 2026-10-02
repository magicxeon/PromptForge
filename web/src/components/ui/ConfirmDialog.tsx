import * as AlertDialog from '@radix-ui/react-alert-dialog';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

type ConfirmDialogProps = {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  cancelDisabled?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
};

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pending = false,
  cancelDisabled = false,
  destructive = false,
  onConfirm, children, open, onOpenChange, onCloseAutoFocus
}: ConfirmDialogProps) {
  const { t } = useTranslation('react-ui');
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="app-confirm-dialog__overlay fixed inset-0 bg-[var(--theme-overlay)] backdrop-blur-sm" />
        <AlertDialog.Content onCloseAutoFocus={onCloseAutoFocus} className="app-confirm-dialog__content fixed left-1/2 top-1/2 max-h-[90dvh] w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-[var(--mpf-border)] bg-[var(--mpf-surface-strong)] p-5 shadow-[var(--mpf-shadow-raised)]">
          <AlertDialog.Title className="m-0 text-xl">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mb-5 mt-3 text-sm leading-6 text-[var(--mpf-text-muted)]">
            {description}
          </AlertDialog.Description>
          {children}
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" disabled={cancelDisabled}>{t('ui.action.cancel')}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant={destructive ? 'danger' : 'primary'}
                disabled={pending}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
