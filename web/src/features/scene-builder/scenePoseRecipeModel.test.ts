import { describe, expect, it } from 'vitest';
import type { ScenePoseRecipe } from '../generation/schemas/generationSchemas';
import type { AttributeGroup } from '../studio/attributes/attributeModel';
import { applyScenePoseRecipe, isScenePoseRecipeAdjusted } from './scenePoseRecipeModel';

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
  fieldSelections: {
    'Pose Intent': 'pose.front',
    Framing: 'camera.full'
  },
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
});
