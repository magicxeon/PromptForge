import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, X } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { getHistoryItem } from '../../history/api/historyApi';
import {
  getCollection,
  publishCollectionToCommunity,
  removeImageFromCollection
} from '../api/collectionApi';
import { useActor } from '../../../lib/auth/ActorProvider';
import { createReturnNavigationState } from '../../../lib/navigation/returnNavigation';
import { PublishCommunityResourceDialog } from '../../../components/community/PublishCommunityResourceDialog';
import { routePaths } from '../../../app/routeRegistry/routes';

export function CollectionDetailRoute() {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const { collectionId = '' } = useParams();
  const queryClient = useQueryClient();
  const collection = useQuery({
    queryKey: ['collection', actorId, collectionId],
    queryFn: () => getCollection(collectionId),
    enabled: Boolean(collectionId)
  });
  const remove = useMutation({
    mutationFn: (jobId: string) => removeImageFromCollection(collectionId, jobId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collection', actorId, collectionId] });
      void queryClient.invalidateQueries({ queryKey: ['collections', actorId] });
    }
  });
  if (collection.isLoading) return <LoadingState label={t('ui.collections.loadingOne')} />;
  if (collection.isError || !collection.data) return <ErrorState title={t('ui.collections.unavailableOne')} description={collection.error?.message} onRetry={() => void collection.refetch()} />;
  return (
    <main>
      <Link to={routePaths.libraryCollections} className="mb-4 inline-flex items-center gap-2 text-sm text-cyan-300 no-underline"><ArrowLeft className="size-4" />{t('ui.collections.title')}</Link>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--mpf-border)] pb-5">
        <div>
          <h1 className="m-0 text-3xl">{collection.data.name}</h1>
          <p className="text-sm text-[var(--mpf-text-muted)]">{collection.data.description}</p>
        </div>
        {collection.data.jobIds.length ? (
          <PublishCommunityResourceDialog
            title={t('ui.collections.shareTitle')}
            description={t('ui.collections.shareDescription')}
            actionLabel={t('ui.collections.share')}
            publish={input => publishCollectionToCommunity(collectionId, input)}
          />
        ) : null}
      </header>
      {!collection.data.jobIds.length ? <EmptyState title={t('ui.collections.emptyOne')} /> : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collection.data.jobIds.map(jobId => (
            <CollectionImage key={jobId} jobId={jobId} actorId={actorId} onRemove={() => remove.mutate(jobId)} />
          ))}
        </section>
      )}
    </main>
  );
}

function CollectionImage({ jobId, actorId, onRemove }: { jobId: string; actorId: string; onRemove: () => void }) {
  const { t } = useTranslation('react-ui');
  const location = useLocation();
  const image = useQuery({ queryKey: ['history-item', actorId, jobId], queryFn: () => getHistoryItem(jobId) });
  if (image.isLoading) return <div className="aspect-[4/5] animate-pulse bg-white/5" />;
  if (!image.data) return <div className="grid aspect-[4/5] place-items-center border border-[var(--mpf-border)] text-xs text-[var(--mpf-text-muted)]">{t('ui.collections.emptyImage')}</div>;
  return (
    <article className="relative overflow-hidden border border-[var(--mpf-border)] bg-black">
      <Link to={`/history/${jobId}`} state={createReturnNavigationState(location)}><img src={apiMediaUrl(image.data.thumbnailUrl || image.data.imageUrl) || ''} alt="" className="aspect-[4/5] w-full object-cover object-top" /></Link>
      <Button variant="ghost" title={t('ui.collections.remove')} className="absolute right-2 top-2 bg-black/70" icon={<X className="size-4" />} onClick={onRemove} />
    </article>
  );
}
