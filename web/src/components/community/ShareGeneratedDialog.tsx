import * as Dialog from '@radix-ui/react-dialog';
import { useMutation } from '@tanstack/react-query';
import { Share2, X } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { createGeneratedShareDraft, publishGeneratedShare } from '../../features/community/api/shareApi';
import { Button } from '../ui/Button';

export function ShareGeneratedDialog({ jobId, trigger }: { jobId: string; trigger?: ReactNode }) {
  const { t } = useTranslation('react-ui');
  const [open, setOpen] = useState(false);
  const draft = useMutation({ mutationFn: () => createGeneratedShareDraft(jobId) });
  const publish = useMutation({
    mutationFn: (input: {
      title: string;
      description: string;
      promptVisibility: string;
      visibility: string;
      faceReusePolicy: 'view_only' | 'public_reusable';
    }) => {
      if (!draft.data) throw new Error('Create a share draft first.');
      return publishGeneratedShare(draft.data.id, input);
    },
    onSuccess: () => setOpen(false)
  });
  function change(next: boolean) {
    setOpen(next);
    if (next && !draft.data && !draft.isPending) draft.mutate();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    publish.mutate({
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim(),
      promptVisibility: String(form.get('promptVisibility') || 'full'),
      visibility: String(form.get('visibility') || 'public'),
      faceReusePolicy: form.get('faceReusePolicy') === 'public_reusable'
        ? 'public_reusable'
        : 'view_only'
    });
  }
  return (
    <Dialog.Root open={open} onOpenChange={change}>
      <Dialog.Trigger asChild>{trigger || <Button icon={<Share2 className="size-4" />}>{t('ui.action.share')}</Button>}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] max-h-[90vh] w-[min(94vw,620px)] -translate-x-1/2 -translate-y-1/2 overflow-auto border border-[var(--mpf-border)] bg-[var(--mpf-surface-strong)] p-5 shadow-[var(--mpf-shadow-raised)]">
          <div className="flex items-start justify-between gap-3"><div><Dialog.Title className="m-0 text-xl">{t('ui.share.title')}</Dialog.Title><Dialog.Description className="mt-2 text-sm text-[var(--mpf-text-muted)]">{t('ui.share.description')}</Dialog.Description></div><Dialog.Close asChild><Button variant="ghost" size="icon" title={t('ui.action.close')} icon={<X className="size-4" />} /></Dialog.Close></div>
          {draft.isPending ? <p className="text-sm text-[var(--mpf-text-muted)]">{t('ui.share.preparing')}</p> : null}
          {draft.isError ? <p className="text-sm text-red-300">{draft.error.message}</p> : null}
          {draft.data ? <form className="mt-4 grid gap-3" onSubmit={submit}><input name="title" required maxLength={120} placeholder={t('ui.share.postTitle')} className="h-11 border border-[var(--mpf-border)] bg-black/35 px-3" /><textarea name="description" maxLength={1000} placeholder={t('ui.share.postDescription')} className="h-28 resize-y border border-[var(--mpf-border)] bg-black/35 p-3" /><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs text-[var(--mpf-text-muted)]">{t('ui.share.promptVisibility')}<select name="promptVisibility" defaultValue="full" className="h-11 border border-[var(--mpf-border)] bg-black/35 px-3 text-white"><option value="full">{t('ui.share.full')}</option><option value="partial">{t('ui.share.partial')}</option><option value="private">{t('ui.character.private')}</option></select></label><label className="grid gap-1 text-xs text-[var(--mpf-text-muted)]">{t('ui.share.postVisibility')}<select name="visibility" defaultValue="public" className="h-11 border border-[var(--mpf-border)] bg-black/35 px-3 text-white"><option value="public">{t('ui.character.public')}</option><option value="unlisted">{t('ui.share.unlisted')}</option><option value="private">{t('ui.character.private')}</option></select></label></div>{draft.data.faceReuseEligible ? <label className="grid gap-1 text-xs text-[var(--mpf-text-muted)]">{t('ui.share.faceReuse')}<select name="faceReusePolicy" defaultValue="view_only" className="h-11 border border-[var(--mpf-border)] bg-black/35 px-3 text-white"><option value="view_only">{t('ui.share.faceViewOnly')}</option><option value="public_reusable">{t('ui.share.facePublicReusable')}</option></select><small>{t('ui.share.faceReuseHelp')}</small></label> : null}<div className="flex justify-end gap-2"><Dialog.Close asChild><Button type="button" variant="ghost">{t('ui.action.cancel')}</Button></Dialog.Close><Button type="submit" variant="primary" disabled={publish.isPending}>{t('ui.action.publish')}</Button></div></form> : null}
          {publish.isError ? <p className="text-sm text-red-300">{publish.error.message}</p> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
