import { beforeEach, describe, expect, it } from 'vitest';
import type { ProviderCatalog } from '../generation/schemas/generationSchemas';
import {
  readComparisonGenerationPreferences,
  writeComparisonGenerationPreferences
} from './comparisonGenerationPreferences';

const catalog = {
  defaultProvider: 'gemini',
  providers: [{
    id: 'gemini',
    displayName: 'Gemini',
    defaultModel: 'gemini-fast',
    models: [{
      id: 'gemini-fast',
      displayName: 'Gemini Fast',
      capabilities: {
        imageGeneration: true,
        imageEdit: true,
        imageReferences: true,
        maxReferenceImages: 6,
        streaming: false,
        aspectRatios: ['1:1']
      }
    }]
  }, {
    id: 'openai',
    displayName: 'OpenAI',
    defaultModel: 'gpt-image',
    models: [{
      id: 'gpt-image',
      displayName: 'GPT Image',
      capabilities: {
        imageGeneration: true,
        imageEdit: true,
        imageReferences: true,
        maxReferenceImages: 6,
        streaming: false,
        aspectRatios: ['1:1']
      }
    }]
  }]
} as ProviderCatalog;

const fallback = [
  { id: 'slot_1', provider: 'gemini', model: 'gemini-fast' },
  { id: 'slot_2', provider: 'openai', model: 'gpt-image' }
];

describe('comparison generation preferences', () => {
  beforeEach(() => localStorage.clear());

  it('restores the last valid slots and isolates them by actor', () => {
    writeComparisonGenerationPreferences('usr_alice', {
      active: true,
      slots: [...fallback].reverse()
    });

    expect(readComparisonGenerationPreferences('usr_alice', catalog, fallback))
      .toEqual({ active: true, slots: [...fallback].reverse() });
    expect(readComparisonGenerationPreferences('usr_bob', catalog, fallback))
      .toEqual({ active: false, slots: fallback });
  });

  it('falls back when stored providers are no longer supported', () => {
    writeComparisonGenerationPreferences('usr_alice', {
      active: true,
      slots: [
        { id: 'old_1', provider: 'removed', model: 'old' },
        { id: 'old_2', provider: 'removed', model: 'old' }
      ]
    });

    expect(readComparisonGenerationPreferences('usr_alice', catalog, fallback))
      .toEqual({ active: true, slots: fallback });
  });

  it('discards a development-only model after current catalog testing access closes', () => {
    const catalogWithBlockedMuse: ProviderCatalog = {
      ...catalog,
      providers: [...catalog.providers, {
        id: 'meta-muse',
        displayName: 'Meta Muse',
        defaultModel: 'muse-image-1.0',
        models: [{
          id: 'muse-image-1.0',
          displayName: 'Muse Image 1.0',
          paidRoutingEnabled: false,
          testingRoutingEnabled: false,
          qualificationStatus: 'internal_testing',
          pricingStatus: 'priced',
          capabilities: {
            imageGeneration: true,
            imageEdit: false,
            imageReferences: false,
            maxReferenceImages: 0,
            streaming: false,
            aspectRatios: ['1:1']
          }
        }]
      }]
    };
    writeComparisonGenerationPreferences('usr_alice', {
      active: true,
      slots: [
        { id: 'muse', provider: 'meta-muse', model: 'muse-image-1.0' },
        fallback[0]!
      ]
    });

    expect(readComparisonGenerationPreferences(
      'usr_alice', catalogWithBlockedMuse, fallback
    )).toEqual({ active: true, slots: fallback });
  });
});
