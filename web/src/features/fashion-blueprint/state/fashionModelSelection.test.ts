import { describe, expect, it } from 'vitest';
import type { ProviderCatalog } from '../../generation/schemas/generationSchemas';
import { reconcileFashionEngine } from './fashionModelSelection';

const catalog = {
  defaultProvider: 'gemini',
  providers: [{
    id: 'gemini',
    displayName: 'Gemini',
    defaultModel: 'gemini-3.1-flash-image',
    models: [{
      id: 'gemini-3.1-flash-image',
      displayName: 'Nano Banana 2',
      capabilities: {
        imageGeneration: true,
        imageEdit: true,
        imageReferences: true,
        maxReferenceImages: 6,
        streaming: false,
        aspectRatios: ['6:8'],
        resolutions: ['1K']
      }
    }]
  }]
} satisfies ProviderCatalog;

describe('Fashion model selection', () => {
  it('reconciles a stale Pose Proxy-only model to the Fashion catalog default', () => {
    expect(reconcileFashionEngine(catalog, {
      provider: 'gemini',
      model: 'gemini-3.1-flash-lite-image',
      resolution: '1K',
      aspectRatio: '6:8',
      outputCount: 1
    })).toMatchObject({
      provider: 'gemini',
      model: 'gemini-3.1-flash-image',
      resolution: '1K',
      aspectRatio: '6:8'
    });
  });

  it('retains an eligible Fashion selection', () => {
    const current = {
      provider: 'gemini',
      model: 'gemini-3.1-flash-image',
      resolution: '1K',
      aspectRatio: '6:8',
      outputCount: 1
    };
    expect(reconcileFashionEngine(catalog, current)).toBe(current);
  });
});
