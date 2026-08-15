import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useActor } from '../../lib/auth/ActorProvider';
import { listCollections } from '../../features/collections/api/collectionApi';
import { CollectionPickerDialog } from './CollectionPickerDialog';

export function CollectionMembershipSection({ jobId }: { jobId: string }) {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const collections = useQuery({
    queryKey: ['collections', actorId],
    queryFn: listCollections,
    enabled: Boolean(actor && jobId),
    staleTime: 20_000
  });
  const memberships = collections.data?.collections.filter(collection =>
    collection.jobIds.includes(jobId)
  ) || [];

  return (
    <section className="generation-viewer__collection-section">
      <h3>{t('ui.collections.title')}</h3>
      {memberships.length ? (
        <div className="generation-viewer__collection-list">
          {memberships.map(collection => (
            <span key={collection.id}>{collection.name}</span>
          ))}
        </div>
      ) : null}
      <CollectionPickerDialog jobId={jobId} />
    </section>
  );
}
