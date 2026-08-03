import * as Dialog from '@radix-ui/react-dialog';
import { useMutation } from '@tanstack/react-query';
import { FileUser, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { createReturnNavigationState } from '../../lib/navigation/returnNavigation';
import { createCharacterProfile } from '../../features/profiles/api/profileApi';
import { Button } from '../ui/Button';

export function CreateCharacterProfileDialog({ jobId }: { jobId: string }) {
  const { t } = useTranslation('react-ui');
  const navigate = useNavigate();
  const location = useLocation();
  const create = useMutation({
    mutationFn: (input: {
      displayName: string;
      shortDescription: string;
      personalitySummary: string;
      intendedUses: string[];
    }) => createCharacterProfile({
      sourceGenerationResultId: jobId,
      ...input,
      idempotencyKey: `react_character_profile_${jobId}`
    }),
    onSuccess: profile => navigate(
      `/me/characters/${encodeURIComponent(profile.id)}`,
      { state: createReturnNavigationState(location) }
    )
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    create.mutate({
      displayName: String(form.get('displayName') || '').trim(),
      shortDescription: String(form.get('shortDescription') || '').trim(),
      personalitySummary: String(form.get('personalitySummary') || '').trim(),
      intendedUses: form.getAll('intendedUses').map(String)
    });
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="primary" icon={<FileUser className="size-4" />}>{t('ui.action.createProfile')}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="app-nested-dialog__overlay fixed inset-0 bg-black/75 backdrop-blur-sm" />
        <Dialog.Content className="app-nested-dialog__content fixed left-1/2 top-1/2 max-h-[88vh] w-[min(92vw,640px)] -translate-x-1/2 -translate-y-1/2 overflow-auto border border-[var(--mpf-border-strong)] bg-[var(--mpf-bg-raised)] p-5 shadow-[var(--mpf-shadow-raised)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="m-0 text-xl">{t('ui.action.createProfile')}</Dialog.Title>
              <Dialog.Description className="mb-0 mt-1 text-sm text-[var(--mpf-text-muted)]">
                {t('ui.character.createDescription')}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button size="icon" variant="ghost" title={t('ui.action.close')} icon={<X className="size-4" />} />
            </Dialog.Close>
          </div>
          <form className="mt-5 grid gap-4" onSubmit={submit}>
            <label className="grid gap-1 text-sm">
              <span>{t('ui.character.name')}</span>
              <input name="displayName" required maxLength={80} className="h-11 border border-[var(--mpf-border)] bg-black/35 px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t('ui.character.shortDescription')}</span>
              <textarea name="shortDescription" maxLength={280} className="h-20 resize-y border border-[var(--mpf-border)] bg-black/35 p-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t('ui.character.personality')}</span>
              <textarea name="personalitySummary" maxLength={500} className="h-28 resize-y border border-[var(--mpf-border)] bg-black/35 p-3" />
            </label>
            <fieldset className="border border-[var(--mpf-border)] p-3">
              <legend className="px-2 text-sm">{t('ui.character.intendedUses')}</legend>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" name="intendedUses" value="fashion" defaultChecked />{t('ui.character.intendedFashion')}</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="intendedUses" value="scene_story" defaultChecked />{t('ui.character.intendedScene')}</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="intendedUses" value="general" />{t('ui.character.intendedGeneral')}</label>
              </div>
            </fieldset>
            {create.isError ? <p role="alert" className="m-0 text-sm text-red-300">{create.error.message}</p> : null}
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild><Button type="button" variant="ghost">{t('ui.action.cancel')}</Button></Dialog.Close>
              <Button type="submit" variant="primary" disabled={create.isPending}>{t('ui.action.createProfile')}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
