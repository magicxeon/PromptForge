import * as Dialog from '@radix-ui/react-dialog';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  X
} from 'lucide-react';
import {
  useEffect,
  type KeyboardEvent,
  type ReactNode
} from 'react';
import { useTranslation } from 'react-i18next';
import { apiMediaUrl } from '../../lib/api/apiClient';
import { CollectionMembershipSection } from '../collections/CollectionMembershipSection';
import { Button } from '../ui/Button';

export type GenerationViewerItem = {
  id: string;
  imageUrl: string;
  title?: string;
  prompt?: string;
  provider?: string;
  model?: string;
  timestamp?: number;
  generationDuration?: string | number | null;
  width?: number;
  height?: number;
  creditCost?: number;
  parentImages?: Array<{
    id: string;
    imageUrl: string;
    thumbnailUrl?: string | null;
  }>;
};

export function GenerationImageViewer({
  items,
  activeId,
  open,
  canRevealPrompt,
  onOpenChange,
  onActiveIdChange,
  renderActions
}: {
  items: GenerationViewerItem[];
  activeId: string | null;
  open: boolean;
  canRevealPrompt: boolean;
  onOpenChange: (open: boolean) => void;
  onActiveIdChange: (id: string) => void;
  renderActions?: (item: GenerationViewerItem) => ReactNode;
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
          className="generation-viewer"
          aria-describedby="generation-viewer-description"
          onKeyDown={handleKeyDown}
        >
          <Dialog.Title className="sr-only">
            {item?.title || t('ui.viewer.title')}
          </Dialog.Title>
          <Dialog.Description id="generation-viewer-description" className="sr-only">
            {t('ui.viewer.description')}
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
          <div className="generation-viewer__stage">
            {item ? (
              <img
                src={apiMediaUrl(item.imageUrl) || ''}
                alt={item.title || t('ui.viewer.imageAlt')}
              />
            ) : null}
            {items.length > 1 ? (
              <span className="generation-viewer__position">
                {t('ui.viewer.position', {
                  current: activeIndex + 1,
                  total: items.length
                })}
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
                <span>{t('ui.viewer.generation')}</span>
                <h2>
                  {item.title || t('ui.viewer.referenceTitle', { id: item.id.slice(-5) })}
                </h2>
              </header>

              {canRevealPrompt && item.prompt ? (
                <section className="generation-viewer__prompt">
                  <h3><Info aria-hidden="true" />{t('ui.viewer.prompt')}</h3>
                  <p>{item.prompt}</p>
                </section>
              ) : null}

              <dl className="generation-viewer__metadata">
                <Metadata label={t('ui.viewer.provider')} value={item.provider} />
                <Metadata label={t('ui.viewer.model')} value={item.model} />
                <Metadata
                  label={t('ui.viewer.created')}
                  value={item.timestamp
                    ? new Intl.DateTimeFormat(i18n.resolvedLanguage || 'en', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    }).format(new Date(item.timestamp))
                    : undefined}
                />
                <Metadata
                  label={t('ui.viewer.duration')}
                  value={item.generationDuration
                    ? formatDuration(item.generationDuration)
                    : undefined}
                />
                <Metadata
                  label={t('ui.viewer.dimensions')}
                  value={item.width && item.height
                    ? `${item.width} x ${item.height}`
                    : undefined}
                />
                <Metadata
                  label={t('ui.viewer.credits')}
                  value={item.creditCost !== undefined
                    ? String(item.creditCost)
                    : undefined}
                />
              </dl>

              {item.parentImages?.length ? (
                <section className="generation-viewer__lineage">
                  <h3>{t('ui.viewer.parentLineage')}</h3>
                  <div>
                    {item.parentImages.map(parent => (
                      <img
                        key={parent.id}
                        src={apiMediaUrl(parent.thumbnailUrl || parent.imageUrl) || ''}
                        alt={t('ui.viewer.parentImage')}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              <CollectionMembershipSection jobId={item.id} />

              <div className="generation-viewer__actions">
                {renderActions?.(item)}
                <a
                  href={apiMediaUrl(item.imageUrl) || ''}
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
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatDuration(value: string | number) {
  const normalized = String(value);
  return normalized.endsWith('s') ? normalized : `${normalized}s`;
}
