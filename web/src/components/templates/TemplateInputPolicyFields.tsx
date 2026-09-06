import { LockKeyhole, Shirt, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TemplateInputOptions, TemplateInputPolicy } from '../../features/templates/templateInputPolicyApi';

export function TemplateInputPolicyFields({ policy, value, onChange, disabled = false }: {
  policy: TemplateInputPolicy;
  value: TemplateInputOptions;
  onChange: (value: TemplateInputOptions) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation('react-ui');
  if (!policy.supported) return <p role="status">{t('ui.templateInputs.unsupported')}</p>;
  return <fieldset className="template-input-policy" disabled={disabled}>
    <legend>{t('ui.templateInputs.title')}</legend>
    <div className="template-input-policy__row">
      <Shirt aria-hidden="true" /><strong>{t('ui.templateInputs.outfitFront')}</strong>
      <span>{t('ui.templateInputs.required')}</span>
    </div>
    <label className="template-input-policy__row">
      <UserRound aria-hidden="true" /><span>{t('ui.templateInputs.character')}</span>
      <small>{t('ui.templateInputs.optional')}</small>
      <input type="checkbox" checked={value.characterEnabled} disabled={!policy.characterAvailable || disabled}
        onChange={event => onChange({ outfitBackEnabled: value.outfitBackEnabled, characterEnabled: event.target.checked })} />
    </label>
    <label className="template-input-policy__row">
      <Shirt aria-hidden="true" /><span>{t('ui.templateInputs.outfitBack')}</span>
      <small>{t('ui.templateInputs.optional')}</small>
      <input type="checkbox" checked={value.outfitBackEnabled} disabled={!policy.outfitBackAvailable || disabled}
        onChange={event => onChange({ characterEnabled: value.characterEnabled, outfitBackEnabled: event.target.checked })} />
    </label>
    <p className="template-input-policy__locked"><LockKeyhole aria-hidden="true" />{t('ui.templateInputs.locked')}</p>
    {policy.removedFields.length ? <p role="status">{t('ui.templateInputs.legacy', { fields: policy.removedFields.join(', ') })}</p> : null}
  </fieldset>;
}
