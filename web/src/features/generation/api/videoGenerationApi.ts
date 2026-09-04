import { apiRequest } from '../../../lib/api/apiClient';
import { recentVideoTasksSchema, videoCapabilityCatalogSchema, videoQuoteSchema, videoTaskSchema } from '../schemas/videoGenerationSchemas';

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
