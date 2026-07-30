import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReferenceAuthorityProjection } from '../../features/generation/schemas/generationSchemas';

export function ReferenceAuthorityNotice({
  projection
}: {
  projection: ReferenceAuthorityProjection;
}) {
  const { t } = useTranslation('playground');
  if (!projection.controlledGroups.length) return null;
  return (
    <aside className="reference-authority-notice" role="status">
      <ShieldCheck aria-hidden="true" />
      <div>
        <strong>{t('playground.reference.authorityTitle')}</strong>
        <p>
          {t('playground.reference.authorityDescription', {
            groups: projection.controlledGroups.map(item => item.group).join(', ')
          })}
        </p>
      </div>
    </aside>
  );
}
