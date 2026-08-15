import { useTranslation } from 'react-i18next';

const scopeOptions = [
  'full_look',
  'top_only',
  'bottom_only',
  'single_item'
] as const;

export function ReferenceScopeSelector({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation('playground');
  return (
    <label className="reference-scope-selector">
      <span>{t('playground.reference.scopeLabel')}</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {scopeOptions.map(option => (
          <option key={option} value={option}>
            {t(`playground.reference.scope.${option}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
