import { Lock, LockOpen } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import type {
  AttributeField,
  AttributeSelection,
  CustomAttributeInputLimits
} from '../../features/studio/attributes/attributeModel';
import {
  countCharacters,
  createCustomSelection,
  createSelection,
  DEFAULT_CUSTOM_ATTRIBUTE_INPUT_LIMITS,
  localized
} from '../../features/studio/attributes/attributeModel';
import type { VisualFieldPresentation } from '../../features/studio/visual-options/visualOptionRegistry';
import { VisualImagePicker } from './VisualImagePicker';
import { VisualSwatchPicker } from './VisualSwatchPicker';
import { CustomColorControl } from './CustomColorControl';
import {
  isCustomColorField,
  isCustomHairColorActive,
  type StudioCustomColors
} from '../../features/studio/attributes/customColorModel';

export function VisualOptionPicker({
  field,
  value,
  visual,
  disabled = false,
  disabledReason,
  locked = false,
  customColors,
  customCharacterCount = 0,
  customInputLimits = DEFAULT_CUSTOM_ATTRIBUTE_INPUT_LIMITS,
  onLockChange,
  onCustomColorsChange,
  onChange
}: {
  field: AttributeField;
  value?: AttributeSelection;
  visual?: VisualFieldPresentation | null;
  disabled?: boolean;
  disabledReason?: string;
  locked?: boolean;
  customColors?: StudioCustomColors;
  customCharacterCount?: number;
  customInputLimits?: CustomAttributeInputLimits;
  onLockChange?: (locked: boolean) => void;
  onCustomColorsChange?: (colors: StudioCustomColors) => void;
  onChange: (value: AttributeSelection | null) => void;
}) {
  const { t } = useTranslation('react-ui');
  const authorityId = useId();
  const [custom, setCustom] = useState(value?.isCustom ? value.value : '');
  const [showCustom, setShowCustom] = useState(value?.isCustom === true);
  useEffect(() => {
    setCustom(value?.isCustom ? value.value : '');
    setShowCustom(value?.isCustom === true);
  }, [value]);
  const hasCustomColorControl = Boolean(
    customColors && isCustomColorField(field.group, field.name)
  );
  const selectValue = showCustom && !hasCustomColorControl
    ? '__custom__'
    : value?.isCustom
      ? ''
      : value?.id || '';
  const isGarmentToneField = field.group === 'Clothing'
    && (field.name === 'Primary Color' || field.name === 'Secondary Color');
  const customHairColorActive = Boolean(
    customColors
    && field.group === 'Hair'
    && field.name === 'Color'
    && isCustomHairColorActive(customColors)
  );
  const customCharacterLength = countCharacters(custom.trim());
  const selectedCustomLength = value?.isCustom
    ? countCharacters(value.value.trim())
    : 0;
  const projectedCustomTotal = Math.max(0, customCharacterCount - selectedCustomLength)
    + customCharacterLength;
  const customFieldTooLong = customCharacterLength
    > customInputLimits.maxCharactersPerField;
  const customTotalTooLong = projectedCustomTotal
    > customInputLimits.maxCharactersTotal;
  const customInputInvalid = customFieldTooLong || customTotalTooLong;

  function submitCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (custom.trim() && !customInputInvalid) {
      onChange(createCustomSelection(field, custom.trim()));
    }
  }
  return (
    <fieldset
      className={`visual-field min-w-0 border-0 p-0${disabled ? ' is-reference-owned' : ''}`}
      disabled={disabled}
      aria-describedby={disabled && disabledReason ? authorityId : undefined}
    >
      <legend className="mb-2 text-sm font-semibold">{field.name}</legend>
      {disabled && disabledReason ? (
        <p id={authorityId} className="visual-field__authority">
          {t(disabledReason)}
        </p>
      ) : null}
      {!isGarmentToneField ? <div className="visual-field-control-row">
        <select
          value={selectValue}
          aria-label={field.name}
          onChange={event => {
            if (event.target.value === '__custom__') {
              setShowCustom(true);
              return;
            }
            setShowCustom(false);
            const option = field.options.find(item => item.id === event.target.value);
            onChange(option ? createSelection(option) : null);
          }}
        >
          <option value="">{`${t('ui.visual.select')} ${field.name}`}</option>
          {field.options.map(option => (
            <option key={option.id} value={option.id}>{localized(option.label)}</option>
          ))}
          {hasCustomColorControl ? null : (
            <option value="__custom__">{t('ui.visual.custom')}</option>
          )}
        </select>
        <button
          type="button"
          className={`visual-field-lock${locked ? ' is-locked' : ''}`}
          aria-pressed={locked}
          title={locked ? t('ui.visual.unlock') : t('ui.visual.lock')}
          aria-label={locked ? t('ui.visual.unlock') : t('ui.visual.lock')}
          onClick={() => onLockChange?.(!locked)}
        >
          {locked ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
        </button>
      </div> : null}
      {!isGarmentToneField && visual?.kind === 'image'
        ? <VisualImagePicker disabled={disabled} presentation={visual} value={value} onChange={onChange} />
        : !isGarmentToneField && visual?.kind === 'swatch'
          ? <VisualSwatchPicker
            disabled={disabled || customHairColorActive}
            presentation={visual}
            value={value}
            onChange={onChange}
          />
          : null}
      {hasCustomColorControl && customColors && onCustomColorsChange ? (
        <CustomColorControl
          group={field.group}
          fieldName={field.name}
          colors={customColors}
          disabled={disabled}
          onChange={onCustomColorsChange}
        />
      ) : null}
      {showCustom && !hasCustomColorControl ? (
        <form className="visual-custom-form" onSubmit={submitCustom}>
          <div className="visual-custom-form__input">
            <textarea
              value={custom}
              onChange={event => setCustom(event.target.value)}
              placeholder={t('ui.visual.customPlaceholder', { field: field.name })}
              aria-invalid={customInputInvalid}
              aria-describedby={`${authorityId}-custom-status`}
              rows={3}
            />
            <small
              id={`${authorityId}-custom-status`}
              className={customInputInvalid ? 'is-error' : undefined}
              role={customInputInvalid ? 'alert' : undefined}
            >
              {customFieldTooLong
                ? t('ui.visual.customFieldTooLong', {
                  count: customCharacterLength,
                  limit: customInputLimits.maxCharactersPerField
                })
                : customTotalTooLong
                  ? t('ui.visual.customTotalTooLong', {
                    count: projectedCustomTotal,
                    limit: customInputLimits.maxCharactersTotal
                  })
                  : t('ui.visual.customCharacterCount', {
                    count: customCharacterLength,
                    limit: customInputLimits.maxCharactersPerField,
                    total: projectedCustomTotal,
                    totalLimit: customInputLimits.maxCharactersTotal
                  })}
            </small>
          </div>
          <Button type="submit" size="sm" disabled={!custom.trim() || customInputInvalid}>
            {t('ui.visual.use')}
          </Button>
        </form>
      ) : null}
    </fieldset>
  );
}
