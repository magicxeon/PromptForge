import { describe, expect, it } from 'vitest';
import type { ProviderCatalog } from '../../features/generation/schemas/generationSchemas';
import {
  createDefaultComparisonSlots,
  imageModelUnavailableReason,
  resolveAvailableImageEngine
} from './engineTargetPanelHelpers';

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

describe('image model availability', () => {
  it('keeps catalog-visible unreleased models unavailable and preserves reference requirements', () => {
    const base = {
      id: 'model-a',
      displayName: 'Model A',
      capabilities: {
        imageGeneration: true,
        imageEdit: false,
        aspectRatios: ['9:16'],
        resolutions: [],
        imageReferences: false,
        maxReferenceImages: 0,
        streaming: false
      },
      defaults: {}
    };
    expect(imageModelUnavailableReason({
      ...base,
      paidRoutingEnabled: false,
      unavailableReason: 'provider_not_released'
    }, 0, '9:16')).toBe('provider_not_released');
    expect(imageModelUnavailableReason({
      ...base,
      paidRoutingEnabled: true
    }, 1, '9:16')).toBe('references_unsupported');
  });

  it('restores an available preference and falls back when references are unsupported', () => {
    const catalog = engineCatalog();

    expect(resolveAvailableImageEngine(catalog, {
      provider: 'provider-b',
      model: 'model-b'
    }, 0, '9:16')).toMatchObject({
      provider: { id: 'provider-b' },
      model: { id: 'model-b' }
    });
    expect(resolveAvailableImageEngine(catalog, {
      provider: 'provider-b',
      model: 'model-b'
    }, 1, '9:16')).toMatchObject({
      provider: { id: 'provider-a' },
      model: { id: 'model-a' }
    });
  });
});

function engineCatalog(): ProviderCatalog {
  const model = (id: string, imageReferences: boolean) => ({
    id,
    displayName: id,
    capabilities: {
      imageGeneration: true,
      imageEdit: imageReferences,
      aspectRatios: ['9:16'],
      resolutions: ['1K'],
      imageReferences,
      maxReferenceImages: imageReferences ? 4 : 0,
      streaming: false
    },
    defaults: { resolution: '1K' },
    pricingStatus: 'priced' as const,
    qualificationStatus: 'qualified' as const,
    paidRoutingEnabled: true
  });
  return {
    defaultProvider: 'provider-a',
    providers: [{
      id: 'provider-a',
      displayName: 'Provider A',
      defaultModel: 'model-a',
      models: [model('model-a', true)]
    }, {
      id: 'provider-b',
      displayName: 'Provider B',
      defaultModel: 'model-b',
      models: [model('model-b', false)]
    }]
  };
}
