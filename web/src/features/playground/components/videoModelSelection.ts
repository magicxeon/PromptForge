import type { VideoModelCapability } from '../../generation/schemas/videoGenerationSchemas';

export type PlaygroundVideoOperation = 'text_to_video' | 'image_to_video' | 'character_to_video';

const VIDEO_MODEL_KEY_ALIASES: Record<string, string> = {
  'gemini:gemini-omni-flash-preview': 'gemini:gemini-omni-1.1-flash'
};

export function migrateVideoProviderModelKey(value: string) {
  return VIDEO_MODEL_KEY_ALIASES[value] || value;
}

export function filterVideoModelsForOperation(
  models: VideoModelCapability[],
  operation: PlaygroundVideoOperation
) {
  const mode = operation === 'character_to_video' ? 'multimodal_reference' : operation;
  return models.filter(model => model.operations.includes(operation) || model.inputModes.includes(mode));
}

export function canQuoteVideoModel(model: VideoModelCapability | null | undefined) {
  return Boolean(model
    && model.pricingStatus !== 'unavailable'
    && model.durations.length
    && model.resolutions.length
    && model.aspectRatios.length
    && model.audioModes.length);
}
