import { Check } from 'lucide-react';
import type { AttributeSelection } from '../../features/studio/attributes/attributeModel';
import { createSelection, localized } from '../../features/studio/attributes/attributeModel';
import type { VisualFieldPresentation } from '../../features/studio/visual-options/visualOptionRegistry';

export function VisualSwatchPicker({
  presentation,
  value,
  onChange
}: {
  presentation: VisualFieldPresentation;
  value?: AttributeSelection;
  onChange: (value: AttributeSelection | null) => void;
}) {
  return (
    <div className="visual-swatch-picker" role="listbox" aria-orientation="horizontal">
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
            title={localized(item.option.label)}
            onClick={() => onChange(selected ? null : createSelection(item.option))}
          >
            <span
              className="visual-swatch-option__sample"
              style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1] || colors[0]})` }}
              aria-hidden="true"
            />
            <span>{localized(item.option.label)}</span>
            {selected ? <Check aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}
