import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, FolderPlus, Minus, Plus, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  addImageToCollection,
  createCollection,
  listCollections,
  removeImageFromCollection
} from '../../features/collections/api/collectionApi';
import { Button } from '../ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../ui/AsyncState';
import { useActor } from '../../lib/auth/ActorProvider';

export function CollectionPickerDialog({ jobId }: { jobId: string }) {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [completedCollectionId, setCompletedCollectionId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const collections = useQuery({
    queryKey: ['collections', actorId],
    queryFn: listCollections,
    enabled: open
  });
  async function refreshCollections(collectionId?: string) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['collections', actorId] }),
      collectionId
        ? queryClient.invalidateQueries({ queryKey: ['collection', actorId, collectionId] })
        : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: ['history', actorId] })
    ]);
  }
  const toggleMembership = useMutation({
    mutationFn: async ({ collectionId, included }: {
      collectionId: string;
      included: boolean;
    }) => included
      ? removeImageFromCollection(collectionId, jobId)
      : addImageToCollection(collectionId, jobId),
    onSuccess: async (_, { collectionId, included }) => {
      setCompletedCollectionId(collectionId);
      await refreshCollections(collectionId);
      if (included) setCompletedCollectionId(null);
    }
  });
  const createAndAdd = useMutation({
    mutationFn: async (name: string) => {
      const collection = await createCollection({ name });
      await addImageToCollection(collection.id, jobId);
      return collection;
    },
    onSuccess: async collection => {
      setNewCollectionName('');
      setCompletedCollectionId(collection.id);
      await refreshCollections(collection.id);
    }
  });
  function submitNewCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCollectionName.trim();
    if (name) createAndAdd.mutate(name);
  }
  const pending = toggleMembership.isPending || createAndAdd.isPending;

  const mutationError = toggleMembership.error || createAndAdd.error;

  function closeDialogState(next: boolean) {
    setOpen(next);
    if (!next) {
      setCompletedCollectionId(null);
      setNewCollectionName('');
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={closeDialogState}
    >
      <Dialog.Trigger asChild>
        <Button icon={<FolderPlus className="size-4" />}>{t('ui.action.addCollection')}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[121] max-h-[80vh] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 overflow-auto border border-[var(--mpf-border-strong)] bg-[var(--mpf-bg-raised)] p-5 shadow-[var(--mpf-shadow-raised)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="m-0 text-xl">{t('ui.action.addCollection')}</Dialog.Title>
              <Dialog.Description className="mb-0 mt-1 text-sm text-[var(--mpf-text-muted)]">
                {t('ui.collections.pickerDescription')}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button size="icon" variant="ghost" title={t('ui.action.close')} icon={<X className="size-4" />} />
            </Dialog.Close>
          </div>
          <form className="collection-picker__create" onSubmit={submitNewCollection}>
            <label htmlFor={`collection-name-${jobId}`}>{t('ui.collections.new')}</label>
            <div>
              <input
                id={`collection-name-${jobId}`}
                value={newCollectionName}
                onChange={event => setNewCollectionName(event.target.value)}
                maxLength={80}
                placeholder={t('ui.collections.name')}
              />
              <Button
                type="submit"
                size="sm"
                icon={<Plus aria-hidden="true" />}
                disabled={pending || !newCollectionName.trim()}
              >
                {t('ui.action.create')}
              </Button>
            </div>
          </form>
          <div className="mt-5 space-y-2">
            {collections.isLoading ? <LoadingState label={t('ui.collections.loading')} /> : null}
            {collections.isError ? (
              <ErrorState
                title={t('ui.collections.unavailable')}
                description={collections.error.message}
                onRetry={() => void collections.refetch()}
              />
            ) : null}
            {collections.data && !collections.data.collections.length ? (
              <EmptyState title={t('ui.collections.empty')} description={t('ui.collections.createHereHelp')} />
            ) : null}
            {collections.data?.collections.map(collection => {
              const included = collection.jobIds.includes(jobId);
              return (
                <button
                  key={collection.id}
                  type="button"
                  disabled={pending}
                  aria-pressed={included}
                  onClick={() => toggleMembership.mutate({
                    collectionId: collection.id,
                    included
                  })}
                  className={`collection-picker__row${included ? ' is-included' : ''}`}
                >
                  <span>
                    <strong>{collection.name}</strong>
                    <small>{t('ui.collections.imageCount', { count: collection.jobIds.length })}</small>
                  </span>
                  {included || completedCollectionId === collection.id
                    ? <Check aria-hidden="true" />
                    : <FolderPlus aria-hidden="true" />}
                  {included ? <Minus className="collection-picker__remove-mark" aria-hidden="true" /> : null}
                </button>
              );
            })}
            {mutationError ? <p role="alert" className="text-sm text-red-300">{mutationError.message}</p> : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
