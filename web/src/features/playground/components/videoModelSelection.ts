import type { VideoModelCapability } from '../../generation/schemas/videoGenerationSchemas';

export type PlaygroundVideoOperation = 'text_to_video' | 'image_to_video' | 'character_to_video';

export function filterVideoModelsForOperation(
  models: VideoModelCapability[],
  operation: PlaygroundVideoOperation
) {
  return models.filter(model => model.operations.includes(operation));
}

export function canQuoteVideoModel(model: VideoModelCapability | null | undefined) {
  return Boolean(model
    && model.pricingStatus !== 'unavailable'
    && model.durations.length
    && model.resolutions.length
    && model.aspectRatios.length
    && model.audioModes.length);
}
