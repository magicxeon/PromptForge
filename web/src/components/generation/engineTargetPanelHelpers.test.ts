import { describe, expect, it } from 'vitest';
import type { ProviderCatalog } from '../../features/generation/schemas/generationSchemas';
import { createDefaultComparisonSlots } from './engineTargetPanelHelpers';

describe('comparison slot defaults', () => {
  it('starts with two base slots when two models are available', () => {
    const catalog = {
      defaultProvider: 'provider-a',
      providers: [{
        id: 'provider-a',
        displayName: 'Provider A',
        defaultModel: 'model-a',
        models: [{
          id: 'model-a',
          displayName: 'Model A',
          capabilities: {
            imageGeneration: true,
            imageEdit: false,
            aspectRatios: ['1:1'],
            resolutions: [],
            imageReferences: false,
            maxReferenceImages: 0,
            streaming: false
          },
          defaults: {}
        }, {
          id: 'model-b',
          displayName: 'Model B',
          capabilities: {
            imageGeneration: true,
            imageEdit: false,
            aspectRatios: ['1:1'],
            resolutions: [],
            imageReferences: false,
            maxReferenceImages: 0,
            streaming: false
          },
          defaults: {}
        }]
      }]
    } satisfies ProviderCatalog;

    const slots = createDefaultComparisonSlots(catalog);

    expect(slots).toHaveLength(2);
    expect(slots[0]).toMatchObject({
      provider: 'provider-a',
      model: 'model-a'
    });
    expect(slots[1]).toMatchObject({
      provider: 'provider-a',
      model: 'model-b'
    });
  });
});
