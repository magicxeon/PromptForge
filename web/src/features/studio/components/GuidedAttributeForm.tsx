import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { VisualOptionPicker } from '../../../components/visual-options/VisualOptionPicker';
import type {
  AttributeGroup,
  AttributeSelection,
  CustomAttributeInputLimits
} from '../attributes/attributeModel';
import {
  countCustomSelectionCharacters,
  DEFAULT_CUSTOM_ATTRIBUTE_INPUT_LIMITS
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
  includedGroups,
  singleOpen = false,
  showNextActions = false,
  customInputLimits = DEFAULT_CUSTOM_ATTRIBUTE_INPUT_LIMITS,
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
  includedGroups?: ReadonlySet<string>;
  singleOpen?: boolean;
  showNextActions?: boolean;
  customInputLimits?: CustomAttributeInputLimits;
  onLockChange?: (fieldName: string, locked: boolean) => void;
  onCustomColorsChange: (colors: StudioCustomColors) => void;
  onChange: (value: Record<string, AttributeSelection>) => void;
}) {
  const { t } = useTranslation('react-ui');
  const visible = useMemo(
    () => visibleStudioGroups(groups, mode, characterType)
      .filter(group => !includedGroups || includedGroups.has(group.group))
      .map(group => ({
        ...group,
        fields: editableFields
          ? group.fields.filter(field => editableFields.has(field.name))
          : group.fields
      }))
      .filter(group => group.fields.length > 0),
    [characterType, editableFields, groups, includedGroups, mode]
  );
  const [openGroup, setOpenGroup] = useState<string | null>(visible[0]?.group || null);
  const groupRefs = useRef(new Map<string, HTMLDetailsElement>());
  useEffect(() => {
    if (!singleOpen) return;
    if (!openGroup || !visible.some(group => group.group === openGroup)) {
      setOpenGroup(visible[0]?.group || null);
    }
  }, [openGroup, singleOpen, visible]);
  const gender = selections.Gender;
  const customCharacterCount = countCustomSelectionCharacters(selections);
  return (
    <div className="studio-attribute-groups">
      {visible.map((group, groupIndex) => (
        <details
          key={group.group}
          ref={element => {
            if (element) groupRefs.current.set(group.group, element);
            else groupRefs.current.delete(group.group);
          }}
          open={singleOpen ? openGroup === group.group : groupIndex < 2}
          onToggle={event => {
            if (singleOpen && event.currentTarget.open) setOpenGroup(group.group);
          }}
          className="studio-attribute-group"
        >
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
                  customCharacterCount={customCharacterCount}
                  customInputLimits={customInputLimits}
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
            {showNextActions ? (
              <div className="studio-attribute-group__next">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={groupIndex === visible.length - 1}
                  icon={groupIndex < visible.length - 1 ? <ArrowRight aria-hidden="true" /> : undefined}
                  onClick={() => {
                    const nextGroup = visible[groupIndex + 1];
                    if (!nextGroup) return;
                    setOpenGroup(nextGroup.group);
                    window.setTimeout(() => {
                      const target = groupRefs.current.get(nextGroup.group);
                      target?.scrollIntoView({
                        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                        block: 'start'
                      });
                      target?.querySelector('summary')?.focus();
                    }, 0);
                  }}
                >
                  {groupIndex < visible.length - 1
                    ? t('ui.studio.nextSettings')
                    : t('ui.studio.settingsComplete')}
                </Button>
              </div>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}
