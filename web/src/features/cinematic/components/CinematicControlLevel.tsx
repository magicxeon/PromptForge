import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';

type CinematicControlLevelProps = {
  mode: 'simple' | 'advanced';
  helpText: string;
  label: string;
  onChange: (mode: 'simple' | 'advanced') => void;
};

export function CinematicControlLevel({ mode, helpText, label, onChange }: CinematicControlLevelProps) {
  const { t } = useTranslation('cinematic');

  return (
    <section className="cinematic-authoring-mode">
      <small>{label}</small>
      <div role="group" aria-label={label}>
        {(['simple', 'advanced'] as const).map(item => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={mode === item ? 'primary' : 'ghost'}
            aria-pressed={mode === item}
            onClick={() => onChange(item)}
          >
            {t(`cinematic.mode.${item}`)}
          </Button>
        ))}
      </div>
      <span>{helpText}</span>
    </section>
  );
}
