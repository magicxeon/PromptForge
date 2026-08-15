import { useMutation } from '@tanstack/react-query';
import { WandSparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { createPromptProposal } from '../../features/prompt-composer/api/promptComposerApi';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';

export function PromptComposerAssist({ onAccept }: { onAccept: (prompt: string) => void }) {
  const { t } = useTranslation('react-ui');
  const [open, setOpen] = useState(false);
  const proposal = useMutation({ mutationFn: createPromptProposal });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    proposal.mutate(String(form.get('idea') || '').trim());
  }
  return (
    <Surface className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span><strong className="flex items-center gap-2"><WandSparkles className="size-4 text-cyan-300" />{t('ui.promptAssist.title')}</strong><small className="mt-1 block text-[var(--mpf-text-muted)]">{t('ui.promptAssist.description')}</small></span>
        <Button onClick={() => setOpen(value => !value)}>{open ? t('ui.promptAssist.close') : t('ui.promptAssist.open')}</Button>
      </div>
      {open ? <form className="mt-4 grid gap-3" onSubmit={submit}><textarea name="idea" required minLength={3} maxLength={2000} placeholder={t('ui.promptAssist.placeholder')} className="h-28 resize-y border border-[var(--mpf-border)] bg-black/35 p-3 text-sm" /><div className="flex justify-end"><Button type="submit" disabled={proposal.isPending}>{t('ui.promptAssist.create')}</Button></div></form> : null}
      {proposal.data ? <div className="mt-4 border-t border-[var(--mpf-border)] pt-4"><p className="text-sm leading-6 text-[var(--mpf-text-muted)]">{proposal.data.proposal.finalPromptDraft}</p><Button variant="primary" onClick={() => { onAccept(proposal.data.proposal.finalPromptDraft); setOpen(false); }}>{t('ui.action.useProposal')}</Button></div> : null}
      {proposal.isError ? <p className="mb-0 mt-3 text-sm text-red-300">{proposal.error.message}</p> : null}
    </Surface>
  );
}
