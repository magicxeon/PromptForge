import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, Pencil, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createCollection,
  updateCollection
} from '../../features/collections/api/collectionApi';
import type { Collection } from '../../features/collections/schemas/collectionSchemas';
import { useActor } from '../../lib/auth/ActorProvider';
import { Button } from '../ui/Button';

type CollectionEditorDialogProps = {
  collection?: Collection | null;
  onSaved?: (collectionId: string) => void;
};

export function CollectionEditorDialog({
  collection = null,
  onSaved
}: CollectionEditorDialogProps) {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const save = useMutation({
    mutationFn: (input: { name: string; description: string }) => collection
      ? updateCollection(collection.id, input)
      : createCollection(input),
    onSuccess: async savedCollection => {
      await queryClient.invalidateQueries({ queryKey: ['collections', actorId] });
      setOpen(false);
      onSaved?.(savedCollection.id);
    }
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    if (!name) return;
    save.mutate({
      name,
      description: String(form.get('description') || '').trim()
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          size="sm"
          disabled={Boolean(!collection && !actor)}
          icon={collection
            ? <Pencil aria-hidden="true" />
            : <FolderPlus aria-hidden="true" />}
        >
          {collection ? t('ui.collections.edit') : t('ui.collections.newShort')}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[121] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 border border-[var(--mpf-border-strong)] bg-[var(--mpf-bg-raised)] p-5 shadow-[var(--mpf-shadow-raised)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="m-0 text-xl">
                {collection
                  ? t('ui.collections.editTitle')
                  : t('ui.collections.new')}
              </Dialog.Title>
              <Dialog.Description className="mb-0 mt-1 text-sm text-[var(--mpf-text-muted)]">
                {t('ui.collections.editorDescription')}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                size="icon"
                variant="ghost"
                title={t('ui.action.close')}
                icon={<X aria-hidden="true" />}
              />
            </Dialog.Close>
          </div>
          <form
            key={collection?.id || 'new-collection'}
            className="mt-5 grid gap-3"
            onSubmit={submit}
          >
            <input
              name="name"
              required
              maxLength={80}
              defaultValue={collection?.name || ''}
              placeholder={t('ui.collections.name')}
              className="h-11 border border-[var(--mpf-border)] bg-black/35 px-3"
            />
            <textarea
              name="description"
              maxLength={300}
              defaultValue={collection?.description || ''}
              placeholder={t('ui.share.postDescription')}
              className="h-24 resize-y border border-[var(--mpf-border)] bg-black/35 p-3"
            />
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  {t('ui.action.cancel')}
                </Button>
              </Dialog.Close>
              <Button type="submit" variant="primary" disabled={save.isPending}>
                {t('ui.collections.save')}
              </Button>
            </div>
          </form>
          {save.isError ? (
            <p role="alert" className="text-sm text-red-300">
              {save.error.message}
            </p>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
