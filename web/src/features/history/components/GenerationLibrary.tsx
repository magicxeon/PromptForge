import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShareGeneratedDialog } from '../../../components/community/ShareGeneratedDialog';
import { WorkingCollectionToolbar } from '../../../components/collections/WorkingCollectionToolbar';
import { CharacterReferenceSceneAction } from '../../../components/generation/CharacterReferenceSceneAction';
import { FaceReferenceDestinationDialog } from '../../../components/generation/FaceReferenceDestinationDialog';
import {
  GenerationImageViewer,
  type GenerationViewerItem
} from '../../../components/media/GenerationImageViewer';
import { CreateCharacterProfileDialog } from '../../../components/profiles/CreateCharacterProfileDialog';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { useActor } from '../../../lib/auth/ActorProvider';
import { deleteHistoryItem, listHistory } from '../api/historyApi';
import type { HistoryItem } from '../schemas/historySchemas';
import { routeBuilders, routePaths } from '../../../app/routeRegistry/routes';

type GenerationLibraryProps = {
  variant: 'compact' | 'full';
  limit?: number;
};

export function GenerationLibrary({ variant, limit = 12 }: GenerationLibraryProps) {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const actorId = actor?.userId || 'loading';
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState('all');
  const history = useInfiniteQuery({
    queryKey: ['history', actorId, 'generation-library', selectedCollectionId],
    queryFn: ({ pageParam }) => listHistory(pageParam, selectedCollectionId),
    enabled: Boolean(actor),
    initialPageParam: null as string | null,
    getNextPageParam: page => variant === 'full' ? page.nextCursor || undefined : undefined,
    staleTime: 20_000
  });
  const remove = useMutation({
    mutationFn: (jobId: string) => deleteHistoryItem(jobId),
    onSuccess: (_, jobId) => {
      setActiveId(current => current === jobId ? null : current);
      void queryClient.invalidateQueries({ queryKey: ['history', actorId] });
    }
  });

  useEffect(() => {
    setActiveId(null);
    setSelectedCollectionId('all');
  }, [actorId]);

  const loadedItems = history.data?.pages.flatMap(page => page.items) || [];
  const items = variant === 'compact' ? loadedItems.slice(0, limit) : loadedItems;
  const viewerItems = toViewerItems(items, loadedItems);

  return (
    <>
      <div className={`generation-library generation-library--${variant}${variant === 'compact' ? ' studio-history-region' : ''}`}>
        {variant === 'full' ? (
          <header className="generation-library__page-header">
            <div>
              <span>{t('ui.history.kicker')}</span>
              <h1>{t('ui.studio.recent')}</h1>
            </div>
          </header>
        ) : null}
        <WorkingCollectionToolbar
          selectedCollectionId={selectedCollectionId}
          loadedCount={loadedItems.length}
          hasMore={history.hasNextPage}
          onSelectionChange={collectionId => {
            setActiveId(null);
            setSelectedCollectionId(collectionId);
          }}
        />
        <section className="studio-recent" aria-labelledby={`generation-library-${variant}-title`}>
          <header className="studio-recent__header">
            <h2 id={`generation-library-${variant}-title`}>{t('ui.studio.recent')}</h2>
            {variant === 'compact' ? (
              <Link to={routePaths.libraryRecent}>
                {t('ui.studio.viewAll')} <ArrowRight aria-hidden="true" />
              </Link>
            ) : null}
          </header>
          {history.isLoading ? <LoadingState label={t('ui.history.loading')} /> : null}
          {history.isError ? (
            <ErrorState
              title={t('ui.history.unavailable')}
              description={history.error.message}
              onRetry={() => void history.refetch()}
            />
          ) : null}
          {!history.isLoading && !items.length ? (
            variant === 'full'
              ? <EmptyState title={t('ui.history.empty')} />
              : <p className="studio-recent__empty">{t('ui.studio.noRecent')}</p>
          ) : null}
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
          ) : null}
          {variant === 'full' && history.hasNextPage ? (
            <div className="generation-library__load-more">
              <Button
                disabled={history.isFetchingNextPage}
                onClick={() => void history.fetchNextPage()}
              >
                {t('ui.action.loadMore')}
              </Button>
            </div>
          ) : null}
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
                  characterType={item.characterSheetConfig?.characterType || 'styled_character'}
                  onHandoffComplete={() => setActiveId(null)}
                />
              </>
            ) : null}
            <ShareGeneratedDialog jobId={item.id} />
            {variant === 'full' ? (
              <ConfirmDialog
                trigger={(
                  <Button variant="danger" icon={<Trash2 className="size-4" />}>
                    {t('ui.action.delete')}
                  </Button>
                )}
                title={t('ui.history.deleteTitle')}
                description={t('ui.history.deleteDescription')}
                confirmLabel={t('ui.action.delete')}
                destructive
                pending={remove.isPending}
                onConfirm={() => remove.mutate(item.id)}
              />
            ) : null}
          </>
        )}
      />
    </>
  );
}

function toViewerItems(items: HistoryItem[], loadedItems: HistoryItem[]): GenerationViewerItem[] {
  return items.map(item => ({
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
        parent: loadedItems.find(candidate => candidate.id === reference.id)
      }))
      .filter(reference => Boolean(reference.parent?.imageUrl))
      .map(reference => ({
        id: reference.parent!.id,
        imageUrl: reference.parent!.imageUrl,
        thumbnailUrl: reference.parent!.thumbnailUrl,
        role: reference.role,
        href: routeBuilders.recentDetail(reference.parent!.id)
      }))
  }));
}

function lineageReferences(item: HistoryItem) {
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
