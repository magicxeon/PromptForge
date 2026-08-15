import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ReferenceQualityWarning({
  warningCodes = [],
  error = null
}: {
  warningCodes?: string[];
  error?: string | null;
}) {
  const { t } = useTranslation('playground');
  const uniqueCodes = [...new Set(warningCodes.filter(Boolean))];
  if (!error && !uniqueCodes.length) return null;
  return (
    <aside
      className={`reference-quality-warning${error ? ' is-error' : ''}`}
      role={error ? 'alert' : 'status'}
    >
      <AlertTriangle aria-hidden="true" />
      <div>
        <strong>
          {t(error
            ? 'playground.reference.processingErrorTitle'
            : 'playground.reference.warningTitle')}
        </strong>
        {error ? <p>{error}</p> : null}
        {uniqueCodes.map(code => (
          <p key={code}>
            {t(`playground.reference.warning.${code}`, {
              defaultValue: t('playground.reference.warning.generic')
            })}
          </p>
        ))}
      </div>
    </aside>
  );
}
