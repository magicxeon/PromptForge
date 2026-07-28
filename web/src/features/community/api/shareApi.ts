import { z } from 'zod';
import { apiRequest } from '../../../lib/api/apiClient';

const shareDraftSchema = z.object({
  id: z.string(),
  sourceGenerationId: z.string(),
  imageUrl: z.string().default(''),
  thumbnailUrl: z.string().default(''),
  promptVisibility: z.string().default('full'),
  visibility: z.string().default('public'),
  faceReuseEligible: z.boolean().default(false),
  faceReusePolicy: z.enum(['view_only', 'public_reusable']).default('view_only')
}).passthrough();

const publishedPostSchema = z.object({ id: z.string() }).passthrough();

export function createGeneratedShareDraft(jobId: string) {
  return apiRequest('/api/community/share-drafts', {
    method: 'POST',
    body: { sourceGenerationId: jobId },
    schema: shareDraftSchema
  });
}

export function publishGeneratedShare(
  draftId: string,
  input: {
    title: string;
    description: string;
    promptVisibility: string;
    visibility: string;
    faceReusePolicy: 'view_only' | 'public_reusable';
  }
) {
  return apiRequest(`/api/community/share-drafts/${encodeURIComponent(draftId)}/publish`, {
    method: 'POST',
    body: input,
    schema: publishedPostSchema
  });
}
