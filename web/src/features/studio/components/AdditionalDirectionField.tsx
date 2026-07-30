import { LockKeyhole } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ADDITIONAL_DIRECTION_MAX_LENGTH } from '../additionalDirectionContract';

type AdditionalDirectionFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function AdditionalDirectionField({
  value,
  onChange
}: AdditionalDirectionFieldProps) {
  const { t } = useTranslation('react-ui');
  const characterCount = Array.from(value).length;

  return (
    <section className="studio-additional-direction">
      <div className="studio-additional-direction__heading">
        <div>
          <label htmlFor="studio-additional-direction">
            {t('ui.studio.additionalDirection')}
          </label>
          <p>{t('ui.studio.additionalDirectionHelp')}</p>
        </div>
        <LockKeyhole aria-hidden="true" />
      </div>
      <textarea
        id="studio-additional-direction"
        value={value}
        rows={3}
        placeholder={t('ui.studio.additionalDirectionPlaceholder')}
        onChange={event => onChange(
          Array.from(event.target.value)
            .slice(0, ADDITIONAL_DIRECTION_MAX_LENGTH)
            .join('')
        )}
      />
      <output
        className="studio-additional-direction__counter"
        htmlFor="studio-additional-direction"
        aria-live="polite"
      >
        {characterCount} / {ADDITIONAL_DIRECTION_MAX_LENGTH}
      </output>
    </section>
  );
}
