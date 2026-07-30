import { describe, expect, it } from 'vitest';
import { sceneTemplateSnapshotSchema, useTemplateResponseSchema } from './sceneTemplateSchemas';

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

  it('does not coerce a canonical use-session wrapper into an empty direct snapshot', () => {
    const response = useTemplateResponseSchema.parse({
      id: 'template_1',
      currentVersionId: 'template_version_1',
      useSession: { id: 'template_session_1', expiresAt: '2026-08-01T00:00:00.000Z' },
      sceneTemplateSnapshot: {
        sceneTemplateVersion: 1,
        authoringMode: 'guided',
        finalPromptSnapshot: '',
        structuredSelectionsSnapshot: { Environment: { value: 'rooftop' } },
        referenceSlotMapping: {},
        replaceableVariables: []
      }
    });

    expect('sceneTemplateSnapshot' in response).toBe(true);
    const wrappedSnapshot = sceneTemplateSnapshotSchema.parse(
      (response as Record<string, unknown>).sceneTemplateSnapshot
    );
    expect(wrappedSnapshot.structuredSelectionsSnapshot.Environment).toEqual({
        value: 'rooftop'
    });
  });
});
