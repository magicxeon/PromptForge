import { describe, expect, it } from 'vitest';
import type { VideoModelCapability } from '../../generation/schemas/videoGenerationSchemas';
import { canQuoteVideoModel, filterVideoModelsForOperation, migrateVideoProviderModelKey } from './videoModelSelection';

const base = {
  durationControlMode: 'exact' as const,
  durations: [4], resolutions: ['720p'], aspectRatios: ['9:16'], audioModes: ['none'] as ('none' | 'generated')[],
  referenceImageLimit: 0, supportsFirstFrame: false, supportsLastFrame: false,
  qualificationStatus: 'internal_testing', paidRoutingEnabled: false, testingRoutingEnabled: true
};

const models: VideoModelCapability[] = [
  { ...base, providerId: 'modelark', modelId: 'seedance', displayName: 'Seedance', operations: ['text_to_video'] },
  { ...base, providerId: 'gemini', modelId: 'veo', displayName: 'Veo', operations: ['text_to_video', 'image_to_video', 'character_to_video'] },
  {
    ...base,
    providerId: 'gemini',
    modelId: 'gemini-omni-1.1-flash',
    displayName: 'Gemini Omni Flash',
    operations: ['text_to_video', 'image_to_video', 'character_to_video'],
    durations: [],
    resolutions: [],
    qualificationStatus: 'internal_catalog',
    pricingStatus: 'unavailable'
  }
];

describe('filterVideoModelsForOperation', () => {
  it('keeps internal Seedance visible for Prompt only without offering unsupported private-reference modes', () => {
    expect(filterVideoModelsForOperation(models, 'text_to_video').map(model => model.modelId)).toEqual(['seedance', 'veo', 'gemini-omni-1.1-flash']);
    expect(filterVideoModelsForOperation(models, 'image_to_video').map(model => model.modelId)).toEqual(['veo', 'gemini-omni-1.1-flash']);
    expect(filterVideoModelsForOperation(models, 'character_to_video').map(model => model.modelId)).toEqual(['veo', 'gemini-omni-1.1-flash']);
  });

  it('keeps catalog-only models visible without enabling a Credit quote', () => {
    expect(canQuoteVideoModel(models[1])).toBe(true);
    expect(canQuoteVideoModel(models[2])).toBe(false);
  });

  it('migrates the actor draft Preview key without changing current model keys', () => {
    expect(migrateVideoProviderModelKey('gemini:gemini-omni-flash-preview'))
      .toBe('gemini:gemini-omni-1.1-flash');
    expect(migrateVideoProviderModelKey('modelark:seedance')).toBe('modelark:seedance');
  });
});
