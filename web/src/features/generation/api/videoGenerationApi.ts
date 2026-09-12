import { apiRequest } from '../../../lib/api/apiClient';
import { recentVideoTasksSchema, videoCapabilityCatalogSchema, videoQuoteSchema, videoTaskSchema } from '../schemas/videoGenerationSchemas';

export type PlaygroundVideoReference = {
  characterName?: string;
  role: 'first_frame' | 'reference_image';
  purpose: 'opening_frame' | 'image_reference' | 'character_look' | 'look_sheet_upload' | 'generated_look' | 'character_reference';
  referenceImageUrl?: string;
  generationId?: string;
  assetId?: string;
  characterProfileId?: string;
  characterLookId?: string;
  characterLookVersionId?: string;
};

export type VideoGenerationInput = {
  providerId: string;
  modelId: string;
  operation: 'text_to_video' | 'image_to_video' | 'character_to_video';
  commercialOperation?: 'playground_video' | 'cinematic_motion_preview' | 'cinematic_draft_clip' | 'cinematic_final_clip';
  inputMode?: 'text_to_video' | 'image_to_video' | 'first_last_frame' | 'multimodal_reference';
  prompt: string;
  aspectRatio: string;
  resolution: string;
  durationSeconds: number;
  audioMode: 'none' | 'generated';
  referenceImageUrl?: string | null;
  references?: PlaygroundVideoReference[];
  referencePlanVersion?: 'playground-reference-v1' | 'playground-trusted-v1';
  characterProfileId?: string | null;
  characterProfileVersionId?: string | null;
  requestFingerprint?: string;
};

export function getVideoCapabilityCatalog() {
  return apiRequest('/api/generation/video/capabilities', {
    schema: videoCapabilityCatalogSchema,
    cache: 'no-store'
  });
}

export function quoteVideoGeneration(input: VideoGenerationInput) {
  return apiRequest('/api/generation/video/quote', {
    method: 'POST',
    body: input,
    schema: videoQuoteSchema
  });
}

export function submitVideoGeneration(input: VideoGenerationInput & { estimateId: string; idempotencyKey: string }) {
  return apiRequest('/api/generation/video/tasks', {
    method: 'POST',
    body: input,
    schema: videoTaskSchema
  });
}

export function getVideoTask(taskId: string) {
  return apiRequest(`/api/generation/video/tasks/${encodeURIComponent(taskId)}`, {
    schema: videoTaskSchema,
    cache: 'no-store'
  });
}

export function listRecentVideoTasks(limit = 6) {
  return apiRequest(`/api/generation/video/tasks?limit=${encodeURIComponent(String(limit))}`, {
    schema: recentVideoTasksSchema,
    cache: 'no-store'
  });
}
