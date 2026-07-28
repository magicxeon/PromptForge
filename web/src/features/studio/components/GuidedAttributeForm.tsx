import { useMemo } from 'react';
import { VisualOptionPicker } from '../../../components/visual-options/VisualOptionPicker';
import type {
  AttributeGroup,
  AttributeSelection
} from '../attributes/attributeModel';

const modeGroups = {
  headshot: new Set(['Character', 'Face', 'Hair', 'Skin', 'Lighting', 'Camera', 'Quality']),
  'character-sheet': new Set(['Character', 'Face', 'Hair', 'Skin', 'Body', 'Clothing', 'Pose', 'Lighting', 'Camera', 'Quality']),
  scene: new Set(['Character', 'Fashion Direction', 'Scene Story', 'Photographic Context', 'Pose', 'Environment', 'Lighting', 'Camera', 'Quality'])
};

export function GuidedAttributeForm({
  groups,
  mode,
  characterType,
  selections,
  onChange
}: {
  groups: AttributeGroup[];
  mode: keyof typeof modeGroups;
  characterType: 'reusable_model' | 'styled_character';
  selections: Record<string, AttributeSelection>;
  onChange: (value: Record<string, AttributeSelection>) => void;
}) {
  const visible = useMemo(() => groups.filter(group =>
    modeGroups[mode].has(group.group)
    && group.group !== 'NSFW'
    && !(mode === 'character-sheet' && characterType === 'reusable_model' && group.group === 'Clothing')
  ), [characterType, groups, mode]);
  return (
    <div className="space-y-3">
      {visible.map((group, groupIndex) => (
        <details key={group.group} open={groupIndex === 0} className="border border-[var(--mpf-border)] bg-[var(--mpf-surface)]">
          <summary className="cursor-pointer px-4 py-4 text-base font-semibold">{group.group}<span className="ml-2 text-xs font-normal text-[var(--mpf-text-muted)]">{group.fields.filter(field => selections[field.name]).length}/{group.fields.length}</span></summary>
          <div className="space-y-5 border-t border-[var(--mpf-border)] p-4">
            {group.fields.map(field => <VisualOptionPicker key={field.name} field={field} value={selections[field.name]} onChange={selection => {
              const next = { ...selections };
              if (selection) next[field.name] = selection;
              else delete next[field.name];
              onChange(next);
            }} />)}
          </div>
        </details>
      ))}
    </div>
  );
}
