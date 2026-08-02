import { z } from 'zod';
import { apiRequest } from '../../lib/api/apiClient';

export const templatePoseProxyReadinessSchema = z.object({
  status: z.enum(['not_prepared', 'pending', 'processing', 'review_required', 'active', 'failed', 'superseded']),
  fashionCompatible: z.boolean(),
  templateVersionId: z.string().nullable(),
  poseVariantId: z.string(),
  proxyId: z.string().nullable(),
  qaDecision: z.string(),
  qaReasonCodes: z.array(z.string()),
  operationId: z.string().nullable(),
  correlationId: z.string().nullable(),
  reviewImageUrl: z.string().nullable().optional()
}).passthrough();

const estimateSchema = z.object({
  cacheHit: z.boolean(),
  estimatedCredits: z.number(),
  estimateId: z.string().nullable(),
  expiresAt: z.string().optional(),
  proxy: templatePoseProxyReadinessSchema.optional()
}).passthrough();

export type TemplatePoseProxyReadiness = z.infer<typeof templatePoseProxyReadinessSchema>;
export type TemplatePoseProxyEstimate = z.infer<typeof estimateSchema>;

export function getTemplatePoseProxy(templateId: string) {
  return apiRequest(`/api/templates/${encodeURIComponent(templateId)}/pose-proxy`, {
    schema: templatePoseProxyReadinessSchema
  });
}

export function estimateTemplatePoseProxy(templateId: string, templateVersionId?: string | null) {
  return apiRequest(`/api/templates/${encodeURIComponent(templateId)}/pose-proxy/estimate`, {
    method: 'POST',
    body: { templateVersionId, poseVariantId: 'default' },
    schema: estimateSchema
  });
}

export function prepareTemplatePoseProxy(
  templateId: string,
  templateVersionId: string | null | undefined,
  estimateId: string
) {
  return apiRequest(`/api/templates/${encodeURIComponent(templateId)}/pose-proxy/prepare`, {
    method: 'POST',
    body: {
      templateVersionId,
      poseVariantId: 'default',
      estimateId,
      idempotencyKey: `pose-proxy:${templateVersionId || templateId}:${estimateId}`
    },
    schema: templatePoseProxyReadinessSchema
  });
}

export function reviewTemplatePoseProxy(templateId: string, proxyId: string, decision: 'approve' | 'reject') {
  return apiRequest(`/api/templates/${encodeURIComponent(templateId)}/pose-proxy/${encodeURIComponent(proxyId)}/review`, {
    method: 'POST',
    body: { decision, reasonCodes: [] },
    schema: templatePoseProxyReadinessSchema
  });
}
