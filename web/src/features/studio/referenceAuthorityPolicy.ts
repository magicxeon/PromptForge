import type { GenerationReferenceRole } from '../generation/api/generationApi';
import type {
  AttributeField,
  AttributeGroup,
  AttributeSelection
} from './attributes/attributeModel';

export type ReferenceAuthority = 'face' | 'character' | 'outfit';
export type GenerationReferences = Partial<Record<GenerationReferenceRole, string>>;
export type CharacterOutfitBehavior = 'replaceable' | 'preserve';

const CHARACTER_OWNED_GROUPS = new Set([
  'Character',
  'Face',
  'Hair',
  'Skin',
  'Body',
  'Clothing',
  'Accessories'
]);

export function resolveFieldReferenceAuthority(
  field: Pick<AttributeField, 'name' | 'group'> & { category?: string },
  references: GenerationReferences,
  characterOutfitBehavior: CharacterOutfitBehavior = 'preserve'
): ReferenceAuthority | null {
  if (field.group === 'Face' && field.name === 'Expression') return null;

  if (hasOutfitReference(references) && isOutfitField(field)) {
    return 'outfit';
  }
  if (
    references.character_reference
    && CHARACTER_OWNED_GROUPS.has(field.group)
    && (
      characterOutfitBehavior === 'preserve'
      || !isOutfitField(field)
    )
  ) {
    return 'character';
  }
  if (references.face_reference && field.group === 'Face') {
    return 'face';
  }
  return null;
}

export function filterReferenceOwnedSelections(
  selections: Record<string, AttributeSelection>,
  references: GenerationReferences,
  characterOutfitBehavior: CharacterOutfitBehavior = 'preserve'
): Record<string, AttributeSelection> {
  return Object.fromEntries(
    Object.entries(selections).filter(([fieldName, selection]) =>
      !resolveFieldReferenceAuthority({
        name: fieldName,
        group: selection.group,
        category: selection.category
      }, references, characterOutfitBehavior)
    )
  ) as Record<string, AttributeSelection>;
}

export function referenceControlledFieldNames(
  groups: AttributeGroup[],
  references: GenerationReferences,
  characterOutfitBehavior: CharacterOutfitBehavior = 'preserve'
) {
  return new Set(groups.flatMap(group =>
    group.fields
      .filter(field => resolveFieldReferenceAuthority(
        field,
        references,
        characterOutfitBehavior
      ))
      .map(field => field.name)
  ));
}

export function sceneDirectionGroups(groups: AttributeGroup[]): AttributeGroup[] {
  return groups.flatMap(group => {
    if (group.group !== 'Face') return [group];
    const expression = group.fields.filter(field => field.name === 'Expression');
    return expression.length ? [{ ...group, fields: expression }] : [];
  });
}

function hasOutfitReference(references: GenerationReferences) {
  return Boolean(references.outfit_front || references.outfit_back);
}

function isOutfitField(
  field: Pick<AttributeField, 'name' | 'group'> & { category?: string }
) {
  return field.group === 'Clothing'
    || field.group === 'Accessories'
    || field.name === 'Accessories'
    || field.category === 'accessories';
}
