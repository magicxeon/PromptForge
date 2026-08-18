import * as Dialog from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, Download, ExternalLink, X } from 'lucide-react';
import { useEffect, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiMediaUrl } from '../../lib/api/apiClient';
import { Button } from '../ui/Button';
import { VideoMediaPlayer } from './VideoMediaPlayer';

export type GenerationVideoViewerItem = {
  id: string;
  videoUrl: string;
  posterUrl?: string | null;
  title?: string;
  status?: string;
  provider?: string;
  model?: string;
  createdAt?: string;
  completedAt?: string | null;
  clipDurationSeconds?: number | null;
  aspectRatio?: string | null;
  resolution?: string | null;
  audioMode?: string | null;
  operation?: string | null;
  creditCost?: number | null;
  characterProfileId?: string | null;
};

export function GenerationVideoViewer({
  items,
  activeId,
  open,
  onOpenChange,
  onActiveIdChange
}: {
  items: GenerationVideoViewerItem[];
  activeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActiveIdChange: (id: string) => void;
}) {
  const { t, i18n } = useTranslation('react-ui');
  const activeIndex = Math.max(0, items.findIndex(item => item.id === activeId));
  const item = items[activeIndex] || null;
  const previous = activeIndex > 0 ? items[activeIndex - 1] : null;
  const next = activeIndex < items.length - 1 ? items[activeIndex + 1] : null;

  useEffect(() => {
    if (open && !item && items[0]) onActiveIdChange(items[0].id);
  }, [item, items, onActiveIdChange, open]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft' && previous) {
      event.preventDefault();
      onActiveIdChange(previous.id);
    }
    if (event.key === 'ArrowRight' && next) {
      event.preventDefault();
      onActiveIdChange(next.id);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="generation-viewer__overlay" />
        <Dialog.Content
          className="generation-viewer generation-viewer--video"
          aria-describedby="generation-video-viewer-description"
          onKeyDown={handleKeyDown}
        >
          <Dialog.Title className="sr-only">
            {item?.title || t('ui.videoViewer.title')}
          </Dialog.Title>
          <Dialog.Description id="generation-video-viewer-description" className="sr-only">
            {t('ui.videoViewer.description')}
          </Dialog.Description>
          <Dialog.Close asChild>
            <Button
              className="generation-viewer__close"
              size="icon"
              variant="ghost"
              title={t('ui.action.close')}
              icon={<X aria-hidden="true" />}
            />
          </Dialog.Close>

          <Button
            className="generation-viewer__nav generation-viewer__nav--previous"
            size="icon"
            variant="ghost"
            title={t('ui.viewer.previous')}
            disabled={!previous}
            icon={<ChevronLeft aria-hidden="true" />}
            onClick={() => previous && onActiveIdChange(previous.id)}
          />
          <div className="generation-viewer__stage generation-viewer__stage--video">
            {item ? (
              <VideoMediaPlayer
                videoUrl={item.videoUrl}
                posterUrl={item.posterUrl}
                title={item.title || t('ui.videoViewer.videoAlt')}
              />
            ) : null}
            {items.length > 1 ? (
              <span className="generation-viewer__position">
                {t('ui.viewer.position', { current: activeIndex + 1, total: items.length })}
              </span>
            ) : null}
          </div>
          <Button
            className="generation-viewer__nav generation-viewer__nav--next"
            size="icon"
            variant="ghost"
            title={t('ui.viewer.next')}
            disabled={!next}
            icon={<ChevronRight aria-hidden="true" />}
            onClick={() => next && onActiveIdChange(next.id)}
          />

          {item ? (
            <aside className="generation-viewer__details">
              <header>
                <span>{t('ui.videoViewer.generation')}</span>
                <h2>{item.title || t('ui.videoViewer.referenceTitle', { id: item.id.slice(-7) })}</h2>
              </header>
              <dl className="generation-viewer__metadata">
                <Metadata label={t('ui.videoViewer.jobId')} value={item.id} />
                <Metadata label={t('ui.videoViewer.status')} value={item.status} />
                <Metadata label={t('ui.viewer.provider')} value={item.provider} />
                <Metadata label={t('ui.viewer.model')} value={item.model} />
                <Metadata label={t('ui.videoViewer.source')} value={formatOperation(item.operation, t)} />
                <Metadata label={t('ui.videoViewer.clipDuration')} value={formatSeconds(item.clipDurationSeconds)} />
                <Metadata label={t('ui.videoViewer.processingTime')} value={formatProcessingTime(item)} />
                <Metadata label={t('ui.videoViewer.aspectRatio')} value={item.aspectRatio || undefined} />
                <Metadata label={t('ui.videoViewer.resolution')} value={item.resolution || undefined} />
                <Metadata label={t('ui.videoViewer.audio')} value={item.audioMode || undefined} />
                <Metadata
                  label={t('ui.viewer.created')}
                  value={formatDate(item.createdAt, i18n.resolvedLanguage || 'en')}
                />
                <Metadata
                  label={t('ui.viewer.credits')}
                  value={item.creditCost === null || item.creditCost === undefined
                    ? undefined
                    : String(item.creditCost)}
                />
              </dl>

              {item.characterProfileId ? (
                <section className="generation-viewer__lineage">
                  <h3>{t('ui.videoViewer.character')}</h3>
                  <Link
                    className="generation-video-viewer__character-link"
                    to={`/characters/${encodeURIComponent(item.characterProfileId)}`}
                    onClick={() => onOpenChange(false)}
                  >
                    <span>{item.characterProfileId}</span>
                    <ExternalLink aria-hidden="true" />
                  </Link>
                </section>
              ) : null}

              <div className="generation-viewer__actions">
                <a
                  href={apiMediaUrl(item.videoUrl) || ''}
                  download
                  className="generation-viewer__download"
                >
                  <Download aria-hidden="true" />
                  {t('ui.action.download')}
                </a>
              </div>
            </aside>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Metadata({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <div><dt>{label}</dt><dd title={value}>{value}</dd></div>;
}

function formatSeconds(value?: number | null) {
  return Number.isFinite(value) ? `${value}s` : undefined;
}

function formatProcessingTime(item: GenerationVideoViewerItem) {
  if (!item.createdAt || !item.completedAt) return undefined;
  const milliseconds = new Date(item.completedAt).getTime() - new Date(item.createdAt).getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return undefined;
  const seconds = Math.round(milliseconds / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatDate(value: string | undefined, locale: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatOperation(operation: string | null | undefined, t: (key: string) => string) {
  if (!operation) return undefined;
  const key = `ui.videoViewer.operation.${operation}`;
  const translated = t(key);
  return translated === key ? operation.replaceAll('_', ' ') : translated;
}
