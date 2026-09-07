import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Clock, Images, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { Button } from '../../../components/ui/Button';
import { useActor } from '../../../lib/auth/ActorProvider';
import {
  listTrustedVideoSources,
  type TrustedVideoSource,
} from '../api/trustedVideoSources';
import '../../../styles/playground-video-references.css';

export function TrustedVideoSources({
  withLook,
  frame,
  look,
  onChange,
}: {
  withLook: boolean;
  frame: TrustedVideoSource | null;
  look: TrustedVideoSource | null;
  onChange: (patch: {
    trustedFrame?: TrustedVideoSource | null;
    trustedLook?: TrustedVideoSource | null;
  }) => void;
}) {
  const { t } = useTranslation('playground');
  const { actor } = useActor();
  const [slot, setSlot] = useState<'frame' | 'look' | null>(null);
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const page = useQuery({
    queryKey: ['trusted-video-sources', actor?.userId, cursors.at(-1)],
    queryFn: () => listTrustedVideoSources(cursors.at(-1)),
    enabled: Boolean(slot && actor?.userId),
    staleTime: 0,
    retry: false,
  });
  const status = (item: TrustedVideoSource) => {
    const expired = item.expiresAt && Date.parse(item.expiresAt) <= Date.now();
    return expired
      ? t('playground.video.trusted.reason.expired')
      : item.reason
        ? t(`playground.video.trusted.reason.${item.reason}`, {
            defaultValue: t('playground.video.trusted.unavailable'),
          })
        : t('playground.video.trusted.eligible');
  };
  const details = (item: TrustedVideoSource) => (
    <div className="trusted-video-sources__details">
      <span>{item.modelId}</span>
      <span>{item.generationMode}</span>
      {item.generatedAt ? (
        <span>
          {t('playground.video.trusted.generated', {
            date: new Date(item.generatedAt).toLocaleString(),
          })}
        </span>
      ) : null}
      <span>
        <Clock size={12} aria-hidden="true" />{' '}
        {item.expiresAt
          ? t('playground.video.trusted.expires', {
              date: new Date(item.expiresAt).toLocaleString(),
            })
          : t('playground.video.trusted.reason.timestamp_unknown')}
      </span>
      {item.eligible &&
      item.expiresAt &&
      Date.parse(item.expiresAt) > Date.now() ? (
        <span>
          {t('playground.video.trusted.remaining', {
            days: Math.ceil(
              (Date.parse(item.expiresAt) - Date.now()) / 86400000,
            ),
          })}
        </span>
      ) : null}
      <strong>{status(item)}</strong>
    </div>
  );
  const pickerDetails = (item: TrustedVideoSource) => {
    const remainingDays = item.expiresAt
      ? Math.max(0, Math.ceil((Date.parse(item.expiresAt) - Date.now()) / 86400000))
      : 0;
    return <div className="trusted-video-picker__details">
      <strong>{trustedModelLabel(item.modelId)}</strong>
      <span>{t(`playground.video.trusted.mode.${item.generationMode}`, { defaultValue: item.generationMode })}</span>
      <span><Clock size={12} aria-hidden="true" />{t('playground.video.trusted.remainingCompact', { days: remainingDays })}</span>
    </div>;
  };
  const eligibleItems = page.data?.items.filter((item) => item.eligible
    && Boolean(item.expiresAt)
    && Date.parse(item.expiresAt || '') > Date.now()) || [];
  return (
    <div className="playground-video-references trusted-video-sources">
      <p>{t('playground.video.trusted.description')}</p>
      <div className="playground-video-references__slots">
        {(
          ['frame', ...(withLook ? ['look'] : [])] as Array<'frame' | 'look'>
        ).map((key) => {
          const selected = key === 'frame' ? frame : look;
          const title = t(
            key === 'look'
              ? 'playground.video.references.look'
              : withLook
                ? 'playground.video.references.scene'
                : 'playground.video.references.frame',
          );
          return (
            <section className="playground-video-references__slot" key={key}>
              <header>
                <strong>{title}</strong>
              </header>
              <div className="playground-video-references__preview">
                {selected ? (
                  <AuthenticatedMediaImage
                    src={selected.previewUrl}
                    alt={title}
                  />
                ) : (
                  <Images aria-hidden="true" />
                )}
              </div>
              {selected ? details(selected) : null}
              <div className="playground-video-references__actions">
                <Button
                  icon={<Images />}
                  onClick={() => {
                    setCursors([null]);
                    setSlot(key);
                  }}
                >
                  {t('playground.video.trusted.choose')}
                </Button>
                {selected ? (
                  <Button
                    size="icon"
                    icon={<X />}
                    aria-label={`${t('playground.reference.remove')} ${title}`}
                    onClick={() =>
                      onChange(
                        key === 'frame'
                          ? { trustedFrame: null }
                          : { trustedLook: null },
                      )
                    }
                  />
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
      {withLook ? (
        <p>{t('playground.video.references.multimodalNotice')}</p>
      ) : null}
      <Dialog.Root
        open={Boolean(slot)}
        onOpenChange={(open) => {
          if (!open) setSlot(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="character-picker__overlay" />
          <Dialog.Content
            className="character-picker trusted-video-picker"
            aria-describedby="trusted-video-picker-description"
          >
            <header>
              <Dialog.Title>
                {t('playground.video.trusted.choose')}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button
                  size="icon"
                  icon={<X />}
                  aria-label={t('playground.video.trusted.close')}
                />
              </Dialog.Close>
            </header>
            <Dialog.Description id="trusted-video-picker-description">
              {t('playground.video.trusted.pickerDescription')}
            </Dialog.Description>
            <div className="character-picker__body">
              {page.isFetching ? (
                <p role="status">{t('playground.video.trusted.loading')}</p>
              ) : null}
              {page.isError ? (
                <p role="alert">
                  {t('playground.video.trusted.failed')}{' '}
                  <Button onClick={() => void page.refetch()}>
                    {t('playground.video.references.retry')}
                  </Button>
                </p>
              ) : null}
              {!page.isFetching && !page.isError && !eligibleItems.length ? (
                <p>{t('playground.video.trusted.emptyEligible')}</p>
              ) : null}
              <div className="trusted-video-picker__grid">
                {eligibleItems.map((item) => {
                  const duplicate =
                    withLook &&
                    item.id === (slot === 'frame' ? look?.id : frame?.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      disabled={
                        page.isFetching ||
                        !item.eligible ||
                        duplicate ||
                        !item.expiresAt ||
                        Date.parse(item.expiresAt) <= Date.now()
                      }
                      onClick={() => {
                        onChange(
                          slot === 'frame'
                            ? { trustedFrame: item }
                            : { trustedLook: item },
                        );
                        setSlot(null);
                      }}
                    >
                      <AuthenticatedMediaImage
                        src={item.previewUrl}
                        alt={trustedModelLabel(item.modelId)}
                      />
                      {pickerDetails(item)}
                      {duplicate ? (
                        <small>{t('playground.video.trusted.duplicate')}</small>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <footer>
              <Button
                icon={<ChevronLeft />}
                aria-label={t('playground.video.trusted.previous')}
                disabled={cursors.length === 1 || page.isFetching}
                onClick={() => setCursors((values) => values.slice(0, -1))}
              />
              <span>{cursors.length}</span>
              <Button
                icon={<ChevronRight />}
                aria-label={t('playground.video.trusted.next')}
                disabled={!page.data?.hasMore || page.isFetching}
                onClick={() =>
                  setCursors((values) => [
                    ...values,
                    page.data?.nextCursor || null,
                  ])
                }
              />
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function trustedModelLabel(modelId: string) {
  if (modelId.includes('seedream-5-0-pro')) return 'Seedream 5.0 Pro';
  if (modelId.includes('seedream-5-0')) return 'Seedream 5.0 Lite';
  return modelId;
}
