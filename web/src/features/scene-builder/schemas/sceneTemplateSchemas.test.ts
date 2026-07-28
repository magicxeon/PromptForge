import { describe, expect, it } from 'vitest';
import { sceneTemplateSnapshotSchema } from './sceneTemplateSchemas';

describe('Scene Template snapshot compatibility', () => {
  it('accepts a guided snapshot with replaceable slots and variables', () => {
    const snapshot = sceneTemplateSnapshotSchema.parse({
      schemaVersion: 1,
      authoringMode: 'guided',
      finalPromptSnapshot: 'A model in a bright studio',
      structuredSelectionsSnapshot: { Environment: { value: 'bright studio' } },
      manualPromptSnapshot: '',
      referenceSlotMapping: {
        character_reference: {
          required: true,
          sharePolicy: 'required_user_replacement'
        }
      },
      replaceableVariables: [{
        id: 'environment',
        label: 'Environment',
        type: 'text',
        required: false
      }],
      generationSettingsSnapshot: {},
      providerModelSnapshot: {}
    });

    expect(snapshot.authoringMode).toBe('guided');
    expect(snapshot.referenceSlotMapping.character_reference?.required).toBe(true);
  });
});
