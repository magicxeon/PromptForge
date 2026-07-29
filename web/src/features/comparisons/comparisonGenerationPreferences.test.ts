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
});
