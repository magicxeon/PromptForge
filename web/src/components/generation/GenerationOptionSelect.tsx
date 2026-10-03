import { LockKeyhole, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

export function GenerationOptionSelect({ label, value, options, onChange, icon: Icon, locked = false }: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  icon: LucideIcon;
  locked?: boolean;
}) {
  const id = useId();
  const { t } = useTranslation('playground');
  return <div className="generation-option-field">
    <label htmlFor={id} className="generation-option-label">{label}</label>
    <div className="generation-option-field__control">
      <Icon aria-hidden="true" />
      <select id={id} value={value} disabled={locked} onChange={event => onChange(event.target.value)}
        aria-describedby={locked ? `${id}-lock` : undefined}>
        {!options.some(option => option.value === value) ? <option value={value} disabled>{value}</option> : null}
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {locked ? <LockKeyhole className="generation-option-field__lock" aria-hidden="true" /> : null}
    </div>
    {locked ? <small id={`${id}-lock`}>{t('playground.options.locked')}</small> : null}
  </div>;
}
