import { Check, Film, Play, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import { ProcessingSpinner } from '../../../../components/ui/ProcessingSpinner';

export function VideoTakeList({ attempts, previewId, approvedId, onPreview }: {
  attempts: Record<string, unknown>[]; previewId: string | null; approvedId?: string | null;
  onPreview: (id: string) => void;
}) {
  const { t } = useTranslation('cinematic');
  const [limit, setLimit] = useState(8);
  return <section className="cinematic-takes" aria-label={t('cinematic.takes.title')}>
    <h4>{t('cinematic.takes.title')} <small>{attempts.length}</small></h4>
    <div className="cinematic-takes-grid">{attempts.slice(-limit).reverse().map((attempt, index) => {
      const id = String(attempt.id), status = String(attempt.status || 'pending');
      const active = ['pending', 'accepted', 'preparing', 'queued', 'processing', 'provider_processing', 'provider_queued', 'provider_submitting', 'media_copying'].includes(status);
      const asset = attempt.outputAsset as { posterUrl?: string } | undefined;
      return <button key={id} type="button" className={`cinematic-take${previewId === id ? ' is-preview' : ''}`} aria-pressed={previewId === id} onClick={() => onPreview(id)}>
        <span className="cinematic-take-poster">{asset?.posterUrl ? <img src={asset.posterUrl} alt="" /> : <Film aria-hidden="true" />}{active ? <ProcessingSpinner className="size-5" /> : <Play className="size-4" aria-hidden="true" />}</span>
        <span className="cinematic-take-info"><strong>{t('cinematic.takes.number', { number: attempts.length - index })}</strong><small>{String(attempt.modelLabel || attempt.modelId || '')}</small>
          {Number(attempt.renderDurationMs) > 0 ? <small>{t('cinematic.takes.duration', { seconds: Number(attempt.renderDurationMs) / 1000 })}</small> : null}
          {approvedId === id ? <span className="cinematic-take-selected"><Check aria-hidden="true" />{t('cinematic.takes.selected')}</span>
            : <small>{t(active ? 'cinematic.produce.generating' : ['completed', 'superseded'].includes(status) ? 'cinematic.storyboard.status.review' : status === 'failed' ? 'cinematic.storyboard.status.failed' : 'cinematic.storyboard.status.draft')}</small>}
        </span>
      </button>;
    })}</div>
    {attempts.length > limit ? <Button size="sm" icon={<Plus />} onClick={() => setLimit(value => value + 8)}>{t('cinematic.takes.more')}</Button> : null}
  </section>;
}
