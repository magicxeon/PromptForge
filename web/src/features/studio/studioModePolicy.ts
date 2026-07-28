import {
  createSelection,
  type AttributeGroup,
  type AttributeSelection
} from './attributes/attributeModel';
import type { GenerationReferenceRole } from '../generation/api/generationApi';

export type GuidedStudioMode = 'headshot' | 'character-sheet' | 'scene';
export type CharacterOutputType = 'reusable_model' | 'styled_character';

const groupsByMode: Record<GuidedStudioMode, ReadonlySet<string>> = {
  headshot: new Set(['Character', 'Face', 'Hair', 'Skin', 'Lighting', 'Camera', 'Quality']),
  'character-sheet': new Set(['Character', 'Face', 'Hair', 'Skin', 'Body', 'Clothing', 'Pose', 'Lighting', 'Camera', 'Quality']),
  scene: new Set(['Character', 'Fashion Direction', 'Scene Story', 'Photographic Context', 'Pose', 'Environment', 'Lighting', 'Camera', 'Quality'])
};

export function visibleStudioGroups(
  groups: AttributeGroup[],
  mode: GuidedStudioMode,
  characterType: CharacterOutputType
) {
  return groups.filter(group =>
    groupsByMode[mode].has(group.group)
    && group.group !== 'NSFW'
    && !(mode === 'character-sheet'
      && characterType === 'reusable_model'
      && group.group === 'Clothing')
  );
}

export function filterStudioSelections(
  selections: Record<string, AttributeSelection>,
  mode: GuidedStudioMode,
  characterType: CharacterOutputType
) {
  const allowedGroups = groupsByMode[mode];
  return Object.fromEntries(
    Object.entries(selections).filter(([, selection]) =>
      allowedGroups.has(selection.group)
      && selection.group !== 'NSFW'
      && !(mode === 'character-sheet'
        && characterType === 'reusable_model'
        && selection.group === 'Clothing')
    )
  );
}

export function filterStudioReferences(
  references: Partial<Record<GenerationReferenceRole, string>>,
  mode: Exclude<GuidedStudioMode, 'scene'>,
  characterType: CharacterOutputType
) {
  const allowed = mode === 'headshot'
    ? new Set<GenerationReferenceRole>(['face_reference'])
    : characterType === 'reusable_model'
      ? new Set<GenerationReferenceRole>(['face_reference'])
      : new Set<GenerationReferenceRole>([
        'face_reference',
        'outfit_front',
        'outfit_back'
      ]);
  return Object.fromEntries(
    Object.entries(references).filter(
      ([role, value]) => allowed.has(role as GenerationReferenceRole) && Boolean(value)
    )
  ) as Partial<Record<GenerationReferenceRole, string>>;
}

export function randomizeStudioSelections(
  groups: AttributeGroup[],
  lockedFields: ReadonlySet<string> = new Set(),
  currentSelections: Record<string, AttributeSelection> = {}
) {
  const entries: Array<[string, AttributeSelection]> = [];
  for (const group of groups) {
    for (const field of group.fields) {
      if (lockedFields.has(field.name)) {
        const current = currentSelections[field.name];
        if (current) entries.push([field.name, current]);
        continue;
      }
      const option = field.options[Math.floor(Math.random() * field.options.length)];
      if (option) entries.push([field.name, createSelection(option)]);
    }
  }
  return Object.fromEntries(entries);
}
