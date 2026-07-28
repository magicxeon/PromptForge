import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { useActor } from '../../../lib/auth/ActorProvider';
import { listHistory } from '../../history/api/historyApi';
import {
  GenerationImageViewer,
  type GenerationViewerItem
} from '../../../components/media/GenerationImageViewer';
import { ShareGeneratedDialog } from '../../../components/community/ShareGeneratedDialog';

export function StudioRecentGenerations({ limit = 4 }: { limit?: number }) {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const [activeId, setActiveId] = useState<string | null>(null);
  const history = useQuery({
    queryKey: ['history', actor?.userId || 'loading', 'studio-recent'],
    queryFn: () => listHistory(null, 'all'),
    enabled: Boolean(actor),
    staleTime: 20_000
  });
  const historyItems = history.data?.items || [];
  const items = historyItems.slice(0, limit);
  if (!items.length) return null;

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
    parentImages: lineageIds(item)
      .map(parentId => historyItems.find(candidate => candidate.id === parentId))
      .filter(parent => Boolean(parent?.imageUrl))
      .map(parent => ({
        id: parent!.id,
        imageUrl: parent!.imageUrl,
        thumbnailUrl: parent!.thumbnailUrl
      }))
  }));

  return (
    <section className="studio-recent" aria-labelledby="studio-recent-title">
      <header className="studio-recent__header">
        <h2 id="studio-recent-title">{t('ui.studio.recent')}</h2>
        <Link to="/history">
          {t('ui.studio.viewAll')} <ArrowRight aria-hidden="true" />
        </Link>
      </header>
      <div className="studio-recent__grid">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            className="studio-recent__item"
            title={t('ui.viewer.title')}
            onClick={() => setActiveId(item.id)}
          >
            <img
              src={apiMediaUrl(item.thumbnailUrl || item.imageUrl) || undefined}
              alt={t('ui.studio.generatedImage')}
              loading="lazy"
            />
            <span>{item.submodel || item.provider}</span>
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
        renderActions={item => <ShareGeneratedDialog jobId={item.id} />}
      />
    </section>
  );
}

function lineageIds(item: {
  referencedFaceJobIds: string[];
  referencedStyleJobIds: string[];
  referencedCharacterJobIds: string[];
  referencedOutfitJobIds: string[];
}) {
  return [...new Set([
    ...item.referencedCharacterJobIds,
    ...item.referencedFaceJobIds,
    ...item.referencedStyleJobIds,
    ...item.referencedOutfitJobIds
  ])];
}
