import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, FolderPlus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addImageToCollection, listCollections } from '../../features/collections/api/collectionApi';
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
  const collections = useQuery({
    queryKey: ['collections', actorId],
    queryFn: listCollections,
    enabled: open
  });
  const add = useMutation({
    mutationFn: (collectionId: string) => addImageToCollection(collectionId, jobId),
    onSuccess: async (_, collectionId) => {
      setCompletedCollectionId(collectionId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['collections', actorId] }),
        queryClient.invalidateQueries({ queryKey: ['collection', actorId, collectionId] }),
        queryClient.invalidateQueries({ queryKey: ['history'] })
      ]);
    }
  });

  return (
    <Dialog.Root
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (!next) setCompletedCollectionId(null);
      }}
    >
      <Dialog.Trigger asChild>
        <Button icon={<FolderPlus className="size-4" />}>{t('ui.action.addCollection')}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[91] max-h-[80vh] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 overflow-auto border border-[var(--mpf-border-strong)] bg-[var(--mpf-bg-raised)] p-5 shadow-[var(--mpf-shadow-raised)]">
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
              <EmptyState title={t('ui.collections.empty')} description={t('ui.collections.emptyHelp')} />
            ) : null}
            {collections.data?.collections.map(collection => (
              <button
                key={collection.id}
                type="button"
                disabled={add.isPending}
                onClick={() => add.mutate(collection.id)}
                className="flex min-h-14 w-full items-center justify-between gap-3 border border-[var(--mpf-border)] bg-black/20 px-4 text-left hover:border-cyan-400/50 disabled:opacity-60"
              >
                <span>
                  <strong className="block text-sm">{collection.name}</strong>
                  <small className="text-[var(--mpf-text-muted)]">{t('ui.collections.imageCount', { count: collection.jobIds.length })}</small>
                </span>
                {completedCollectionId === collection.id ? <Check className="size-5 text-emerald-300" /> : null}
              </button>
            ))}
            {add.isError ? <p role="alert" className="text-sm text-red-300">{add.error.message}</p> : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
