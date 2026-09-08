import { useEffect, useRef, useState } from 'react';
import { UserRound, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { DisplayMediaImage } from '../../../components/media/DisplayMediaImage';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { CharacterLibraryPicker } from '../../profiles/components/CharacterLibraryPicker';
import { requestCharacterHandoff } from '../../profiles/api/profileApi';
import type { CharacterSummary } from '../../profiles/schemas/profileSchemas';
import { characterDisplayImages } from '../../profiles/characterDisplayImage';
import { isSceneCharacterEligible, isSceneCharacterHandoffValid, type SceneCharacterHandoff } from '../templateCharacterPolicy';

export function SceneCharacterSelector({ characterReference, displayCharacter, templateMode = false, onCharacter, onClearCharacter }: {
  characterReference?: string; displayCharacter?: CharacterSummary | null; templateMode?: boolean;
  onCharacter: (handoff: SceneCharacterHandoff) => void; onClearCharacter: () => void;
}) {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const epoch = useRef({ value: 0 });
  useEffect(() => {
    const requests = epoch.current;
    requests.value++;
    return () => { requests.value++; };
  }, [actor?.userId, characterReference, templateMode]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{ item: CharacterSummary; reference: string } | null>(null);
  const current = displayCharacter || (selected && selected.reference === characterReference ? selected.item : null);
  return <section className="template-scene-panel__character">
    <h3>{t('ui.templateScene.character')}</h3>
    {characterReference ? <div className="template-scene-panel__selected">
      <DisplayMediaImage sources={current ? characterDisplayImages(current) : [{ src: characterReference, fit: 'contain' }]} alt="" />
      <strong>{current?.displayName || t('ui.templateScene.selectedReference')}</strong>
      <Button icon={<X />} aria-label={t('ui.templateScene.removeCharacter')} onClick={() => { epoch.current.value++; setSelected(null); onClearCharacter(); }} />
    </div> : null}
    <Button icon={<UserRound />} onClick={() => setOpen(true)}>{t(characterReference ? 'ui.templateScene.changeCharacter' : 'ui.templateScene.chooseCharacter')}</Button>
    <CharacterLibraryPicker open={open} onOpenChange={setOpen} current={current}
      unavailableReason={item => isSceneCharacterEligible(item, templateMode) ? undefined : t('ui.templateScene.characterUnavailable')}
      onSelect={async item => {
        const requestEpoch = ++epoch.current.value;
        const actorId = actor?.userId;
        const handoff = await requestCharacterHandoff(item.id, 'scene_builder');
        if (requestEpoch !== epoch.current.value || getActiveActorId() !== actorId || !isSceneCharacterHandoffValid(item, handoff, templateMode)) {
          throw new Error('Character selection is no longer valid.');
        }
        onCharacter(handoff);
        setSelected({ item, reference: handoff.characterReferenceUrl });
      }} />
  </section>;
}
