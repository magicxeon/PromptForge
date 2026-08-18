import { describe, expect, it } from 'vitest';
import type { VideoModelCapability } from '../../generation/schemas/videoGenerationSchemas';
import { filterVideoModelsForOperation } from './videoModelSelection';

const base = {
  durations: [4], resolutions: ['720p'], aspectRatios: ['9:16'], audioModes: ['none'] as ('none' | 'generated')[],
  referenceImageLimit: 0, supportsFirstFrame: false, supportsLastFrame: false,
  qualificationStatus: 'internal_testing', paidRoutingEnabled: false, testingRoutingEnabled: true
};

const models: VideoModelCapability[] = [
  { ...base, providerId: 'modelark', modelId: 'seedance', displayName: 'Seedance', operations: ['text_to_video'] },
  { ...base, providerId: 'gemini', modelId: 'veo', displayName: 'Veo', operations: ['text_to_video', 'image_to_video', 'character_to_video'] }
];

describe('filterVideoModelsForOperation', () => {
  it('keeps internal Seedance visible for Prompt only without offering unsupported private-reference modes', () => {
    expect(filterVideoModelsForOperation(models, 'text_to_video').map(model => model.modelId)).toEqual(['seedance', 'veo']);
    expect(filterVideoModelsForOperation(models, 'image_to_video').map(model => model.modelId)).toEqual(['veo']);
    expect(filterVideoModelsForOperation(models, 'character_to_video').map(model => model.modelId)).toEqual(['veo']);
  });
});
