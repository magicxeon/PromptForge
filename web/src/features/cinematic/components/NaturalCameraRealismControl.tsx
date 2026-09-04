import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const CINEMATIC_NATURAL_CAMERA_PROFILE_ID = 'photorealistic-cinematic' as const;

export function NaturalCameraRealismControl({
  enabled,
  onChange
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const { t } = useTranslation('cinematic');
  return <div className="engine-prompt-refinement cinematic-natural-realism">
    <Camera className="engine-prompt-refinement__icon" aria-hidden="true" />
    <div className="engine-prompt-refinement__copy">
      <strong>{t('cinematic.storyboard.naturalRealism')}</strong>
      <span>{t('cinematic.storyboard.naturalRealismDescription')}</span>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={t('cinematic.storyboard.naturalRealism')}
      className="engine-prompt-refinement__switch"
      onClick={() => onChange(!enabled)}
    >
      <span />
    </button>
  </div>;
}
