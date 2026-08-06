import { describe, expect, it } from 'vitest';
import type { ScenePoseRecipe } from '../generation/schemas/generationSchemas';
import type { AttributeGroup } from '../studio/attributes/attributeModel';
import {
  applyScenePoseRecipe,
  discoverableScenePoseRecipes,
  isScenePoseRecipeAdjusted
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

describe('Scene Pose recipe model', () => {
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

  it('keeps legacy recipes for a restored selection without showing them in discovery', () => {
    const legacy = { ...recipe, id: 'scene-pose.legacy', discoverable: false };
    const current = { ...recipe, id: 'scene-pose.current', discoverable: true };

    expect(discoverableScenePoseRecipes([legacy, current], null).map(item => item.id))
      .toEqual(['scene-pose.current']);
    expect(discoverableScenePoseRecipes([legacy, current], legacy.id).map(item => item.id))
      .toEqual(['scene-pose.legacy', 'scene-pose.current']);
  });
});
