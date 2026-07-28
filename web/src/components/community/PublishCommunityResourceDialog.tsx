import * as Dialog from '@radix-ui/react-dialog';
import { useMutation } from '@tanstack/react-query';
import { Share2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

export function PublishCommunityResourceDialog({
  title,
  description,
  actionLabel,
  publish
}: {
  title: string;
  description: string;
  actionLabel: string;
  publish: (input: { title: string; description: string }) => Promise<unknown>;
}) {
  const { t } = useTranslation('react-ui');
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: publish,
    onSuccess: () => setOpen(false)
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim()
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button icon={<Share2 className="size-4" />}>{actionLabel}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] w-[min(94vw,560px)] -translate-x-1/2 -translate-y-1/2 border border-[var(--mpf-border)] bg-[var(--mpf-surface-strong)] p-5 shadow-[var(--mpf-shadow-raised)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="m-0 text-xl">{title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-[var(--mpf-text-muted)]">{description}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" title={t('ui.action.close')} icon={<X className="size-4" />} />
            </Dialog.Close>
          </div>
          <form className="mt-5 grid gap-3" onSubmit={submit}>
            <input name="title" required maxLength={120} placeholder={t('ui.share.postTitle')} className="h-11 border border-[var(--mpf-border)] bg-black/35 px-3" />
            <textarea name="description" maxLength={1000} placeholder={t('ui.share.postDescription')} className="h-28 resize-y border border-[var(--mpf-border)] bg-black/35 p-3" />
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild><Button type="button" variant="ghost">{t('ui.action.cancel')}</Button></Dialog.Close>
              <Button type="submit" variant="primary" disabled={mutation.isPending}>
                {mutation.isPending ? t('ui.action.publishing') : t('ui.action.publish')}
              </Button>
            </div>
          </form>
          {mutation.isError ? <p role="alert" className="text-sm text-red-300">{mutation.error.message}</p> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
