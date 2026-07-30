import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReferenceAuthorityProjection } from '../../features/generation/schemas/generationSchemas';
import { ReferenceAuthorityNotice } from './ReferenceAuthorityNotice';
import { ReferenceQualityWarning } from './ReferenceQualityWarning';

export function ReferenceProcessingPreview({
  projection,
  loading = false,
  error = null
}: {
  projection?: ReferenceAuthorityProjection | null;
  loading?: boolean;
  error?: string | null;
}) {
  const { t } = useTranslation('playground');
  if (loading) {
    return (
      <div className="reference-processing-preview is-loading" role="status">
        <span />
        {t('playground.reference.processing')}
      </div>
    );
  }
  if (!projection) {
    return <ReferenceQualityWarning error={error} />;
  }
  return (
    <div className="reference-processing-summary">
      <div className="reference-processing-summary__roles">
        {projection.references.map(reference => {
          const WarningIcon = reference.status === 'warning'
            ? AlertTriangle
            : CheckCircle2;
          return (
            <span
              key={reference.slotId}
              className={`reference-processing-role is-${reference.status}`}
            >
              <WarningIcon aria-hidden="true" />
              {t(`playground.reference.role.${reference.role}`)}
              {reference.detectedScope
                ? ` · ${t(`playground.reference.scope.${reference.detectedScope}`)}`
                : ''}
            </span>
          );
        })}
      </div>
      <ReferenceQualityWarning
        error={error}
        warningCodes={projection.warnings.map(warning => warning.code)}
      />
      <ReferenceAuthorityNotice projection={projection} />
    </div>
  );
}
