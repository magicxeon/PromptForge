import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { Button } from '../../../components/ui/Button';
import { useActor } from '../../../lib/auth/ActorProvider';
import { listHistory } from '../../history/api/historyApi';
import type { HistoryItem } from '../../history/schemas/historySchemas';

export function GeneratedVideoImagePicker({ open, onClose, onSelect, excludedUrl, excludedUrls = [] }: {
  open: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
  excludedUrl?: string | null;
  excludedUrls?: string[];
}) {
  const { t } = useTranslation('playground');
  const { actor } = useActor();
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const page = useQuery({
    queryKey: ['video-generated-image-picker', actor?.userId, cursors.at(-1)],
    queryFn: () => listHistory(cursors.at(-1)),
    enabled: Boolean(open && actor?.userId), retry: false, staleTime: 0,
  });
  const items = (page.data?.items || []).filter(item => item.imageUrl.startsWith('/outputs/')
    && /\.(png|jpe?g|webp)$/i.test(item.imageUrl)
    && !['deleted', 'failed', 'cancelled', 'queued', 'processing'].includes(String(item.status || ''))
    && item.artifactVisibility !== 'template_owner_only');
  return <Dialog.Root open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="character-picker__overlay" />
      <Dialog.Content className="character-picker trusted-video-picker" aria-describedby={undefined}>
        <header>
          <Dialog.Title>{t('playground.video.trusted.choose')}</Dialog.Title>
          <Dialog.Close asChild><Button size="icon" icon={<X />} aria-label={t('playground.video.trusted.close')} /></Dialog.Close>
        </header>
        <div className="character-picker__body">
          {page.isFetching ? <p role="status">{t('playground.video.trusted.loading')}</p> : null}
          {page.isError ? <div role="alert">{t('playground.video.trusted.failed')}
            <Button onClick={() => void page.refetch()}>{t('playground.video.references.retry')}</Button>
          </div> : null}
          {!page.isFetching && !page.isError && !items.length ? <p>{t('playground.video.trusted.emptyEligible')}</p> : null}
          <div className="trusted-video-picker__grid">
            {items.map(item => <button key={item.id} type="button"
              disabled={page.isFetching || item.imageUrl === excludedUrl || excludedUrls.includes(item.imageUrl)} onClick={() => onSelect(item)}>
              <AuthenticatedMediaImage src={item.thumbnailUrl || item.imageUrl} alt={item.submodel || item.id} />
              <div className="trusted-video-picker__details"><strong>{item.submodel || item.provider}</strong>
                <span>{item.width && item.height ? `${item.width} x ${item.height}` : ''}</span>
              </div>
            </button>)}
          </div>
        </div>
        <footer>
          <Button size="icon" icon={<ChevronLeft />} aria-label={t('playground.video.trusted.previous')}
            disabled={cursors.length === 1 || page.isFetching} onClick={() => setCursors(value => value.slice(0, -1))} />
          <span>{cursors.length}</span>
          <Button size="icon" icon={<ChevronRight />} aria-label={t('playground.video.trusted.next')}
            disabled={!page.data?.hasMore || !page.data.nextCursor || page.isFetching}
            onClick={() => setCursors(value => [...value, page.data!.nextCursor!])} />
        </footer>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
