import type { GenerationReferenceRole } from '../generation/api/generationApi';
import type {
  AttributeField,
  AttributeGroup,
  AttributeSelection
} from './attributes/attributeModel';
import type { ReferenceAuthorityProjection } from '../generation/schemas/generationSchemas';

export type ReferenceAuthority =
  | 'face'
  | 'character'
  | 'outfit'
  | 'style'
  | 'pose'
  | 'template';
export type GenerationReferences = Partial<Record<GenerationReferenceRole, string>>;
export type CharacterOutfitBehavior = 'replaceable' | 'preserve';
export type CharacterReferenceType = 'reusable_model' | 'styled_character' | null | undefined;

export function characterOutfitBehaviorForType(
  characterType: CharacterReferenceType
): CharacterOutfitBehavior {
  return characterType === 'styled_character' ? 'preserve' : 'replaceable';
}

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
  characterOutfitBehavior: CharacterOutfitBehavior = 'preserve',
  projection?: ReferenceAuthorityProjection | null
): ReferenceAuthority | null {
  const projectedGroup = projection?.controlledGroups.find(item =>
    item.group === field.group
  );
  if (projectedGroup) {
    if (projectedGroup.editableFields.includes(field.name)) return null;
    return authorityForRole(projectedGroup.role);
  }
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
  characterOutfitBehavior: CharacterOutfitBehavior = 'preserve',
  projection?: ReferenceAuthorityProjection | null
): Record<string, AttributeSelection> {
  return Object.fromEntries(
    Object.entries(selections).filter(([fieldName, selection]) =>
      !resolveFieldReferenceAuthority({
        name: fieldName,
        group: selection.group,
        category: selection.category
      }, references, characterOutfitBehavior, projection)
    )
  ) as Record<string, AttributeSelection>;
}

export function referenceControlledFieldNames(
  groups: AttributeGroup[],
  references: GenerationReferences,
  characterOutfitBehavior: CharacterOutfitBehavior = 'preserve',
  projection?: ReferenceAuthorityProjection | null
) {
  return new Set(groups.flatMap(group =>
    group.fields
      .filter(field => resolveFieldReferenceAuthority(
        field,
        references,
        characterOutfitBehavior,
        projection
      ))
      .map(field => field.name)
  ));
}

function authorityForRole(role: string): ReferenceAuthority {
  if (role === 'face_reference') return 'face';
  if (role === 'character_reference') return 'character';
  if (role === 'outfit_front' || role === 'outfit_back') return 'outfit';
  if (role === 'style_reference') return 'style';
  if (role === 'pose_reference') return 'pose';
  return 'template';
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
