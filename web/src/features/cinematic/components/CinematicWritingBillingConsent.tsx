import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { useUserPreferences } from '../../../lib/auth/userPreferences';
import { queryKeys } from '../../../lib/api/queryKeys';
import { registerCinematicWritingConsent, type WritingConsentRequest } from '../api/cinematicWritingBilling';
import { CinematicWritingRecoveryPreview } from './CinematicWritingRecoveryPreview';

type Offer = WritingConsentRequest & { resolve: (accepted: boolean) => void; trigger: HTMLElement | null };

function offerExpiresAt(request: WritingConsentRequest) {
  return request.recovery?.artifactExpiresAt ?? request.quote.expiresAt ?? '';
}

export function CinematicWritingBillingConsent({ actorId, scopeKey }: { actorId: string; scopeKey: string }) {
  const { t } = useTranslation(['cinematic', 'react-ui']);
  const queryClient = useQueryClient();
  const preferences = useUserPreferences(actorId);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const pending = useRef<Offer | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [expired, setExpired] = useState(false);
  const [skip, setSkip] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState(false);
  const mounted = useRef(true);
  const focusTarget = useRef<HTMLElement | null>(null);
  function finish(accepted: boolean) {
    const request = pending.current;
    pending.current = null;
    if (mounted.current) setOffer(null);
    request?.resolve(accepted);
  }
  useEffect(() => {
    mounted.current = true;
    let active = true;
    const unregister = registerCinematicWritingConsent(async request => {
      if (!active || request.actorId !== actorId || getActiveActorId() !== actorId || pending.current) return false;
      if (!request.mandatory) {
        const preference = preferencesRef.current;
        const refreshed = preference.isSuccess && !preference.isFetching && !preference.isStale
          ? preference : await preference.refetch();
        const data = refreshed.isSuccess ? refreshed.data : undefined;
        if (!active || getActiveActorId() !== actorId) return false;
        if (data?.confirmCreditUsage === false) return true;
      }
      return new Promise<boolean>(resolve => {
        if (!active || request.signal?.aborted) { resolve(false); return; }
        const abort = () => { if (pending.current === next) finish(false); };
        const next = { ...request, resolve: (accepted: boolean) => {
          request.signal?.removeEventListener('abort', abort); resolve(accepted);
        }, trigger: request.trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null) };
        focusTarget.current = next.trigger;
        pending.current = next;
        request.signal?.addEventListener('abort', abort, { once: true });
        setSkip(false); setExpired(false); setError(false); setOffer(next);
      });
    }, { onSettled: async settlement => {
      if (!active || settlement.actorId !== actorId || getActiveActorId() !== actorId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.credits(actorId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.creditLedger(actorId) })
      ]);
    } });
    return () => {
      active = false; mounted.current = false; unregister();
      pending.current?.resolve(false); pending.current = null;
    };
  }, [actorId, scopeKey, queryClient]);
  useEffect(() => {
    if (!offer) return;
    const remaining = Date.parse(offerExpiresAt(offer)) - Date.now();
    if (remaining <= 0) { setExpired(true); return; }
    const timer = window.setTimeout(() => setExpired(true), Math.min(remaining, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [offer]);
  async function confirm() {
    const request = pending.current;
    if (!request || savingRef.current || expired || Date.parse(offerExpiresAt(request)) <= Date.now()) return;
    savingRef.current = true; setSaving(true); setError(false);
    try {
      if (skip && !request.mandatory) await preferencesRef.current.save(false);
      if (pending.current === request) finish(getActiveActorId() === actorId && Date.parse(offerExpiresAt(request)) > Date.now());
    } catch {
      if (mounted.current && pending.current === request) setError(true);
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  return <ConfirmDialog trigger={<span hidden />} open={Boolean(offer)}
    onOpenChange={open => { if (!open && !savingRef.current) finish(false); }}
    onCloseAutoFocus={event => { event.preventDefault(); const target = focusTarget.current;
      requestAnimationFrame(() => { if (target?.isConnected) target.focus(); }); }}
    title={offer?.recovery ? t('cinematic:cinematic.writingBilling.recoveryTitle') : offer?.title || t('cinematic:cinematic.writingBilling.confirmTitle')}
    description={t(offer?.recovery ? 'cinematic:cinematic.writingBilling.recoveryDescription' : 'cinematic:cinematic.writingBilling.servicePrice')}
    confirmLabel={offer?.recovery ? t('cinematic:cinematic.writingBilling.reviewPrevious') : t('cinematic:cinematic.writingBilling.confirm', { credits: offer?.quote.credits ?? 0 })}
    pending={saving || expired} cancelDisabled={saving} onConfirm={() => void confirm()}>
    {offer?.scope ? <p>{offer.scope}</p> : null}
    {offer?.description ? <p>{offer.description}</p> : null}
    <dl className="cinematic-writing-price my-4 grid min-w-0 gap-3">
      <div className="flex flex-wrap justify-between gap-2"><dt>{t('cinematic:cinematic.writingBilling.textStep')}</dt><dd className="m-0 break-words">{offer ? t(`cinematic:cinematic.writingBilling.operation.${offer.quote.operation}`) : ''}</dd></div>
      <div className="flex flex-wrap justify-between gap-2 font-semibold"><dt>{t(offer?.recovery ? 'cinematic:cinematic.writingBilling.previouslyAuthorized' : 'cinematic:cinematic.writingBilling.total')}</dt><dd className="m-0 text-[var(--theme-warning)]">{t('cinematic:cinematic.writingBilling.credits', { credits: offer?.quote.credits ?? 0 })}</dd></div>
      {offer?.recovery ? <div className="flex flex-wrap justify-between gap-2"><dt>{t('cinematic:cinematic.writingBilling.operationId')}</dt><dd className="m-0 min-w-0 break-all">{offer.quote.id}</dd></div> : null}
    </dl>
    {offer?.recovery ? <CinematicWritingRecoveryPreview result={offer.recovery.result} operationId={offer.quote.id || ''} /> : null}
    {offer && !offer.recovery && ['environment', 'wardrobe'].includes(offer.quote.operation)
      ? <p>{t('cinematic:cinematic.writingBilling.imageSeparate')}</p> : null}
    {!offer?.mandatory ? <label className="cinematic-writing-price__preference my-4 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 shrink-0" checked={skip} disabled={saving || expired}
      onChange={event => setSkip(event.target.checked)} />{t('react-ui:ui.creditConsent.skip')}</label> : null}
    {saving ? <p role="status"><ProcessingSpinner />{t('cinematic:cinematic.writingBilling.confirming')}</p> : null}
    {expired ? <p role="alert">{t('cinematic:cinematic.writingBilling.expired')}</p> : null}
    {error ? <p role="alert">{t('react-ui:ui.creditConsent.saveFailed')}</p> : null}
  </ConfirmDialog>;
}
