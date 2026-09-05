import { useQuery } from '@tanstack/react-query';
import { Pencil, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  listCollections,
  publishCollectionToCommunity
} from '../../features/collections/api/collectionApi';
import { useActor } from '../../lib/auth/ActorProvider';
import { PublishCommunityResourceDialog } from '../community/PublishCommunityResourceDialog';
import { Button } from '../ui/Button';
import { CollectionEditorDialog } from './CollectionEditorDialog';

type WorkingCollectionToolbarProps = {
  selectedCollectionId: string;
  loadedCount: number;
  hasMore?: boolean;
  layout?: 'compact' | 'library';
  onSelectionChange: (collectionId: string) => void;
};

export function WorkingCollectionToolbar({
  selectedCollectionId,
  loadedCount,
  hasMore = false,
  layout = 'compact',
  onSelectionChange
}: WorkingCollectionToolbarProps) {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const collections = useQuery({
    queryKey: ['collections', actorId],
    queryFn: listCollections,
    enabled: Boolean(actor)
  });
  const activeCollection = collections.data?.collections.find(
    collection => collection.id === selectedCollectionId
  ) || null;
  const effectiveCollectionId = activeCollection?.id || 'all';
  const visibleCount = activeCollection?.jobIds.length ?? loadedCount;

  return (
    <section
      className={`studio-working-collection studio-working-collection--${layout}`}
      aria-label={t('ui.collections.working')}
    >
      <label className="studio-working-collection__select">
        <span>{t('ui.collections.filterLabel')}</span>
        <select
          value={effectiveCollectionId}
          disabled={collections.isLoading}
          onChange={event => onSelectionChange(event.target.value)}
        >
          <option value="all">
            {t('ui.collections.allImages', {
              count: loadedCount,
              suffix: hasMore ? '+' : ''
            })}
          </option>
          {collections.data?.collections.map(collection => (
            <option key={collection.id} value={collection.id}>
              {collection.name} ({collection.jobIds.length})
            </option>
          ))}
        </select>
      </label>
      <strong className="studio-working-collection__count">
        {t('ui.collections.imageCount', { count: visibleCount })}
      </strong>
      <div className="studio-working-collection__actions">
        <CollectionEditorDialog onSaved={onSelectionChange} />
        {activeCollection ? layout === 'library' ? (
          <CollectionEditorDialog
            collection={activeCollection}
            trigger={(
              <Button
                size="icon"
                title={t('ui.collections.edit')}
                aria-label={t('ui.collections.edit')}
                icon={<Pencil aria-hidden="true" />}
              />
            )}
          />
        ) : <CollectionEditorDialog collection={activeCollection} /> : null}
        {activeCollection?.jobIds.length ? (
          <PublishCommunityResourceDialog
            title={t('ui.collections.shareTitle')}
            description={t('ui.collections.shareDescription')}
            actionLabel={t('ui.collections.share')}
            triggerClassName="studio-working-collection__share"
            trigger={layout === 'library' ? (
              <Button
                size="icon"
                variant="primary"
                className="studio-working-collection__share"
                title={t('ui.collections.share')}
                aria-label={t('ui.collections.share')}
                icon={<Share2 aria-hidden="true" />}
              />
            ) : undefined}
            publish={input => publishCollectionToCommunity(activeCollection.id, input)}
          />
        ) : layout === 'compact' ? (
          <Button
            size="sm"
            variant="primary"
            disabled
            className="studio-working-collection__share"
          >
            {t('ui.collections.share')}
          </Button>
        ) : null}
      </div>
      {collections.isError ? (
        <p role="alert" className="studio-working-collection__error">
          {collections.error.message}
        </p>
      ) : null}
    </section>
  );
}
