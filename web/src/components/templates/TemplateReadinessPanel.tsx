import { useTranslation } from 'react-i18next';
import type { GenerationReferenceRole } from '../../features/generation/api/generationApi';
import { Button } from '../ui/Button';
import { StatusNotice } from '../ui/StatusNotice';

export type TemplateReferenceRequirement =
  | GenerationReferenceRole
  | 'identity_reference';

export function TemplateReadinessPanel({
  missing,
  onResolve
}: {
  missing: TemplateReferenceRequirement[];
  onResolve: () => void;
}) {
  const { t } = useTranslation('react-ui');
  if (!missing.length) {
    return (
      <StatusNotice tone="success" title={t('ui.scene.templateReadyTitle')}>
        {t('ui.scene.templateReadyDescription')}
      </StatusNotice>
    );
  }

  return (
    <StatusNotice
      tone="warning"
      title={t('ui.scene.templateRequiredTitle')}
      action={(
        <Button size="sm" variant="secondary" onClick={onResolve}>
          {t('ui.scene.templateResolve')}
        </Button>
      )}
    >
      <p className="template-readiness__intro">
        {t('ui.scene.templateRequiredDescription')}
      </p>
      <ul className="template-readiness__list">
        {missing.map(requirement => (
          <li key={requirement}>
            {t(`ui.scene.referenceRequirement.${requirement}`)}
          </li>
        ))}
      </ul>
    </StatusNotice>
  );
}
