import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DisplayMediaImage } from '../../../components/media/DisplayMediaImage';
import { Button } from '../../../components/ui/Button';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { requestCharacterHandoff } from '../../profiles/api/profileApi';
import { characterDisplayImages } from '../../profiles/characterDisplayImage';
import { CharacterLibraryPicker } from '../../profiles/components/CharacterLibraryPicker';
import { CharacterLookDialog } from '../../profiles/components/CharacterLookDialog';
import type { CharacterHandoff, CharacterSummary } from '../../profiles/schemas/profileSchemas';

export type PlaygroundImageCharacterSelection = {
  character: CharacterSummary;
  handoff: CharacterHandoff;
};

export function PlaygroundImageCharacterPanel({ selection, onChange }: {
  selection: PlaygroundImageCharacterSelection | null;
  onChange: (selection: PlaygroundImageCharacterSelection | null) => void;
}) {
  const { t } = useTranslation('playground');
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lookOpen, setLookOpen] = useState(false);
  const character = selection?.character || null;

  return <section className="mb-3 grid gap-3 rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] bg-[var(--theme-bg-raised)] p-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <strong className="flex items-center gap-2"><UserRound className="size-4 text-cyan-300" aria-hidden="true" />{t('playground.imageCharacter.title')}</strong>
        <p className="mb-0 mt-1 text-xs text-[var(--mpf-text-muted)]">{t('playground.imageCharacter.description')}</p>
      </div>
      <Button size="sm" icon={<UserRound className="size-4" />} onClick={() => setPickerOpen(true)}>
        {t(character ? 'playground.imageCharacter.change' : 'playground.imageCharacter.choose')}
      </Button>
    </div>
    {character ? <div className="flex min-w-0 flex-wrap items-center gap-3 border-t border-[var(--mpf-border)] pt-3">
      <div className="h-16 w-14 shrink-0 overflow-hidden rounded-[var(--mpf-radius-sm)] bg-[var(--theme-bg)]">
        <DisplayMediaImage sources={characterDisplayImages(character)} alt={character.displayName} />
      </div>
      <div className="min-w-0 flex-1">
        <strong className="block truncate">{character.displayName}</strong>
        <small className="text-[var(--mpf-text-muted)]">{t('playground.imageCharacter.identityPinned')}</small>
      </div>
      {character.isOwner ? <Button size="sm" variant="secondary" icon={<Sparkles className="size-4" />} onClick={() => setLookOpen(true)}>
        {t('playground.imageCharacter.createLookSheet')}
      </Button> : <small className="text-[var(--mpf-text-muted)]">{t('playground.imageCharacter.lookSheetOwnerOnly')}</small>}
      <Button size="icon" variant="ghost" icon={<X className="size-4" />} title={t('playground.imageCharacter.remove')} onClick={() => onChange(null)} />
    </div> : null}
    <CharacterLibraryPicker
      open={pickerOpen}
      onOpenChange={setPickerOpen}
      current={character}
      unavailableReason={item => item.handoffAvailable && item.destinationCapabilities.includes('playground_image')
        ? undefined
        : t('playground.imageCharacter.unavailable')}
      onSelect={async item => {
        const actorId = actor?.userId;
        const handoff = await requestCharacterHandoff(item.id, 'playground_image');
        if (getActiveActorId() !== actorId
          || handoff.destination !== 'playground_image'
          || handoff.characterProfileId !== item.id
          || handoff.characterProfileVersionId !== item.characterProfileVersionId) {
          throw new Error(t('playground.imageCharacter.selectionChanged'));
        }
        onChange({ character: item, handoff });
      }}
    />
    {character?.isOwner && character.characterProfileVersionId ? <CharacterLookDialog
      open={lookOpen}
      onOpenChange={setLookOpen}
      initialMode="ai"
      characterProfileId={character.id}
      characterProfileVersionId={character.characterProfileVersionId}
      characterDisplayName={character.displayName}
      onSaved={() => {
        void queryClient.invalidateQueries({ queryKey: ['character-looks', actor?.userId, character.id] });
      }}
    /> : null}
  </section>;
}
