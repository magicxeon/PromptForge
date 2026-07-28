import { Lock, LockOpen } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import type {
  AttributeField,
  AttributeSelection
} from '../../features/studio/attributes/attributeModel';
import {
  createCustomSelection,
  createSelection,
  localized
} from '../../features/studio/attributes/attributeModel';
import type { VisualFieldPresentation } from '../../features/studio/visual-options/visualOptionRegistry';
import { VisualImagePicker } from './VisualImagePicker';
import { VisualSwatchPicker } from './VisualSwatchPicker';

export function VisualOptionPicker({
  field,
  value,
  visual,
  locked = false,
  onLockChange,
  onChange
}: {
  field: AttributeField;
  value?: AttributeSelection;
  visual?: VisualFieldPresentation | null;
  locked?: boolean;
  onLockChange?: (locked: boolean) => void;
  onChange: (value: AttributeSelection | null) => void;
}) {
  const { t } = useTranslation('react-ui');
  const [custom, setCustom] = useState(value?.isCustom ? value.value : '');
  const [showCustom, setShowCustom] = useState(value?.isCustom === true);
  useEffect(() => {
    setCustom(value?.isCustom ? value.value : '');
    setShowCustom(value?.isCustom === true);
  }, [value]);
  const selectValue = showCustom ? '__custom__' : value?.id || '';

  function submitCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (custom.trim()) onChange(createCustomSelection(field, custom));
  }
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="mb-2 text-sm font-semibold">{field.name}</legend>
      <div className="visual-field-control-row">
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
          <option value="__custom__">{t('ui.visual.custom')}</option>
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
      </div>
      {visual?.kind === 'image'
        ? <VisualImagePicker presentation={visual} value={value} onChange={onChange} />
        : visual?.kind === 'swatch'
          ? <VisualSwatchPicker presentation={visual} value={value} onChange={onChange} />
          : null}
      {showCustom ? (
        <form className="visual-custom-form" onSubmit={submitCustom}>
          <input
            value={custom}
            onChange={event => setCustom(event.target.value)}
            maxLength={240}
            placeholder={t('ui.visual.customPlaceholder', { field: field.name })}
          />
          <Button type="submit" size="sm">{t('ui.visual.use')}</Button>
        </form>
      ) : null}
    </fieldset>
  );
}
