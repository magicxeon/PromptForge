import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { useUserPreferences } from '../../lib/auth/userPreferences';
import { getActiveActorId } from '../../lib/auth/actorStore';

type Options = { actorId: string; requestKey: string; estimatedCredits?: number; description: string; ready?: boolean };
type Request = { key: string; credits: number; description: string; resolve: (confirmed: boolean) => void; trigger: HTMLElement | null };

export function useCreditConfirmation({ actorId, requestKey, estimatedCredits, description, ready = true }: Options) {
  const { t } = useTranslation('react-ui');
  const preferences = useUserPreferences(actorId);
  const scope = JSON.stringify([actorId, requestKey, estimatedCredits, ready]);
  const latest = useRef(scope);
  latest.current = scope;
  const pending = useRef<Request | null>(null);
  const [offer, setOffer] = useState<Request | null>(null);
  const [skip, setSkip] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState(false);
  const mounted = useRef(true);
  const focusTarget = useRef<HTMLElement | null>(null);
  function finish(confirmed: boolean) {
    const request = pending.current;
    pending.current = null;
    if (mounted.current) setOffer(null);
    request?.resolve(confirmed);
  }
  useEffect(() => {
    if (pending.current && pending.current.key !== scope) finish(false);
  }, [scope]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; pending.current?.resolve(false); pending.current = null; };
  }, []);

  function request(): Promise<boolean> {
    if (pending.current || !actorId || getActiveActorId() !== actorId || !ready
      || estimatedCredits === undefined || !Number.isFinite(estimatedCredits) || estimatedCredits < 0) return Promise.resolve(false);
    if (estimatedCredits === 0 || (preferences.isSuccess && !preferences.isFetching && preferences.data?.confirmCreditUsage === false)) return Promise.resolve(true);
    setSkip(false); setError(false);
    return new Promise(resolve => {
      const next = { key: scope, credits: estimatedCredits, description, resolve,
        trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null };
      focusTarget.current = next.trigger;
      pending.current = next; setOffer(next);
    });
  }
  async function confirm() {
    const current = pending.current;
    if (!current || savingRef.current) return;
    if (latest.current !== current.key || getActiveActorId() !== actorId) { finish(false); return; }
    savingRef.current = true; setSaving(true); setError(false);
    try {
      if (skip) await preferences.save(false);
      if (pending.current === current) finish(latest.current === current.key && getActiveActorId() === actorId);
    } catch {
      if (mounted.current && pending.current === current) setError(true);
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  const dialog = <AlertDialog.Root open={Boolean(offer)} onOpenChange={open => { if (!open && !savingRef.current) finish(false); }}>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="app-confirm-dialog__overlay fixed inset-0 bg-[var(--theme-overlay)] backdrop-blur-sm" />
      <AlertDialog.Content className="app-confirm-dialog__content fixed left-1/2 top-1/2 max-h-[90dvh] w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-[var(--mpf-border)] bg-[var(--mpf-surface-strong)] p-5 shadow-[var(--mpf-shadow-raised)]"
        onCloseAutoFocus={event => { event.preventDefault(); if (focusTarget.current?.isConnected) focusTarget.current.focus(); }}>
        <AlertDialog.Title className="m-0 text-lg">{t('ui.creditConsent.title')}</AlertDialog.Title>
        <AlertDialog.Description className="my-3 break-words text-sm text-[var(--mpf-text-muted)]">{offer?.description}</AlertDialog.Description>
        <p className="my-4 text-lg font-semibold text-[var(--theme-warning)]">{t('ui.creditConsent.amount', { credits: offer?.credits ?? 0 })}</p>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 shrink-0" checked={skip} disabled={saving} onChange={event => setSkip(event.target.checked)} />{t('ui.creditConsent.skip')}</label>
        {error ? <p role="alert" className="mt-3 text-sm text-[var(--theme-warning)]">{t('ui.creditConsent.saveFailed')}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <AlertDialog.Cancel asChild><Button variant="ghost" disabled={saving} onClick={() => finish(false)}>{t('ui.action.cancel')}</Button></AlertDialog.Cancel>
          <Button variant="primary" loading={saving} disabled={saving} onClick={() => void confirm()}>{t('ui.creditConsent.confirm')}</Button>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>;
  return { request, dialog, awaitingConfirmation: Boolean(offer),
    isCurrent: () => latest.current === scope && getActiveActorId() === actorId };
}
