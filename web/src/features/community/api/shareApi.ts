import { z } from 'zod';
import { apiRequest } from '../../../lib/api/apiClient';
import { templateInputPolicySchema, type TemplateInputOptions } from '../../templates/templateInputPolicyApi';

const shareDraftSchema = z.object({
  id: z.string(),
  sourceGenerationId: z.string(),
  imageUrl: z.string().default(''),
  thumbnailUrl: z.string().default(''),
  promptVisibility: z.string().default('private'),
  visibility: z.string().default('public'),
  faceReuseEligible: z.boolean().default(false),
  templateEligible: z.boolean().default(false),
  templateIneligibleReason: z.string().nullable().optional(),
  allowedPromptVisibilities: z.array(z.enum(['full', 'partial', 'remix_only', 'private'])).optional(),
  allowedTemplatePromptVisibilities: z.array(z.enum(['full', 'remix_only'])).default(['full']),
  templateInputPolicy: templateInputPolicySchema.optional(),
  mandatoryTemplateInputIds: z.array(z.string()).default([]),
  suggestedTemplateInputSchema: z.object({
    schemaVersion: z.number().default(1),
    inputs: z.array(z.record(z.string(), z.unknown())).default([])
  }).nullable().optional(),
  faceReusePolicy: z.enum(['view_only', 'public_reusable']).default('view_only')
}).passthrough();

export function getGenerationShareStatus(jobId: string) {
  return apiRequest(`/api/community/generations/${encodeURIComponent(jobId)}/share-status`, {
    schema: z.object({ shared: z.boolean(), post: z.object({
      id: z.string(), postType: z.enum(['image', 'template']),
      visibility: z.string(), status: z.string()
    }).optional() })
  });
}

// The publish command returns the repository record. Customer-facing creator
// projection is loaded separately from the canonical Community post endpoint.
const publishedPostSchema = z.object({
  id: z.string(),
  postType: z.enum(['image', 'video', 'template', 'comparison', 'collection']),
  templateId: z.string().nullable().optional(),
  templateVersionId: z.string().nullable().optional()
}).passthrough();

const videoShareDraftSchema = z.object({
  id: z.string(),
  videoAssetId: z.string(),
  videoUrl: z.string(),
  posterUrl: z.string().nullable(),
  durationSeconds: z.number().positive().nullable(),
  title: z.string().default(''),
  description: z.string().default(''),
  visibility: z.enum(['public', 'unlisted', 'private']).default('public'),
  promptVisibility: z.enum(['private', 'full']).default('private'),
  characterAttributions: z.array(z.object({
    characterProfileId: z.string(),
    characterProfileVersionId: z.string(),
    displayName: z.string(),
    verificationStatus: z.enum(['verified', 'hidden_private'])
  })).default([]),
  expiresAt: z.string()
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
    templateInputOptions?: TemplateInputOptions;
    publicInputSchema?: { schemaVersion: number; inputs: Record<string, unknown>[] } | null;
  }
) {
  return apiRequest(`/api/community/share-drafts/${encodeURIComponent(draftId)}/publish`, {
    method: 'POST',
    body: input,
    schema: publishedPostSchema
  });
}

export function createVideoShareDraft(assetId: string) {
  return apiRequest('/api/community/video-share-drafts', {
    method: 'POST',
    body: { assetId },
    schema: videoShareDraftSchema
  });
}

export function updateVideoShareDraft(
  draftId: string,
  input: {
    title?: string;
    description?: string;
    visibility?: 'public' | 'unlisted' | 'private';
    promptVisibility?: 'private' | 'full';
  }
) {
  return apiRequest(`/api/community/video-share-drafts/${encodeURIComponent(draftId)}`, {
    method: 'PATCH',
    body: input,
    schema: videoShareDraftSchema
  });
}

export function publishVideoShare(
  draftId: string,
  input: {
    title: string;
    description?: string;
    visibility?: 'public' | 'unlisted' | 'private';
    promptVisibility?: 'private' | 'full';
  }
) {
  return apiRequest(`/api/community/video-share-drafts/${encodeURIComponent(draftId)}/publish`, {
    method: 'POST',
    body: input,
    schema: publishedPostSchema
  });
}
