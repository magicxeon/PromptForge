import { describe, expect, it } from 'vitest';
import { createStudioCustomColors } from '../studio/attributes/customColorModel';
import {
  buildSceneTemplateSnapshot,
  buildTemplateReplacements
} from './templateSerializer';

describe('Template serializer', () => {
  it('creates a reusable Scene snapshot and role-specific replacement payload', () => {
    const selection = {
      id: 'environment.cafe',
      value: 'bright cafe',
      label: 'Bright cafe',
      isCustom: false,
      group: 'Environment',
      category: 'environment',
      tags: [],
      gptPositiveWords: []
    };
    const snapshot = buildSceneTemplateSnapshot({
      authoringMode: 'guided',
      finalPrompt: 'A fashion portrait',
      selections: { Environment: selection },
      customColors: createStudioCustomColors(),
      references: { character_reference: '/outputs/job_character.png' }
    });

    expect(snapshot.replaceableVariables.some(item => item.sourceFieldName === 'Environment')).toBe(true);
    expect(snapshot.referenceSlotMapping.character_reference?.value).toBe('/outputs/job_character.png');

    const replacements = buildTemplateReplacements({
      publicInputSchema: {
        inputs: snapshot.replaceableVariables.map(item => ({
          id: item.id,
          type: item.type,
          sourceFieldName: item.sourceFieldName,
          replacementPolicy: item.replacementPolicy
        }))
      },
      selections: { Environment: selection },
      references: { character_reference: '/outputs/job_new_character.png' },
      manualPrompt: ''
    });

    expect(replacements.field_environment).toEqual(selection);
    expect(replacements.character_reference).toBe('/outputs/job_new_character.png');
  });
});
