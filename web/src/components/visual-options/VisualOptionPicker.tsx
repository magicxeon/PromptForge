import { Check, PenLine } from 'lucide-react';
import { useState, type FormEvent } from 'react';
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

export function VisualOptionPicker({
  field,
  value,
  onChange
}: {
  field: AttributeField;
  value?: AttributeSelection;
  onChange: (value: AttributeSelection | null) => void;
}) {
  const { t } = useTranslation('react-ui');
  const [custom, setCustom] = useState(value?.isCustom ? value.value : '');
  const [showCustom, setShowCustom] = useState(value?.isCustom === true);
  function submitCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (custom.trim()) onChange(createCustomSelection(field, custom));
  }
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="mb-2 text-sm font-semibold">{field.name}</legend>
      <div className="flex snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {field.options.map(option => {
          const selected = value?.id === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={`relative min-h-24 w-36 shrink-0 snap-start border p-3 text-left text-xs transition ${selected ? 'border-cyan-400 bg-cyan-400/10 text-white' : 'border-[var(--mpf-border)] bg-black/20 text-[var(--mpf-text-muted)] hover:border-[var(--mpf-border-strong)]'}`}
              onClick={() => onChange(selected ? null : createSelection(option))}
            >
              {selected ? <Check className="absolute right-2 top-2 size-4 text-cyan-300" /> : null}
              <span className="block pr-4 font-semibold">{localized(option.label)}</span>
              <small className="mt-2 line-clamp-2 block opacity-75">{option.prompt}</small>
            </button>
          );
        })}
        <button type="button" className={`min-h-24 w-36 shrink-0 border p-3 text-left text-xs ${value?.isCustom ? 'border-cyan-400 bg-cyan-400/10' : 'border-[var(--mpf-border)] bg-black/20 text-[var(--mpf-text-muted)]'}`} onClick={() => setShowCustom(value => !value)}><PenLine className="mb-2 size-4" />{t('ui.visual.custom')}</button>
      </div>
      {showCustom ? <form className="mt-2 flex gap-2" onSubmit={submitCustom}><input value={custom} onChange={event => setCustom(event.target.value)} maxLength={240} placeholder={t('ui.visual.customPlaceholder', { field: field.name })} className="h-10 min-w-0 flex-1 border border-[var(--mpf-border)] bg-black/35 px-3 text-sm" /><Button type="submit" size="sm">{t('ui.visual.use')}</Button></form> : null}
    </fieldset>
  );
}
