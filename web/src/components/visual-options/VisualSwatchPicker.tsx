import { Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { AttributeSelection } from '../../features/studio/attributes/attributeModel';
import { createSelection, localized } from '../../features/studio/attributes/attributeModel';
import type { VisualFieldPresentation } from '../../features/studio/visual-options/visualOptionRegistry';
import { VisualOptionGrid } from './VisualOptionGrid';

export function VisualSwatchPicker({
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
  return (
    <VisualOptionGrid variant="swatch" className="visual-swatch-picker">
      {presentation.items.map(item => {
        const selected = value?.id === item.option.id;
        const colors = item.colors || ['#596174', '#a8afc7'];
        return (
          <button
            key={item.assetId}
            type="button"
            className={`visual-swatch-option${selected ? ' is-selected' : ''}`}
            role="option"
            aria-selected={selected}
            disabled={disabled}
            title={localized(item.option.label)}
            onClick={() => onChange(selected ? null : createSelection(item.option))}
          >
            <span
              className="visual-swatch-option__sample"
              data-pattern={item.pattern || 'solid'}
              style={{
                '--visual-swatch-a': colors[0],
                '--visual-swatch-b': colors[1] || colors[0]
              } as CSSProperties}
              aria-hidden="true"
            />
            <span>{localized(item.option.label)}</span>
            {selected ? <Check aria-hidden="true" /> : null}
          </button>
        );
      })}
    </VisualOptionGrid>
  );
}
