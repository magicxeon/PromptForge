import { cloneElement, isValidElement, useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { withCinematicWritingConsentScope } from '../api/cinematicWritingBilling';

export function CinematicWritingConsent({ trigger, title, description, scope, pending, onConfirm }: {
  trigger: ReactNode; title: string; description?: string; scope: string; pending?: boolean; onConfirm: () => void;
}) {
  const { t } = useTranslation('cinematic');
  const controller = useRef(new AbortController());
  useEffect(() => {
    if (controller.current.signal.aborted) controller.current = new AbortController();
    const current = controller.current;
    return () => current.abort();
  }, []);
  if (!isValidElement<{ disabled?: boolean; onClick?: (event: MouseEvent<HTMLElement>) => void }>(trigger)) return null;
  return <span className="cinematic-writing-action inline-flex min-w-0 flex-col items-start gap-1">
    {cloneElement(trigger, { disabled: pending || trigger.props.disabled,
      onClick: event => { if (!pending) withCinematicWritingConsentScope({ title, description, scope, signal: controller.current.signal, trigger: event.currentTarget }, onConfirm); } })}
    <small className="text-[var(--theme-text-muted)]">{t('cinematic.writingBilling.reviewPrice')}</small>
  </span>;
}
