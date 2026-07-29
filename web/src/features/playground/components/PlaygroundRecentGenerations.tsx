import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GenerationImageViewer,
  type GenerationViewerItem
} from '../../../components/media/GenerationImageViewer';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { useActor } from '../../../lib/auth/ActorProvider';
import { listHistory } from '../../history/api/historyApi';

const RECENT_LIMIT = 6;

export function PlaygroundRecentGenerations() {
  const { t } = useTranslation('playground');
  const { actor } = useActor();
  const [activeId, setActiveId] = useState<string | null>(null);
  const history = useQuery({
    queryKey: ['history', actor?.userId || 'loading', 'playground-recent'],
    queryFn: () => listHistory(null, 'all'),
    enabled: Boolean(actor),
    staleTime: 20_000
  });
  const items = (history.data?.items || [])
    .filter(item => item.mode === 'playground' || item.mode === 'normal')
    .slice(0, RECENT_LIMIT);
  const viewerItems: GenerationViewerItem[] = items.map(item => ({
    id: item.id,
    imageUrl: item.imageUrl,
    prompt: item.prompt,
    provider: item.provider,
    model: item.submodel,
    timestamp: item.timestamp,
    generationDuration: item.generationDuration,
    width: item.width,
    height: item.height,
    creditCost: item.creditCost,
    generationMode: item.mode
  }));

  if (!items.length) {
    return <p className="playground-recent-panel__empty">{t('playground.queue.empty')}</p>;
  }
  return (
    <>
      <div className="playground-recent-grid">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            className="playground-recent-grid__item"
            title={t('playground.result.openImage')}
            onClick={() => setActiveId(item.id)}
          >
            <img
              src={apiMediaUrl(item.thumbnailUrl || item.imageUrl) || undefined}
              alt={t('playground.result.imageAlt')}
              loading="lazy"
            />
          </button>
        ))}
      </div>
      <GenerationImageViewer
        items={viewerItems}
        activeId={activeId}
        open={Boolean(activeId)}
        canRevealPrompt={actor?.role === 'admin'}
        onOpenChange={open => {
          if (!open) setActiveId(null);
        }}
        onActiveIdChange={setActiveId}
      />
    </>
  );
}
