import { useTranslation } from 'react-i18next';
import type {
  StudioCustomColors
} from '../../features/studio/attributes/customColorModel';

export function CustomColorControl({
  group,
  fieldName,
  colors,
  disabled = false,
  onChange
}: {
  group: string;
  fieldName: string;
  colors: StudioCustomColors;
  disabled?: boolean;
  onChange: (colors: StudioCustomColors) => void;
}) {
  const { t } = useTranslation('react-ui');

  if (group === 'Hair' && fieldName === 'Color') {
    const hair = colors.Color;
    return (
      <section className="visual-custom-color" aria-label={t('ui.visual.hairColor')}>
        <ColorRow
          checked={hair.enabled}
          color={hair.base}
          disabled={disabled}
          label={t('ui.visual.baseHairColor')}
          onCheckedChange={enabled => onChange({
            ...colors,
            Color: { ...hair, enabled }
          })}
          onColorChange={base => onChange({
            ...colors,
            Color: { ...hair, enabled: true, base }
          })}
        />
        <ColorRow
          checked={hair.highlightEnabled}
          color={hair.highlight}
          disabled={disabled}
          label={t('ui.visual.hairHighlights')}
          onCheckedChange={highlightEnabled => onChange({
            ...colors,
            Color: { ...hair, highlightEnabled }
          })}
          onColorChange={highlight => onChange({
            ...colors,
            Color: { ...hair, highlightEnabled: true, highlight }
          })}
        />
        {(hair.enabled || hair.highlightEnabled) ? (
          <p>{t('ui.visual.customHairOverridesSwatches')}</p>
        ) : null}
      </section>
    );
  }

  const key = fieldName === 'Primary Color'
    ? 'Primary Color'
    : 'Secondary Color';
  const tone = colors[key];
  return (
    <section className="visual-custom-color" aria-label={t('ui.visual.garmentPalette')}>
      <ColorRow
        checked={tone.enabled}
        color={tone.color}
        disabled={disabled}
        label={key === 'Primary Color'
          ? t('ui.visual.dominantGarmentTone')
          : t('ui.visual.accentGarmentTone')}
        onCheckedChange={enabled => onChange({
          ...colors,
          [key]: { ...tone, enabled }
        })}
        onColorChange={color => onChange({
          ...colors,
          [key]: { enabled: true, color }
        })}
      />
      <p>{t('ui.visual.garmentPaletteHelp')}</p>
    </section>
  );
}

function ColorRow({
  checked,
  color,
  disabled,
  label,
  onCheckedChange,
  onColorChange
}: {
  checked: boolean;
  color: string;
  disabled: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
  onColorChange: (color: string) => void;
}) {
  return (
    <label className="visual-custom-color__row">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onCheckedChange(event.target.checked)}
      />
      <span>{label}</span>
      <input
        className="visual-custom-color__picker"
        type="color"
        value={color}
        disabled={disabled}
        aria-label={label}
        onChange={event => onColorChange(event.target.value)}
      />
      <output>{color.toUpperCase()}</output>
    </label>
  );
}
