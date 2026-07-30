import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { WorkingCollectionToolbar } from '../../../components/collections/WorkingCollectionToolbar';
import { FaceReferenceDestinationDialog } from '../../../components/generation/FaceReferenceDestinationDialog';
import { CharacterReferenceSceneAction } from '../../../components/generation/CharacterReferenceSceneAction';
import { CreateCharacterProfileDialog } from '../../../components/profiles/CreateCharacterProfileDialog';

export function StudioRecentGenerations({ limit = 12 }: { limit?: number }) {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState('all');
  useEffect(() => {
    setActiveId(null);
    setSelectedCollectionId('all');
  }, [actor?.userId]);
  const history = useQuery({
    queryKey: [
      'history',
      actor?.userId || 'loading',
      'studio-recent',
      selectedCollectionId
    ],
    queryFn: () => listHistory(null, selectedCollectionId),
    enabled: Boolean(actor),
    staleTime: 20_000
  });
  const historyItems = history.data?.items || [];
  const items = historyItems.slice(0, limit);

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
    generationMode: item.mode,
    characterSheetConfig: item.characterSheetConfig,
    parentImages: lineageReferences(item)
      .map(reference => ({
        ...reference,
        parent: historyItems.find(candidate => candidate.id === reference.id)
      }))
      .filter(reference => Boolean(reference.parent?.imageUrl))
      .map(reference => ({
        id: reference.parent!.id,
        imageUrl: reference.parent!.imageUrl,
        thumbnailUrl: reference.parent!.thumbnailUrl,
        role: reference.role,
        href: `/history/${encodeURIComponent(reference.parent!.id)}`
      }))
  }));

  return (
    <>
      <div className="studio-history-region">
        <WorkingCollectionToolbar
          selectedCollectionId={selectedCollectionId}
          loadedCount={historyItems.length}
          hasMore={history.data?.hasMore}
          onSelectionChange={collectionId => {
            setActiveId(null);
            setSelectedCollectionId(collectionId);
          }}
        />
        <section className="studio-recent" aria-labelledby="studio-recent-title">
          <header className="studio-recent__header">
            <h2 id="studio-recent-title">{t('ui.studio.recent')}</h2>
            <Link to="/history">
              {t('ui.studio.viewAll')} <ArrowRight aria-hidden="true" />
            </Link>
          </header>
          {items.length ? (
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
          ) : (
            <p className="studio-recent__empty">{t('ui.studio.noRecent')}</p>
          )}
        </section>
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
        renderActions={item => (
          <>
            {item.generationMode === 'headshot' ? (
              <FaceReferenceDestinationDialog
                source={{ sourceType: 'generation', sourceId: item.id }}
                imageUrl={item.imageUrl}
                onHandoffComplete={() => setActiveId(null)}
              />
            ) : null}
            {item.generationMode === 'character-sheet' ? (
              <>
                <CreateCharacterProfileDialog jobId={item.id} />
                <CharacterReferenceSceneAction
                  imageUrl={item.imageUrl}
                  sourceJobId={item.id}
                  characterType={item.characterSheetConfig?.characterType
                    || 'styled_character'}
                  onHandoffComplete={() => setActiveId(null)}
                />
              </>
            ) : null}
            <ShareGeneratedDialog jobId={item.id} />
          </>
        )}
      />
    </>
  );
}

function lineageReferences(item: {
  referencedFaceJobIds: string[];
  referencedStyleJobIds: string[];
  referencedCharacterJobIds: string[];
  referencedOutfitJobIds: string[];
}) {
  const references = [
    ...item.referencedCharacterJobIds.map(id => ({ id, role: 'character' as const })),
    ...item.referencedFaceJobIds.map(id => ({ id, role: 'face' as const })),
    ...item.referencedStyleJobIds.map(id => ({ id, role: 'style' as const })),
    ...item.referencedOutfitJobIds.map(id => ({ id, role: 'outfit' as const }))
  ];
  return references.filter((reference, index) =>
    references.findIndex(candidate => candidate.id === reference.id) === index
  );
}
