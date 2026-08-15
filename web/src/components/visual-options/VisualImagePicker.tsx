import { Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { AttributeSelection } from '../../features/studio/attributes/attributeModel';
import { createSelection, localized } from '../../features/studio/attributes/attributeModel';
import type { VisualFieldPresentation } from '../../features/studio/visual-options/visualOptionRegistry';
import { VisualOptionGrid } from './VisualOptionGrid';

export function VisualImagePicker({
  presentation,
  value,
  disabled = false,
  onChange
}: {
  presentation: VisualFieldPresentation;
  value?: AttributeSelection;
  disabled?: boolean;
  onChange: (value: AttributeSelection | null) => void;
}) {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage || 'en').split('-')[0] || 'en';
  const items = [...presentation.items].sort((left, right) => localized(left.option.label)
    .localeCompare(localized(right.option.label), 'en', { sensitivity: 'base', numeric: true }));
  return (
    <VisualOptionGrid
      variant={presentation.size}
      className={`visual-image-picker visual-image-picker--${presentation.size}`}
    >
      {items.map(item => {
        const selected = value?.id === item.option.id;
        const alt = item.alt?.[locale] || item.alt?.en || localized(item.option.label);
        return (
          <button
            key={item.assetId}
            type="button"
            className={`visual-image-option${selected ? ' is-selected' : ''}`}
            role="option"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onChange(selected ? null : createSelection(item.option))}
          >
            <span
              className="visual-image-option__media"
              title={alt}
            >
              {item.renderMode === 'mask' ? (
                <span
                  className="visual-option-icon"
                  aria-hidden="true"
                  style={{
                    '--visual-option-url': `url("${item.imageUrl}")`
                  } as CSSProperties}
                />
              ) : (
                <img
                  src={item.imageUrl}
                  alt={alt}
                  loading="lazy"
                  style={{ objectPosition: item.focalPoint || '50% 50%' }}
                  onError={event => {
                    event.currentTarget.hidden = true;
                  }}
                />
              )}
            </span>
            <span className="visual-image-option__label">
              {localized(item.option.label)}
            </span>
            {selected ? (
              <Check className="visual-image-option__check" aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
    </VisualOptionGrid>
  );
}
