import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthenticatedMediaImage } from '../media/AuthenticatedMediaImage';
import { Button } from '../ui/Button';
import { ProcessingSpinner } from '../ui/ProcessingSpinner';
import { useActor } from '../../lib/auth/ActorProvider';
import { listTrustedVideoSources, type TrustedVideoSource } from '../../features/generation/api/trustedVideoSources';

export function GeneratedLookSourceField({ value, disabled, onChange, onPreviewReady }: {
  value: TrustedVideoSource | null;
  disabled: boolean;
  onChange: (source: TrustedVideoSource | null) => void;
  onPreviewReady: (ready: boolean) => void;
}) {
  const { t, i18n } = useTranslation('cinematic');
  const { actor } = useActor();
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [previewFailed, setPreviewFailed] = useState(false);
  const page = useQuery({
    queryKey: ['trusted-video-sources', actor?.userId, 'look-sheet', cursors.at(-1)],
    queryFn: () => listTrustedVideoSources(cursors.at(-1), 'look-sheet'),
    enabled: Boolean(actor?.userId), staleTime: 0, retry: false,
  });
  const expiry = (item: TrustedVideoSource) => t('cinematic.lookDraft.generatedExpiry', {
    date: item.expiresAt ? new Date(item.expiresAt).toLocaleDateString(i18n.language) : ''
  });
  const items = (page.data?.items || []).filter(item => item.category === 'look-sheet' && item.eligible && item.expiresAt && Date.parse(item.expiresAt) > Date.now());
  return <section className="character-look-generated" aria-label={t('cinematic.lookDraft.generatedSheet')}>
    <p>{t('cinematic.lookDraft.generatedHint')}</p>
    {value ? <div className="character-look-generated__selection">
      <AuthenticatedMediaImage src={value.previewUrl} alt={t('cinematic.lookDraft.generatedPreview')}
        fallback={<p role="alert">{t('cinematic.lookDraft.previewFailed')}</p>}
        renderResolved={src => <img src={src} alt={t('cinematic.lookDraft.generatedPreview')}
          onLoad={() => { setPreviewFailed(false); onPreviewReady(true); }}
          onError={() => { setPreviewFailed(true); onPreviewReady(false); }} />} />
      {previewFailed ? <p role="alert">{t('cinematic.lookDraft.previewFailed')}</p> : null}
      <span>{value.modelId}</span><small>{expiry(value)}</small>
      <Button type="button" disabled={disabled} icon={<RefreshCw aria-hidden="true" />}
        onClick={() => { onChange(null); setPreviewFailed(false); onPreviewReady(false); }}>{t('cinematic.lookDraft.changeGenerated')}</Button>
    </div> : <>
      {page.isFetching ? <p role="status"><ProcessingSpinner />{t('cinematic.lookDraft.generatedLoading')}</p> : null}
      {page.isError ? <div role="alert">{t('cinematic.lookDraft.generatedError')}
        <Button type="button" icon={<RefreshCw aria-hidden="true" />} onClick={() => void page.refetch()}>{t('cinematic.lookDraft.generatedRetry')}</Button>
      </div> : null}
      {!page.isFetching && !page.isError && !items.length ? <p>{t('cinematic.lookDraft.generatedEmpty')}</p> : null}
      <div className="character-look-generated__grid">
        {items.map(item => <button key={item.id} type="button" disabled={disabled || page.isFetching}
          onClick={() => { onPreviewReady(false); onChange(item); }}>
          <AuthenticatedMediaImage src={item.previewUrl} alt={item.modelId} />
          <strong>{item.modelId}</strong><small>{expiry(item)}</small>
        </button>)}
      </div>
      <nav aria-label={t('cinematic.lookDraft.generatedPages')}>
        <Button type="button" size="icon" icon={<ChevronLeft aria-hidden="true" />}
          aria-label={t('cinematic.lookDraft.generatedPrevious')} disabled={disabled || page.isFetching || cursors.length === 1}
          onClick={() => setCursors(current => current.slice(0, -1))} />
        <span>{cursors.length}</span>
        <Button type="button" size="icon" icon={<ChevronRight aria-hidden="true" />}
          aria-label={t('cinematic.lookDraft.generatedNext')} disabled={disabled || page.isFetching || !page.data?.hasMore || !page.data.nextCursor}
          onClick={() => setCursors(current => [...current, page.data!.nextCursor!])} />
      </nav>
    </>}
  </section>;
}
