import * as Dialog from '@radix-ui/react-dialog';
import { useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Globe2, Image, RotateCcw, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CharacterFeaturedImageCandidate } from '../../features/profiles/schemas/profileSchemas';
import { AuthenticatedMediaImage } from '../media/AuthenticatedMediaImage';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';

type CharacterFeaturedImagePickerProps = {
  candidates: CharacterFeaturedImageCandidate[];
  mode: 'auto' | 'manual';
  selectedSourceType: 'generation_result' | 'community_post' | null;
  selectedSourceId: string | null;
  displaySource?: string;
  pending?: boolean;
  scope?: 'linked' | 'own';
  onScopeChange?: (scope: 'linked' | 'own') => void;
  pageNumber?: number;
  hasMore?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  error?: string | null;
  onRetry?: () => void;
  onSelect: (candidate: CharacterFeaturedImageCandidate, displayConsentAccepted?: boolean) => void | Promise<unknown>;
  onUseAutomatic: () => void;
};

export function CharacterFeaturedImagePicker({
  candidates,
  mode,
  selectedSourceType,
  selectedSourceId,
  displaySource,
  pending = false,
  scope = 'linked', onScopeChange, pageNumber = 1, hasMore = false, onPrevious, onNext, error, onRetry,
  onSelect,
  onUseAutomatic
}: CharacterFeaturedImagePickerProps) {
  const { t } = useTranslation('character-profiles');
  const [cover, setCover] = useState<CharacterFeaturedImageCandidate | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState(false);
  const confirmingRef = useRef(false);
  const selectionTrigger = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);
  async function confirmCover() {
    if (!cover || pending || confirmingRef.current) return;
    confirmingRef.current = true;
    setConfirming(true);
    setConfirmError(false);
    try { await onSelect(cover, true); setCover(null); }
    catch { setConfirmError(true); }
    finally { confirmingRef.current = false; setConfirming(false); }
  }
  const usingFallback = ![
    'featured_work',
    'owner_selected_work',
    'owner_generation',
    'owner_selected_generation'
  ].includes(displaySource || '');

  return (
    <Surface className="mt-8 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase text-cyan-300">
            {t('character-profiles.featured.kicker')}
          </span>
          <h2 ref={heading} tabIndex={-1} className="mb-1 mt-2 text-xl">{t('character-profiles.featured.title')}</h2>
          <p className="m-0 max-w-2xl text-sm text-[var(--mpf-text-muted)]">
            {t('character-profiles.featured.description')}
          </p>
        </div>
        <Button
          icon={<RotateCcw className="size-4" aria-hidden="true" />}
          disabled={pending || mode === 'auto'}
          onClick={onUseAutomatic}
        >
          {t('character-profiles.featured.useAutomatic')}
        </Button>
      </div>

      <div className="mt-4 border border-[var(--mpf-border)] bg-[var(--mpf-surface-muted)] p-3 text-sm">
        <strong className="text-[var(--mpf-text)]">
          {mode === 'manual' && ['owner_selected_work', 'owner_selected_generation'].includes(displaySource || '')
            ? t('character-profiles.featured.statusManual')
            : usingFallback
              ? t('character-profiles.featured.statusCasting')
              : t('character-profiles.featured.statusAutomatic')}
        </strong>
        <span className="ml-2 text-[var(--mpf-text-muted)]">
          {t('character-profiles.featured.publicOnly')}
        </span>
      </div>

      {onScopeChange ? <label className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        {t('character-profiles.featured.sourceLabel')}
        <select value={scope} disabled={pending} onChange={event => onScopeChange(event.target.value as 'linked' | 'own')}
          className="min-h-10 max-w-full rounded border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3">
          <option value="linked">{t('character-profiles.featured.linkedWorks')}</option>
          <option value="own">{t('character-profiles.featured.myImages')}</option>
        </select>
      </label> : null}
      {error ? <div className="mt-4" role="alert">
        <p className="text-sm text-[var(--theme-danger)]">{t('character-profiles.featured.loadFailed')}</p>
        {onRetry ? <Button onClick={onRetry} disabled={pending}>{t('character-profiles.featured.retry')}</Button> : null}
      </div> : null}
      {pending && !candidates.length ? <p role="status">{t('character-profiles.states.loading')}</p> : null}
      {candidates.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {candidates.map(candidate => {
            const selected = mode === 'manual'
              && selectedSourceType === candidate.sourceType
              && selectedSourceId === candidate.sourceId;
            const imageUrl = candidate.thumbnailUrl || candidate.imageUrl || null;
            return (
              <article
                key={candidate.id}
                className={`overflow-hidden rounded-[var(--mpf-radius-md)] border bg-[var(--mpf-surface)] ${
                  selected ? 'border-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.18)]' : 'border-[var(--mpf-border)]'
                }`}
              >
                <div className="aspect-[3/4] bg-black">
                  {imageUrl ? (
                    <AuthenticatedMediaImage
                      src={imageUrl}
                      alt={candidate.title || t('character-profiles.works.image')}
                      className="h-full w-full object-cover object-top"
                      loading="lazy"
                      fallback={(
                        <div className="grid h-full place-items-center">
                          <Image className="size-8 text-[var(--mpf-text-muted)]" aria-hidden="true" />
                        </div>
                      )}
                    />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <Image className="size-8 text-[var(--mpf-text-muted)]" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="grid gap-3 p-3">
                  <div className="flex items-center gap-2 text-xs text-[var(--mpf-text-muted)]">
                    {candidate.ownership === 'owner'
                      ? <UserRound className="size-4 text-cyan-300" aria-hidden="true" />
                      : <Globe2 className="size-4 text-fuchsia-300" aria-hidden="true" />}
                    <span>{candidate.ownership === 'owner'
                      ? t('character-profiles.featured.sourceOwner')
                      : t('character-profiles.featured.sourceCommunity')}</span>
                  </div>
                  <strong className="line-clamp-1 text-sm">{candidate.title}</strong>
                  <Button
                    size="sm"
                    variant={selected ? 'primary' : 'secondary'}
                    icon={selected ? <Check className="size-4" aria-hidden="true" /> : undefined}
                    disabled={pending || selected}
                    onClick={event => {
                      if (candidate.linkedToCharacter === false) {
                        selectionTrigger.current = event.currentTarget;
                        setCover(candidate); setConfirmError(false);
                      }
                      else void onSelect(candidate);
                    }}
                  >
                    {selected
                      ? t('character-profiles.featured.selected')
                      : t('character-profiles.featured.select')}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : !pending && !error ? (
        <p className="mb-0 mt-4 text-sm text-[var(--mpf-text-muted)]">
          {t('character-profiles.featured.empty')}
        </p>
      ) : null}
      {scope === 'own' && (pageNumber > 1 || hasMore) ? <nav className="mt-4 flex items-center justify-end gap-2" aria-label={t('character-profiles.featured.pages')}>
        <Button size="icon" title={t('character-profiles.featured.previous')} icon={<ChevronLeft className="size-4" />} disabled={pending || pageNumber <= 1} onClick={onPrevious} />
        <span className="min-w-8 text-center text-sm">{pageNumber}</span>
        <Button size="icon" title={t('character-profiles.featured.next')} icon={<ChevronRight className="size-4" />} disabled={pending || !hasMore} onClick={onNext} />
      </nav> : null}
      <Dialog.Root open={Boolean(cover)} onOpenChange={open => { if (!open && !confirming) setCover(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="app-nested-dialog__overlay fixed inset-0 bg-black/75" />
          <Dialog.Content onCloseAutoFocus={event => {
            event.preventDefault();
            const trigger = selectionTrigger.current;
            if (trigger?.isConnected && !trigger.disabled) trigger.focus();
            else heading.current?.focus();
          }} className="app-nested-dialog__content fixed left-1/2 top-1/2 max-h-[88vh] w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-[var(--mpf-border)] bg-[var(--mpf-bg-raised)] p-5 text-[var(--mpf-text)]">
            <Dialog.Title className="m-0 text-xl">{t('character-profiles.featured.confirmTitle')}</Dialog.Title>
            <Dialog.Description className="text-sm text-[var(--mpf-text-muted)]">{t('character-profiles.featured.confirmDescription')}</Dialog.Description>
            {cover?.imageUrl ? <AuthenticatedMediaImage src={cover.imageUrl} alt={cover.title} className="mx-auto h-48 max-w-full object-contain" /> : null}
            {confirmError ? <p role="alert" className="text-sm text-[var(--theme-danger)]">{t('character-profiles.featured.saveFailed')}</p> : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Dialog.Close asChild><Button disabled={confirming}>{t('character-profiles.delete.cancel')}</Button></Dialog.Close>
              <Button variant="primary" disabled={pending || confirming} onClick={() => void confirmCover()}>{t('character-profiles.featured.confirm')}</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Surface>
  );
}
