import { describe, expect, it } from 'vitest';
import recipeCatalog from '../../../../server/config/scene-pose-recipes.json';
import {
  scenePoseRecipeSchema,
  type ScenePoseRecipe,
  type ScenePoseStyle
} from '../generation/schemas/generationSchemas';
import type { AttributeGroup } from '../studio/attributes/attributeModel';
import {
  applyScenePoseRecipe,
  applyScenePoseStyle,
  discoverableScenePoseRecipes,
  isScenePoseRecipeAdjusted,
  isScenePoseStyleCompatible
} from './scenePoseRecipeModel';

const groups: AttributeGroup[] = [{
  group: 'Pose',
  fields: [{
    name: 'Pose Intent',
    control: 'select',
    group: 'Pose',
    options: [{
      id: 'pose.front',
      category: 'pose',
      subcategory: 'Pose Intent',
      label: 'Front pose',
      group: 'Pose',
      prompt: 'front-facing pose',
      tags: []
    }]
  }, {
    name: 'Pose Style',
    control: 'select',
    group: 'Pose',
    options: [{
      id: 'pose.style.editorial',
      category: 'pose',
      subcategory: 'Pose Style',
      label: 'Editorial',
      group: 'Pose',
      prompt: 'confident editorial body language',
      tags: []
    }]
  }]
}, {
  group: 'Camera',
  fields: [{
    name: 'Framing',
    control: 'select',
    group: 'Camera',
    options: [{
      id: 'camera.full',
      category: 'camera',
      subcategory: 'Framing',
      label: 'Full body',
      group: 'Camera',
      prompt: 'full-body framing',
      tags: []
    }]
  }]
}];

const recipe = {
  id: 'scene-pose.test',
  version: 1,
  purpose: 'ecommerce',
  label: { en: 'Test', th: 'Test' },
  description: { en: 'Test', th: 'Test' },
  bestFor: [],
  discoverable: true,
  fieldSelections: {
    'Pose Intent': 'pose.front',
    Framing: 'camera.full'
  },
  clearFields: [],
  enabled: true
} as ScenePoseRecipe;

const editorialStyle = {
  id: 'pose-style.editorial',
  label: { en: 'Editorial', th: 'Editorial' },
  description: { en: 'Editorial', th: 'Editorial' },
  optionId: 'pose.style.editorial',
  excludedRecipeIds: ['scene-pose.blocked'],
  enabled: true
} as ScenePoseStyle;

describe('Scene Pose recipe model', () => {
  it.each([
    ['scene-pose.street-walk-editorial', 3],
    ['scene-pose.cafe-seated-lifestyle', 2],
    ['scene-pose.sunlit-storefront', 4],
    ['scene-pose.soft-character-portrait', 3]
  ])('reconciles legacy handheld selections for %s with the current catalog', (id, previousVersion) => {
    const current = scenePoseRecipeSchema.parse(recipeCatalog.recipes.find(item => item.id === id));
    expect(current.version).toBeGreaterThan(previousVersion as number);
    const cameraGroups: AttributeGroup[] = [{
      group: 'Camera',
      fields: [{ name: 'Camera Imperfections', group: 'Camera', control: 'select', options: [] }]
    }];
    const selections = {
      'Camera Imperfections': {
        id: 'camera.imp_01', value: 'slight handheld camera movement', label: 'Handheld',
        isCustom: false, group: 'Camera', category: 'camera_imperfections', tags: [], gptPositiveWords: []
      },
      Hair: {
        id: 'hair.long', value: 'long hair', label: 'Long hair', isCustom: false,
        group: 'Hair', category: 'hair', tags: [], gptPositiveWords: []
      }
    };
    const result = applyScenePoseRecipe({ recipe: current, groups: cameraGroups, selections });
    expect(result.selections['Camera Imperfections']).toBeUndefined();
    expect(result.selections.Hair).toEqual(selections.Hair);
    expect(result.clearedFields).toContain('Camera Imperfections');
    expect(selections['Camera Imperfections'].id).toBe('camera.imp_01');

    for (const restrictions of [
      { blockedGroups: new Set(['Camera']) },
      { editableFields: new Set(['Hair']) }
    ]) {
      const locked = applyScenePoseRecipe({ recipe: current, groups: cameraGroups, selections, ...restrictions });
      expect(locked.selections['Camera Imperfections']).toEqual(selections['Camera Imperfections']);
    }
  });

  it('applies canonical catalog options without replacing unrelated selections', () => {
    const result = applyScenePoseRecipe({
      recipe,
      groups,
      selections: {
        Hair: {
          id: 'hair.long', value: 'long hair', label: 'Long hair', isCustom: false,
          group: 'Hair', category: 'hair', tags: [], gptPositiveWords: []
        }
      }
    });

    expect(result.selections.Hair?.id).toBe('hair.long');
    expect(result.selections['Pose Intent']?.id).toBe('pose.front');
    expect(result.selections.Framing?.id).toBe('camera.full');
    expect(result.missingOptionIds).toEqual([]);
  });

  it('respects reference-owned groups and reports later Pro adjustments', () => {
    const result = applyScenePoseRecipe({
      recipe,
      groups,
      selections: {},
      blockedGroups: new Set(['Pose'])
    });

    expect(result.selections['Pose Intent']).toBeUndefined();
    expect(result.selections.Framing?.id).toBe('camera.full');
    expect(isScenePoseRecipeAdjusted(recipe, result.selections, undefined, new Set(['Pose']), groups)).toBe(false);

    const changed = {
      ...result.selections,
      Framing: { ...result.selections.Framing!, id: 'camera.changed' }
    };
    expect(isScenePoseRecipeAdjusted(recipe, changed, undefined, new Set(['Pose']), groups)).toBe(true);
  });

  it('clears stale conflicting fields while preserving unrelated user selections', () => {
    const conflictGroups: AttributeGroup[] = [
      ...groups,
      {
        group: 'Lighting',
        fields: [{
          name: 'Lighting Accent',
          control: 'select',
          group: 'Lighting',
          options: []
        }]
      },
      {
        group: 'Quality',
        fields: [
          { name: 'Film Look', control: 'select', group: 'Quality', options: [] },
          { name: 'Color Grading', control: 'select', group: 'Quality', options: [] }
        ]
      }
    ];
    const portraitRecipe = {
      ...recipe,
      clearFields: ['Lighting Accent', 'Film Look', 'Color Grading']
    } as ScenePoseRecipe;
    const staleSelection = {
      id: 'stale.option', value: 'stale visual direction', label: 'Stale', isCustom: false,
      group: 'Quality', category: 'quality', tags: [], gptPositiveWords: []
    };
    const result = applyScenePoseRecipe({
      recipe: portraitRecipe,
      groups: conflictGroups,
      selections: {
        Hair: {
          id: 'hair.long', value: 'long hair', label: 'Long hair', isCustom: false,
          group: 'Hair', category: 'hair', tags: [], gptPositiveWords: []
        },
        'Lighting Accent': { ...staleSelection, group: 'Lighting', category: 'lighting' },
        'Film Look': staleSelection,
        'Color Grading': staleSelection
      }
    });

    expect(result.selections.Hair?.id).toBe('hair.long');
    expect(result.selections['Lighting Accent']).toBeUndefined();
    expect(result.selections['Film Look']).toBeUndefined();
    expect(result.selections['Color Grading']).toBeUndefined();
    expect(result.clearedFields).toEqual(['Lighting Accent', 'Film Look', 'Color Grading']);
    expect(isScenePoseRecipeAdjusted(
      portraitRecipe,
      { ...result.selections, 'Film Look': staleSelection },
      undefined,
      new Set(),
      conflictGroups
    )).toBe(true);
  });

  it('clears the Color-light accent when Street Walk is selected next', () => {
    const lightingGroups: AttributeGroup[] = [
      ...groups,
      {
        group: 'Lighting',
        fields: [{
          name: 'Lighting Accent',
          control: 'select',
          group: 'Lighting',
          options: []
        }]
      }
    ];
    const streetWalkRecipe = {
      ...recipe,
      id: 'scene-pose.street-walk-editorial',
      clearFields: ['Lighting Accent']
    } as ScenePoseRecipe;
    const result = applyScenePoseRecipe({
      recipe: streetWalkRecipe,
      groups: lightingGroups,
      selections: {
        'Lighting Accent': {
          id: 'lighting.accent.hot-cool-separation',
          value: 'red-blue separation',
          label: 'Red-blue Separation',
          isCustom: false,
          group: 'Lighting',
          category: 'lighting',
          tags: [],
          gptPositiveWords: []
        }
      }
    });

    expect(result.selections['Lighting Accent']).toBeUndefined();
    expect(result.clearedFields).toEqual(['Lighting Accent']);
  });

  it('keeps legacy recipes for a restored selection without showing them in discovery', () => {
    const legacy = { ...recipe, id: 'scene-pose.legacy', discoverable: false };
    const current = { ...recipe, id: 'scene-pose.current', discoverable: true };

    expect(discoverableScenePoseRecipes([legacy, current], null).map(item => item.id))
      .toEqual(['scene-pose.current']);
    expect(discoverableScenePoseRecipes([legacy, current], legacy.id).map(item => item.id))
      .toEqual(['scene-pose.legacy', 'scene-pose.current']);
  });

  it('applies one compatible Pose Style and lets Auto Match clear it', () => {
    const styled = applyScenePoseStyle({
      style: editorialStyle,
      recipeId: recipe.id,
      groups,
      selections: {}
    });
    expect(styled['Pose Style']?.id).toBe('pose.style.editorial');

    const automatic = applyScenePoseStyle({
      style: null,
      recipeId: recipe.id,
      groups,
      selections: styled
    });
    expect(automatic['Pose Style']).toBeUndefined();
  });

  it('rejects a Pose Style that conflicts with the selected recipe', () => {
    expect(isScenePoseStyleCompatible(editorialStyle, 'scene-pose.blocked')).toBe(false);
    const selections = applyScenePoseStyle({
      style: editorialStyle,
      recipeId: 'scene-pose.blocked',
      groups,
      selections: {}
    });
    expect(selections['Pose Style']).toBeUndefined();
  });
});
