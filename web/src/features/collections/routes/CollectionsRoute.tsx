import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Folder, FolderPlus, Pin, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Surface } from '../../../components/ui/Surface';
import {
  createCollection,
  deleteCollection,
  listCollections,
  setDefaultCollection
} from '../api/collectionApi';
import { useActor } from '../../../lib/auth/ActorProvider';

export function CollectionsRoute() {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const collections = useQuery({ queryKey: ['collections', actorId], queryFn: listCollections, enabled: Boolean(actor) });
  const create = useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      setCreating(false);
      void queryClient.invalidateQueries({ queryKey: ['collections', actorId] });
    }
  });
  const remove = useMutation({
    mutationFn: deleteCollection,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['collections', actorId] })
  });
  const makeDefault = useMutation({
    mutationFn: setDefaultCollection,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['collections', actorId] })
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    create.mutate({
      name: String(form.get('name') || '').trim(),
      description: String(form.get('description') || '').trim()
    });
  }

  return (
    <main>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--mpf-border)] pb-5">
        <div>
          <span className="text-xs font-bold uppercase text-cyan-300">{t('ui.collections.kicker')}</span>
          <h1 className="mb-0 mt-2 text-3xl">{t('ui.collections.title')}</h1>
          <p className="mb-0 text-sm text-[var(--mpf-text-muted)]">{t('ui.collections.description')}</p>
        </div>
        <Button icon={<FolderPlus className="size-4" />} onClick={() => setCreating(value => !value)}>
          {t('ui.collections.new')}
        </Button>
      </header>

      {creating ? (
        <Surface className="mb-5 p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_1.5fr_auto]" onSubmit={submit}>
            <input name="name" required maxLength={80} placeholder={t('ui.collections.name')} className="h-11 border border-[var(--mpf-border)] bg-black/30 px-3" />
            <input name="description" maxLength={300} placeholder={t('ui.share.postDescription')} className="h-11 border border-[var(--mpf-border)] bg-black/30 px-3" />
            <Button type="submit" variant="primary" disabled={create.isPending}>{t('ui.action.create')}</Button>
          </form>
          {create.isError ? <p className="mb-0 text-sm text-red-300">{create.error.message}</p> : null}
        </Surface>
      ) : null}

      {collections.isLoading ? <LoadingState label={t('ui.collections.loading')} /> : null}
      {collections.isError ? <ErrorState title={t('ui.collections.unavailable')} description={collections.error.message} onRetry={() => void collections.refetch()} /> : null}
      {!collections.isLoading && !collections.data?.collections.length ? <EmptyState title={t('ui.collections.empty')} /> : null}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {collections.data?.collections.map(collection => {
          const isDefault = collections.data.defaultCollectionId === collection.id;
          return (
            <Surface key={collection.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <Link to={`/collections/${collection.id}`} className="min-w-0 flex-1 text-inherit no-underline">
                  <Folder className="mb-4 size-8 text-cyan-300" />
                  <h2 className="m-0 truncate text-lg">{collection.name}</h2>
                  <p className="line-clamp-2 min-h-10 text-sm text-[var(--mpf-text-muted)]">{collection.description || t('ui.collections.private')}</p>
                  <span className="text-xs text-[var(--mpf-text-muted)]">{t('ui.collections.imageCount', { count: collection.jobIds.length })}</span>
                </Link>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    title={isDefault ? t('ui.collections.default') : t('ui.collections.makeDefault')}
                    disabled={isDefault || makeDefault.isPending}
                    onClick={() => makeDefault.mutate(collection.id)}
                    icon={<Pin className="size-4" />}
                  />
                  <ConfirmDialog
                    trigger={<Button variant="ghost" title={t('ui.collections.delete')} icon={<Trash2 className="size-4" />} />}
                    title={t('ui.collections.deleteTitle')}
                    description={t('ui.collections.deleteDescription')}
                    confirmLabel={t('ui.action.delete')}
                    destructive
                    pending={remove.isPending}
                    onConfirm={() => remove.mutate(collection.id)}
                  />
                </div>
              </div>
            </Surface>
          );
        })}
      </section>
    </main>
  );
}
