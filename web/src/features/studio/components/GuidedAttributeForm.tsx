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
import type { GenerationReferenceRole } from '../../generation/api/generationApi';
import { resolveFieldReferenceAuthority } from '../referenceAuthorityPolicy';
import type { CharacterOutfitBehavior } from '../referenceAuthorityPolicy';
import type { StudioCustomColors } from '../attributes/customColorModel';
import type { ReferenceAuthorityProjection } from '../../generation/schemas/generationSchemas';

export function GuidedAttributeForm({
  groups,
  mode,
  characterType,
  manifests,
  selections,
  customColors,
  references = {},
  characterOutfitBehavior = 'preserve',
  authorityProjection,
  lockedFields = [],
  editableFields,
  onLockChange,
  onCustomColorsChange,
  onChange
}: {
  groups: AttributeGroup[];
  mode: GuidedStudioMode;
  characterType: 'reusable_model' | 'styled_character';
  manifests?: Record<string, VisualManifest>;
  selections: Record<string, AttributeSelection>;
  customColors: StudioCustomColors;
  references?: Partial<Record<GenerationReferenceRole, string>>;
  characterOutfitBehavior?: CharacterOutfitBehavior;
  authorityProjection?: ReferenceAuthorityProjection | null;
  lockedFields?: string[];
  editableFields?: ReadonlySet<string>;
  onLockChange?: (fieldName: string, locked: boolean) => void;
  onCustomColorsChange: (colors: StudioCustomColors) => void;
  onChange: (value: Record<string, AttributeSelection>) => void;
}) {
  const visible = useMemo(
    () => visibleStudioGroups(groups, mode, characterType)
      .map(group => ({
        ...group,
        fields: editableFields
          ? group.fields.filter(field => editableFields.has(field.name))
          : group.fields
      }))
      .filter(group => group.fields.length > 0),
    [characterType, editableFields, groups, mode]
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
            {group.fields.map(field => {
              const authority = resolveFieldReferenceAuthority(
                field,
                references,
                characterOutfitBehavior,
                authorityProjection
              );
              return (
                <VisualOptionPicker
                  key={field.name}
                  field={field}
                  value={selections[field.name]}
                  visual={resolveVisualPresentation({
                    field,
                    manifests: manifests || {},
                    gender
                  })}
                  disabled={Boolean(authority)}
                  disabledReason={authority
                    ? `ui.visual.referenceAuthority.${authority}`
                    : undefined}
                  locked={lockedFields.includes(field.name)}
                  customColors={customColors}
                  onLockChange={locked => onLockChange?.(field.name, locked)}
                  onCustomColorsChange={onCustomColorsChange}
                  onChange={selection => {
                    const next = { ...selections };
                    if (selection) next[field.name] = selection;
                    else delete next[field.name];
                    onChange(next);
                  }}
                />
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}
