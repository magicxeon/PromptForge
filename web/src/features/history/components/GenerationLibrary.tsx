import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Film, Image as ImageIcon, LoaderCircle, Play, Trash2 } from 'lucide-react';
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
import {
  GenerationVideoViewer,
  type GenerationVideoViewerItem
} from '../../../components/media/GenerationVideoViewer';
import { CreateCharacterProfileDialog } from '../../../components/profiles/CreateCharacterProfileDialog';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { useActor } from '../../../lib/auth/ActorProvider';
import { deleteHistoryItem, listHistory } from '../api/historyApi';
import type { HistoryItem } from '../schemas/historySchemas';
import { routeBuilders, routePaths } from '../../../app/routeRegistry/routes';
import { listRecentVideoTasks } from '../../generation/api/videoGenerationApi';
import type { VideoTask } from '../../generation/schemas/videoGenerationSchemas';

type MediaFilter = 'all' | 'image' | 'video';

type GenerationLibraryProps = {
  variant: 'compact' | 'full';
  limit?: number;
};

export function GenerationLibrary({ variant, limit = 12 }: GenerationLibraryProps) {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const actorId = actor?.userId || 'loading';
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [selectedCollectionId, setSelectedCollectionId] = useState('all');
  const history = useInfiniteQuery({
    queryKey: ['history', actorId, 'generation-library', selectedCollectionId],
    queryFn: ({ pageParam }) => listHistory(pageParam, selectedCollectionId),
    enabled: Boolean(actor),
    initialPageParam: null as string | null,
    getNextPageParam: page => variant === 'full' ? page.nextCursor || undefined : undefined,
    staleTime: 20_000
  });
  const videos = useQuery({
    queryKey: ['video-generation', actorId, 'library-recent'],
    queryFn: () => listRecentVideoTasks(24),
    enabled: Boolean(actor && variant === 'full' && selectedCollectionId === 'all'),
    staleTime: 20_000
  });
  const remove = useMutation({
    mutationFn: (jobId: string) => deleteHistoryItem(jobId),
    onSuccess: (_, jobId) => {
      setActiveImageId(current => current === jobId ? null : current);
      void queryClient.invalidateQueries({ queryKey: ['history', actorId] });
    }
  });

  useEffect(() => {
    setActiveImageId(null);
    setActiveVideoId(null);
    setMediaFilter('all');
    setSelectedCollectionId('all');
  }, [actorId]);

  const loadedItems = history.data?.pages.flatMap(page => page.items) || [];
  const items = variant === 'compact' ? loadedItems.slice(0, limit) : loadedItems;
  const viewerItems = toViewerItems(items, loadedItems);
  const videoItems = variant === 'full' && selectedCollectionId === 'all'
    ? videos.data?.items || []
    : [];
  const videoViewerItems = videoItems
    .filter(task => Boolean(task.outputAsset?.publicUrl))
    .map(toVideoViewerItem);
  const visibleMedia = buildVisibleMedia(items, videoItems, variant === 'compact' ? 'image' : mediaFilter);
  const loading = history.isLoading || (variant === 'full' && mediaFilter !== 'image' && videos.isLoading);
  const hasError = history.isError || (variant === 'full' && mediaFilter !== 'image' && videos.isError);

  return (
    <>
      <div className={`generation-library generation-library--${variant}${variant === 'compact' ? ' studio-history-region' : ''}`}>
        {variant === 'full' ? (
          <header className="generation-library__page-header">
            <div>
              <span>{t('ui.history.kicker')}</span>
              <h1>{t('ui.studio.recent')}</h1>
            </div>
            <div className="generation-library__media-filter" role="group" aria-label={t('ui.history.mediaFilter')}>
              {(['all', 'image', 'video'] as const).map(value => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mediaFilter === value}
                  onClick={() => {
                    setActiveImageId(null);
                    setActiveVideoId(null);
                    setMediaFilter(value);
                  }}
                >
                  {value === 'image' ? <ImageIcon aria-hidden="true" /> : null}
                  {value === 'video' ? <Film aria-hidden="true" /> : null}
                  {t(`ui.history.media.${value}`)}
                </button>
              ))}
            </div>
          </header>
        ) : null}
        {variant === 'compact' || mediaFilter !== 'video' ? (
          <WorkingCollectionToolbar
            selectedCollectionId={selectedCollectionId}
            loadedCount={loadedItems.length}
            hasMore={history.hasNextPage}
            onSelectionChange={collectionId => {
              setActiveImageId(null);
              setActiveVideoId(null);
              setSelectedCollectionId(collectionId);
            }}
          />
        ) : null}
        <section className="studio-recent" aria-labelledby={`generation-library-${variant}-title`}>
          <header className="studio-recent__header">
            <h2 id={`generation-library-${variant}-title`}>{t('ui.studio.recent')}</h2>
            {variant === 'compact' ? (
              <Link to={routePaths.libraryRecent}>
                {t('ui.studio.viewAll')} <ArrowRight aria-hidden="true" />
              </Link>
            ) : null}
          </header>
          {loading ? <LoadingState label={t('ui.history.loading')} /> : null}
          {hasError ? (
            <ErrorState
              title={t('ui.history.unavailable')}
              description={history.error?.message || videos.error?.message}
              onRetry={() => {
                void history.refetch();
                if (variant === 'full') void videos.refetch();
              }}
            />
          ) : null}
          {!loading && !visibleMedia.length ? (
            variant === 'full'
              ? <EmptyState title={t('ui.history.empty')} />
              : <p className="studio-recent__empty">{t('ui.studio.noRecent')}</p>
          ) : null}
          {visibleMedia.length ? (
            <div className="studio-recent__grid">
              {visibleMedia.map(entry => entry.mediaType === 'image' ? (
                <button
                  key={`image:${entry.item.id}`}
                  type="button"
                  className="studio-recent__item"
                  title={t('ui.viewer.title')}
                  onClick={() => setActiveImageId(entry.item.id)}
                >
                  <img
                    src={apiMediaUrl(entry.item.thumbnailUrl || entry.item.imageUrl) || undefined}
                    alt={t('ui.studio.generatedImage')}
                    loading="lazy"
                  />
                  <span>{entry.item.submodel || entry.item.provider}</span>
                </button>
              ) : <VideoRecentCard key={`video:${entry.item.id}`} task={entry.item} onOpen={setActiveVideoId} />)}
            </div>
          ) : null}
          {variant === 'full' && mediaFilter !== 'video' && history.hasNextPage ? (
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
        activeId={activeImageId}
        open={Boolean(activeImageId)}
        canRevealPrompt={actor?.role === 'admin'}
        onOpenChange={open => {
          if (!open) setActiveImageId(null);
        }}
        onActiveIdChange={setActiveImageId}
        renderActions={item => (
          <>
            {item.generationMode === 'headshot' ? (
              <FaceReferenceDestinationDialog
                source={{ sourceType: 'generation', sourceId: item.id }}
                imageUrl={item.imageUrl}
                onHandoffComplete={() => setActiveImageId(null)}
              />
            ) : null}
            {item.generationMode === 'character-sheet' ? (
              <>
                <CreateCharacterProfileDialog jobId={item.id} />
                <CharacterReferenceSceneAction
                  imageUrl={item.imageUrl}
                  sourceJobId={item.id}
                  characterType={item.characterSheetConfig?.characterType || 'styled_character'}
                  onHandoffComplete={() => setActiveImageId(null)}
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
      <GenerationVideoViewer
        items={videoViewerItems}
        activeId={activeVideoId}
        open={Boolean(activeVideoId)}
        onOpenChange={open => {
          if (!open) setActiveVideoId(null);
        }}
        onActiveIdChange={setActiveVideoId}
      />
    </>
  );
}

type VisibleMedia =
  | { mediaType: 'image'; item: HistoryItem; timestamp: number }
  | { mediaType: 'video'; item: VideoTask; timestamp: number };

export function buildVisibleMedia(
  images: HistoryItem[],
  videos: VideoTask[],
  filter: MediaFilter
): VisibleMedia[] {
  const imageEntries: VisibleMedia[] = filter === 'video' ? [] : images.map(item => ({
    mediaType: 'image',
    item,
    timestamp: Number(item.timestamp) || 0
  }));
  const videoEntries: VisibleMedia[] = filter === 'image' ? [] : videos.map(item => ({
    mediaType: 'video',
    item,
    timestamp: Date.parse(item.createdAt || item.updatedAt || '') || 0
  }));
  return [...imageEntries, ...videoEntries].sort((left, right) => right.timestamp - left.timestamp);
}

function VideoRecentCard({ task, onOpen }: { task: VideoTask; onOpen: (id: string) => void }) {
  const { t } = useTranslation('react-ui');
  const playable = Boolean(task.outputAsset?.publicUrl);
  const running = ['queued', 'provider_queued', 'provider_processing'].includes(task.status);
  return (
    <button
      type="button"
      className="studio-recent__item studio-recent__item--video"
      title={playable ? t('ui.videoViewer.title') : task.status}
      aria-disabled={!playable}
      onClick={() => playable && onOpen(task.id)}
    >
      {task.outputAsset?.posterUrl ? (
        <img src={apiMediaUrl(task.outputAsset.posterUrl) || undefined} alt="" loading="lazy" />
      ) : (
        <div className="studio-recent__video-placeholder" aria-hidden="true">
          {running ? <LoaderCircle className="animate-spin" /> : <Film />}
        </div>
      )}
      {playable ? <Play className="studio-recent__play" aria-hidden="true" /> : null}
      <span>{task.modelId || task.providerId || task.status}</span>
      <small>{formatVideoStatus(task)}</small>
    </button>
  );
}

function formatVideoStatus(task: VideoTask) {
  if (task.status === 'completed' && task.durationSeconds) {
    return `${task.durationSeconds}s`;
  }
  return task.status.replaceAll('_', ' ');
}

function toVideoViewerItem(task: VideoTask): GenerationVideoViewerItem {
  const request = task.submittedRequest;
  return {
    id: task.id,
    videoUrl: task.outputAsset?.publicUrl || '',
    posterUrl: task.outputAsset?.posterUrl,
    status: task.status,
    provider: task.providerId,
    model: task.modelId,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    clipDurationSeconds: task.durationSeconds ?? request?.durationSeconds,
    aspectRatio: task.aspectRatio ?? request?.aspectRatio,
    resolution: task.resolution ?? request?.resolution,
    audioMode: request?.audioMode,
    operation: task.operation ?? request?.operation,
    creditCost: task.estimatedCredits,
    characterProfileId: request?.characterAttributions?.[0]?.characterProfileId || null
  };
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
