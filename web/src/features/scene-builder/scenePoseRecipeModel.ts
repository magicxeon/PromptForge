import type { ScenePoseRecipe } from '../generation/schemas/generationSchemas';
import {
  createSelection,
  type AttributeGroup,
  type AttributeSelection
} from '../studio/attributes/attributeModel';

export type ScenePoseControlMode = 'simple' | 'advanced';

type ApplyRecipeInput = {
  recipe: ScenePoseRecipe;
  groups: AttributeGroup[];
  selections: Record<string, AttributeSelection>;
  editableFields?: ReadonlySet<string>;
  blockedGroups?: ReadonlySet<string>;
};

export function normalizeScenePoseRecipes(value: unknown): ScenePoseRecipe[] {
  if (!value || typeof value !== 'object' || !('recipes' in value)) return [];
  const recipes = (value as { recipes?: ScenePoseRecipe[] }).recipes;
  return Array.isArray(recipes) ? recipes.filter(recipe => recipe.enabled) : [];
}

export function discoverableScenePoseRecipes(
  recipes: ScenePoseRecipe[],
  selectedRecipeId?: string | null
) {
  return recipes.filter(recipe => recipe.discoverable || recipe.id === selectedRecipeId);
}

export function applyScenePoseRecipe({
  recipe,
  groups,
  selections,
  editableFields,
  blockedGroups = new Set()
}: ApplyRecipeInput) {
  const fields = new Map(groups.flatMap(group => group.fields.map(field => [field.name, field] as const)));
  const next = { ...selections };
  const missingOptionIds: string[] = [];
  const appliedFields: string[] = [];
  const clearedFields: string[] = [];

  (recipe.clearFields || []).forEach(fieldName => {
    const field = fields.get(fieldName);
    if (!field || blockedGroups.has(field.group)) return;
    if (editableFields && !editableFields.has(fieldName)) return;
    if (next[fieldName]) {
      delete next[fieldName];
      clearedFields.push(fieldName);
    }
  });

  Object.entries(recipe.fieldSelections).forEach(([fieldName, optionId]) => {
    const field = fields.get(fieldName);
    if (!field || blockedGroups.has(field.group)) return;
    if (editableFields && !editableFields.has(fieldName)) return;
    const option = field.options.find(candidate => candidate.id === optionId);
    if (!option) {
      missingOptionIds.push(optionId);
      return;
    }
    next[fieldName] = createSelection(option);
    appliedFields.push(fieldName);
  });

  return { selections: next, appliedFields, clearedFields, missingOptionIds };
}

export function isScenePoseRecipeAdjusted(
  recipe: ScenePoseRecipe,
  selections: Record<string, AttributeSelection>,
  editableFields?: ReadonlySet<string>,
  blockedGroups: ReadonlySet<string> = new Set(),
  groups: AttributeGroup[] = []
) {
  const groupByField = new Map(groups.flatMap(group =>
    group.fields.map(field => [field.name, field.group] as const)
  ));
  const hasClearedFieldAdjustment = (recipe.clearFields || []).some(fieldName => {
    if (editableFields && !editableFields.has(fieldName)) return false;
    const group = groupByField.get(fieldName);
    if (group && blockedGroups.has(group)) return false;
    return Boolean(selections[fieldName]);
  });
  if (hasClearedFieldAdjustment) return true;
  return Object.entries(recipe.fieldSelections).some(([fieldName, optionId]) => {
    if (editableFields && !editableFields.has(fieldName)) return false;
    const group = groupByField.get(fieldName);
    if (group && blockedGroups.has(group)) return false;
    return selections[fieldName]?.id !== optionId;
  });
}

export function localizedSceneRecipeText(
  value: Record<string, unknown>,
  language: string
) {
  const locale = language.toLocaleLowerCase().split('-')[0] || 'en';
  const localized = value[locale];
  if (typeof localized === 'string') return localized;
  if (typeof value.en === 'string') return value.en;
  return Object.values(value).find(item => typeof item === 'string') as string | undefined || '';
}
