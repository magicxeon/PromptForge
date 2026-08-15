import { Images, PanelsTopLeft, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';

export type StudioMode = 'headshot' | 'character-sheet' | 'scene';

export function StudioModeSelector({
  mode,
  onChange
}: {
  mode: StudioMode;
  onChange: (mode: StudioMode) => void;
}) {
  const { t } = useTranslation('react-ui');
  return (
    <div className="studio-mode-selector" role="group" aria-label={t('ui.studio.generationMode')}>
      <Button
        size="sm"
        variant={mode === 'headshot' ? 'primary' : 'ghost'}
        icon={<UserRound aria-hidden="true" />}
        aria-pressed={mode === 'headshot'}
        onClick={() => onChange('headshot')}
      >
        {t('ui.studio.faceCreator')}
      </Button>
      <Button
        size="sm"
        variant={mode === 'character-sheet' ? 'primary' : 'ghost'}
        icon={<Images aria-hidden="true" />}
        aria-pressed={mode === 'character-sheet'}
        onClick={() => onChange('character-sheet')}
      >
        {t('ui.studio.characterSheet')}
      </Button>
      <Button
        size="sm"
        variant={mode === 'scene' ? 'primary' : 'ghost'}
        icon={<PanelsTopLeft aria-hidden="true" />}
        aria-pressed={mode === 'scene'}
        onClick={() => onChange('scene')}
      >
        {t('ui.studio.scene')}
      </Button>
    </div>
  );
}
