import { useMemo } from 'react';
import { VisualOptionPicker } from '../../../components/visual-options/VisualOptionPicker';
import type {
  AttributeGroup,
  AttributeSelection,
} from '../attributes/attributeModel';
import type { VisualManifest } from '../schemas/visualManifestSchemas';
import { resolveVisualPresentation } from '../visual-options/visualOptionRegistry';
import {
  visibleStudioGroups,
  type GuidedStudioMode
} from '../studioModePolicy';

export function GuidedAttributeForm({
  groups,
  mode,
  characterType,
  manifests,
  selections,
  lockedFields = [],
  onLockChange,
  onChange
}: {
  groups: AttributeGroup[];
  mode: GuidedStudioMode;
  characterType: 'reusable_model' | 'styled_character';
  manifests?: Record<string, VisualManifest>;
  selections: Record<string, AttributeSelection>;
  lockedFields?: string[];
  onLockChange?: (fieldName: string, locked: boolean) => void;
  onChange: (value: Record<string, AttributeSelection>) => void;
}) {
  const visible = useMemo(
    () => visibleStudioGroups(groups, mode, characterType),
    [characterType, groups, mode]
  );
  const gender = selections.Gender;
  return (
    <div className="studio-attribute-groups">
      {visible.map((group, groupIndex) => (
        <details key={group.group} open={groupIndex < 2} className="studio-attribute-group">
          <summary>
            <span>{group.group}</span>
            <small>{group.fields.filter(field => selections[field.name]).length}/{group.fields.length}</small>
          </summary>
          <div className="studio-attribute-group__fields">
            {group.fields.map(field => <VisualOptionPicker
              key={field.name}
              field={field}
              value={selections[field.name]}
              visual={resolveVisualPresentation({
                field,
                manifests: manifests || {},
                gender
              })}
              locked={lockedFields.includes(field.name)}
              onLockChange={locked => onLockChange?.(field.name, locked)}
              onChange={selection => {
                const next = { ...selections };
                if (selection) next[field.name] = selection;
                else delete next[field.name];
                onChange(next);
              }}
            />)}
          </div>
        </details>
      ))}
    </div>
  );
}
