import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, TriangleAlert } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useActor } from '../../../lib/auth/ActorProvider';
import { deleteCharacter } from '../api/profileApi';

export function DeleteCharacterDialog({ characterId, displayName }: { characterId: string; displayName: string }) {
  const { t } = useTranslation('character-profiles');
  const { actor } = useActor();
  const actorId = actor?.userId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const guard = useRef({ active: true, submitting: false });
  useEffect(() => {
    const current = guard.current;
    current.active = true;
    return () => { current.active = false; };
  }, []);
  const deletion = useMutation({
    mutationFn: () => deleteCharacter(characterId, confirmation),
    onSuccess: () => {
      if (!guard.current.active) return;
      const families = ['owned-character', 'owned-characters', 'character', 'characters', 'character-works',
        'character-looks', 'character-featured-image-candidates', 'creator-page'];
      void queryClient.invalidateQueries({
        predicate: query => families.includes(String(query.queryKey[0])) && query.queryKey[1] === actorId
      });
      navigate('/me/characters', { replace: true });
    }
  });
  function changeOpen(value: boolean) {
    if (guard.current.submitting) return;
    setOpen(value);
    setConfirmation('');
    deletion.reset();
  }
  async function confirm() {
    if (confirmation !== 'DELETE' || !actorId || guard.current.submitting) return;
    guard.current.submitting = true;
    try { await deletion.mutateAsync(); } catch { /* Mutation retains the retryable error. */ }
    finally { guard.current.submitting = false; }
  }
  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <section className="character-delete-danger" aria-labelledby="character-delete-danger-title">
        <h2 id="character-delete-danger-title"><TriangleAlert className="size-5 shrink-0" aria-hidden="true" />{t('character-profiles.delete.dangerTitle')}</h2>
        <p>{t('character-profiles.delete.description')}</p>
        <Dialog.Trigger asChild>
          <Button variant="danger" icon={<Trash2 className="size-4" aria-hidden="true" />}>
            {t('character-profiles.delete.action')}
          </Button>
        </Dialog.Trigger>
      </section>
      <Dialog.Portal>
        <Dialog.Overlay className="app-nested-dialog__overlay fixed inset-0 bg-black/75" />
        <Dialog.Content className="app-nested-dialog__content fixed left-1/2 top-1/2 max-h-[88vh] w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-[var(--mpf-border)] bg-[var(--mpf-bg-raised)] p-5 text-[var(--mpf-text)]">
          <Dialog.Title className="m-0 break-words text-xl">{t('character-profiles.delete.title', { name: displayName })}</Dialog.Title>
          <Dialog.Description className="text-sm text-[var(--mpf-text-muted)]">{t('character-profiles.delete.description')}</Dialog.Description>
          <form className="grid gap-4" onSubmit={event => { event.preventDefault(); void confirm(); }}>
            <label className="grid gap-2 text-sm">
              {t('character-profiles.delete.confirmation')}
              <input autoComplete="off" spellCheck={false} value={confirmation} disabled={deletion.isPending}
                onChange={event => setConfirmation(event.target.value)}
                className="h-11 min-w-0 rounded border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3" />
            </label>
            {deletion.isError ? <p role="alert" className="m-0 break-words text-sm text-[var(--theme-danger)]">{t('character-profiles.delete.failed')}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Dialog.Close asChild><Button type="button" disabled={deletion.isPending}>{t('character-profiles.delete.cancel')}</Button></Dialog.Close>
              <Button type="submit" variant="danger" className="text-[var(--mpf-text)]" icon={<Trash2 className="size-4" aria-hidden="true" />} disabled={confirmation !== 'DELETE' || deletion.isPending}>
                {t(deletion.isPending ? 'character-profiles.delete.pending' : 'character-profiles.delete.confirm')}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
