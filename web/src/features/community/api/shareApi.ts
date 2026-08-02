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
  templateEligible: z.boolean().default(false),
  suggestedTemplateInputSchema: z.object({
    schemaVersion: z.number().default(1),
    inputs: z.array(z.record(z.string(), z.unknown())).default([])
  }).nullable().optional(),
  faceReusePolicy: z.enum(['view_only', 'public_reusable']).default('view_only')
}).passthrough();

// The publish command returns the repository record. Customer-facing creator
// projection is loaded separately from the canonical Community post endpoint.
const publishedPostSchema = z.object({
  id: z.string(),
  postType: z.enum(['image', 'template', 'comparison', 'collection']),
  templateId: z.string().nullable().optional(),
  templateVersionId: z.string().nullable().optional()
}).passthrough();

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
    templateId?: string;
    title: string;
    description: string;
    promptVisibility: string;
    visibility: string;
    faceReusePolicy: 'view_only' | 'public_reusable';
    publishAsTemplate: boolean;
    templateAccessCredits: number;
    publicInputSchema?: { schemaVersion: number; inputs: Record<string, unknown>[] } | null;
  }
) {
  return apiRequest(`/api/community/share-drafts/${encodeURIComponent(draftId)}/publish`, {
    method: 'POST',
    body: input,
    schema: publishedPostSchema
  });
}
