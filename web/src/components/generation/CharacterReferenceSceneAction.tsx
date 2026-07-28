import { ArrowRight, Clapperboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getActiveActorId } from '../../lib/auth/actorStore';
import { writeHandoff } from '../../lib/persistence/handoffStorage';
import { Button } from '../ui/Button';

export function CharacterReferenceSceneAction({
  imageUrl,
  sourceJobId,
  characterType = 'styled_character',
  onHandoffComplete
}: {
  imageUrl: string;
  sourceJobId: string;
  characterType?: 'reusable_model' | 'styled_character';
  onHandoffComplete?: () => void;
}) {
  const { t } = useTranslation('react-ui');
  const navigate = useNavigate();

  function buildScene() {
    writeHandoff({
      actorId: getActiveActorId(),
      kind: 'character',
      payload: {
        destination: 'scene_builder',
        characterReferenceUrl: imageUrl,
        sourceType: 'generation',
        sourceJobId,
        characterType,
        outfitBehavior: characterType === 'reusable_model'
          ? 'replaceable'
          : 'preserve'
      }
    });
    onHandoffComplete?.();
    navigate('/studio/scene#reference-images');
  }

  return (
    <Button
      icon={<Clapperboard aria-hidden="true" />}
      onClick={buildScene}
    >
      {t('ui.studio.buildScene')}
      <ArrowRight aria-hidden="true" />
    </Button>
  );
}
